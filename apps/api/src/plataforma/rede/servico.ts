// Serviço da rede escolar para quem está fora dela: a importação (M09) confere e publica
// matrículas por aqui, nunca escrevendo nas tabelas da rede por conta própria
// (docs/modulos.md, seção 3).

import { ROTULO_ETAPA, type LinhaImportacao } from '@central/tipos';
import type pg from 'pg';
import { registrarHistorico } from '../nucleo/historico.js';

type Dados = LinhaImportacao['dados'];
/** Pool ou conexão de uma transação: as duas servem. */
type Conexao = pg.Pool | pg.ClientBase;

async function acharEscola(c: Conexao, d: Dados): Promise<{ id: number; nome: string } | null> {
  if (d.escolaInep) {
    const r = await c.query('SELECT id, nome FROM rede.escola WHERE inep = $1', [d.escolaInep]);
    return r.rows[0] ?? null;
  }
  const r = await c.query('SELECT id, nome FROM rede.escola WHERE rede.sem_acento(nome) = rede.sem_acento($1)', [d.escola]);
  return r.rows.length === 1 ? r.rows[0] : null;
}

async function acharTurma(c: Conexao, escolaId: number, ano: number, nome: string) {
  const r = await c.query<{ id: number; etapa: string; nome: string }>(
    'SELECT id, etapa, nome FROM rede.turma WHERE escola_id = $1 AND ano_letivo = $2 AND rede.sem_acento(nome) = rede.sem_acento($3)',
    [escolaId, ano, nome],
  );
  return r.rows[0] ?? null;
}

async function acharEstudante(c: Conexao, d: Dados): Promise<number | null> {
  if (d.inepEstudante) {
    const r = await c.query<{ id: number }>('SELECT id FROM rede.estudante WHERE codigo_inep = $1', [d.inepEstudante]);
    if (r.rows[0]) return r.rows[0].id;
  }
  // Na importação, mesmo nome (sem acento) e mesmo nascimento = mesma criança. É o que torna a
  // reimportação do mesmo arquivo segura (não duplica).
  const r = await c.query<{ id: number }>(
    `SELECT id FROM rede.estudante
      WHERE rede.sem_acento(nome) = rede.sem_acento($1) AND data_nascimento IS NOT DISTINCT FROM $2::date`,
    [d.estudante, d.dataNascimento ?? null],
  );
  return r.rows.length === 1 ? r.rows[0]!.id : null;
}

/** Confere uma linha já válida sozinha contra o banco: o que a publicação faria com ela. */
export async function conferirMatricula(
  c: Conexao,
  d: Dados,
  ano: number,
): Promise<{ situacao: 'nova' | 'ja_existe' | 'problema'; problemas: string[] }> {
  const escola = await acharEscola(c, d);
  if (!escola) {
    return {
      situacao: 'problema',
      problemas: [
        d.escolaInep
          ? `Escola com INEP ${d.escolaInep} não cadastrada. Cadastre a escola antes de importar.`
          : `Escola "${d.escola}" não encontrada (ou nome igual em mais de uma). Use o INEP.`,
      ],
    };
  }
  const turma = await acharTurma(c, escola.id, ano, d.turma!);
  if (turma && turma.etapa !== d.etapa) {
    return {
      situacao: 'problema',
      problemas: [`A turma "${turma.nome}" já existe como ${ROTULO_ETAPA[turma.etapa as keyof typeof ROTULO_ETAPA]}.`],
    };
  }
  const estudante = await acharEstudante(c, d);
  if (estudante) {
    const ativa = await c.query<{ turma_id: number; turma: string }>(
      `SELECT t.id AS turma_id, t.nome || ' · ' || e.nome AS turma
         FROM rede.matricula m JOIN rede.turma t ON t.id = m.turma_id JOIN rede.escola e ON e.id = t.escola_id
        WHERE m.estudante_id = $1 AND m.situacao = 'ativa' AND t.ano_letivo = $2`,
      [estudante, ano],
    );
    if (ativa.rows[0]) {
      if (turma && ativa.rows[0].turma_id === turma.id) return { situacao: 'ja_existe', problemas: [] };
      return {
        situacao: 'problema',
        problemas: [`Já matriculado em ${ativa.rows[0].turma}. Registre a transferência antes.`],
      };
    }
  }
  return { situacao: 'nova', problemas: [] };
}

export interface ResultadoImportacao {
  matricula: 'criada' | 'ja_existia';
  turmaCriada: boolean;
  estudanteCriado: boolean;
}

/** Publica uma linha (dentro da transação de quem chama). Idempotente. */
export async function importarMatricula(
  c: Conexao,
  d: Dados,
  ano: number,
  usuarioId: number,
): Promise<ResultadoImportacao> {
  const escola = await acharEscola(c, d);
  if (!escola) throw new Error(`Escola sumiu durante a publicação (linha com ${d.escolaInep ?? d.escola}).`);

  let turmaCriada = false;
  let turma = await acharTurma(c, escola.id, ano, d.turma!);
  if (!turma) {
    const r = await c.query<{ id: number; etapa: string; nome: string }>(
      'INSERT INTO rede.turma (escola_id, ano_letivo, nome, etapa, turno) VALUES ($1, $2, $3, $4, $5) RETURNING id, etapa, nome',
      [escola.id, ano, d.turma, d.etapa, d.turno ?? null],
    );
    turma = r.rows[0]!;
    turmaCriada = true;
    await registrarHistorico(c, {
      modulo: 'rede', entidade: 'turma', entidadeId: turma.id, acao: 'criacao',
      dados: { origem: 'importacao' }, usuarioId,
    });
  }

  let estudanteCriado = false;
  let estudante = await acharEstudante(c, d);
  if (!estudante) {
    const r = await c.query<{ id: number }>(
      'INSERT INTO rede.estudante (nome, data_nascimento, codigo_inep) VALUES ($1, $2, $3) RETURNING id',
      [d.estudante, d.dataNascimento ?? null, d.inepEstudante ?? null],
    );
    estudante = r.rows[0]!.id;
    estudanteCriado = true;
  }

  const m = await c.query<{ id: number; nova: boolean }>(
    `INSERT INTO rede.matricula (estudante_id, turma_id) VALUES ($1, $2)
     ON CONFLICT (estudante_id, turma_id) DO UPDATE SET situacao = 'ativa'
     RETURNING id, (xmax = 0) AS nova`,
    [estudante, turma.id],
  );
  if (m.rows[0]!.nova) {
    await registrarHistorico(c, {
      modulo: 'rede', entidade: 'matricula', entidadeId: m.rows[0]!.id, acao: 'matricula',
      dados: { origem: 'importacao', estudanteId: estudante, turmaId: turma.id }, usuarioId,
    });
  }
  return { matricula: m.rows[0]!.nova ? 'criada' : 'ja_existia', turmaCriada, estudanteCriado };
}
