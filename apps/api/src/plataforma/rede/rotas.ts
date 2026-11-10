// M02 Rede escolar (UC-R01 a R09): escolas, anos letivos, turmas, professores, estudantes,
// matrículas. Leitura sempre filtrada pelo escopo; escrita pelo responsável pelos cadastros
// (atribuição de professores também pela coordenação da escola).

import { alcancaTurma, pode } from '@central/escopo';
import {
  ETAPAS,
  type AnoLetivo,
  type Escola,
  type Etapa,
  type MatriculaTurma,
  type MatricularPedido,
  type PossivelDuplicado,
  type ProfessorTurma,
  type SituacaoMatricula,
  type TurmaDetalhe,
  type TrajetoriaItem,
  type TransferirPedido,
  type TurmaLista,
  type Turno,
  type Zona,
} from '@central/tipos';
import { Router, type Request } from 'express';
import type pg from 'pg';
import { emTransacao, type Banco } from '../../banco.js';
import { ErroHttp, paramId, rota, texto } from '../../http.js';
import { escopoDe, exigir, filtroEscola, filtroTurma } from '../acesso/escopo.js';
import { usuarioDa } from '../acesso/middleware.js';
import { registrarHistorico } from '../nucleo/historico.js';

const ZONAS: Zona[] = ['urbana', 'rural'];
const TURNOS: Turno[] = ['matutino', 'vespertino', 'noturno', 'integral'];
const SITUACOES: SituacaoMatricula[] = ['ativa', 'transferida', 'abandono', 'concluida'];
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function inteiroOpcional(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ErroHttp(400, 'Número inválido.');
  return n;
}

function lerInep(v: unknown, digitos: number, rotulo: string): string | null {
  const t = texto(v);
  if (!t) return null;
  const limpo = t.replace(/\D/g, '');
  if (limpo.length !== digitos) throw new ErroHttp(400, `${rotulo} deve ter ${digitos} dígitos.`);
  return limpo;
}

function lerData(v: unknown, rotulo: string): string | null {
  const t = texto(v);
  if (!t) return null;
  if (!DATA.test(t) || Number.isNaN(Date.parse(t))) throw new ErroHttp(400, `${rotulo} inválida (use AAAA-MM-DD).`);
  return t;
}

async function anoCorrente(banco: Banco): Promise<number> {
  const { rows } = await banco.query<{ valor: unknown }>(
    "SELECT valor FROM nucleo.config WHERE chave = 'ano_letivo_corrente'",
  );
  return Number(rows[0]?.valor) || new Date().getFullYear();
}

const SELECAO_TURMA = `
  SELECT t.id, t.escola_id AS "escolaId", e.nome AS escola, t.ano_letivo AS "anoLetivo", t.nome,
         t.etapa, t.turno,
         (SELECT count(*)::int FROM rede.matricula m WHERE m.turma_id = t.id AND m.situacao = 'ativa') AS estudantes,
         coalesce((SELECT array_agg(u.nome ORDER BY tp.papel DESC, u.nome)
                     FROM rede.turma_professor tp JOIN acesso.usuario u ON u.id = tp.usuario_id
                    WHERE tp.turma_id = t.id), '{}') AS professores
    FROM rede.turma t JOIN rede.escola e ON e.id = t.escola_id`;

export function rotasRede(deps: { pool: pg.Pool }): Router {
  const rotas = Router();
  const { pool } = deps;

  // --- Escolas (UC-R01) ---

  rotas.get(
    '/escolas',
    rota(async (req, res) => {
      const esc = await escopoDe(pool, usuarioDa(req));
      const ano = inteiroOpcional(req.query.ano) ?? (await anoCorrente(pool));
      const params: unknown[] = [ano];
      const { rows } = await pool.query<Escola>(
        `SELECT e.id, e.inep, e.nome, e.zona, e.ativa,
                (SELECT count(*)::int FROM rede.turma t WHERE t.escola_id = e.id AND t.ano_letivo = $1) AS turmas,
                (SELECT count(*)::int FROM rede.matricula m JOIN rede.turma t ON t.id = m.turma_id
                  WHERE t.escola_id = e.id AND t.ano_letivo = $1 AND m.situacao = 'ativa') AS "matriculasAtivas"
           FROM rede.escola e
          WHERE ${filtroEscola(esc, params)}
          ORDER BY e.ativa DESC, e.nome`,
        params,
      );
      res.json(rows);
    }),
  );

  // Só id e nome, para vincular usuários a escolas: quem gerencia contas (inclusive o admin, que
  // não enxerga a rede) precisa da lista. Nenhum dado de estudante.
  rotas.get(
    '/escolas/opcoes',
    exigir('usuarios.ver'),
    rota(async (_req, res) => {
      const { rows } = await pool.query('SELECT id, nome, ativa FROM rede.escola ORDER BY nome');
      res.json(rows);
    }),
  );

  function lerEscola(corpo: Record<string, unknown>, atual?: Escola) {
    const nome = corpo.nome === undefined && atual ? atual.nome : texto(corpo.nome);
    if (!nome) throw new ErroHttp(400, 'Informe o nome da escola.');
    const inep = corpo.inep === undefined && atual ? atual.inep : lerInep(corpo.inep, 8, 'O código INEP da escola');
    const zona = (corpo.zona ?? atual?.zona ?? 'urbana') as Zona;
    if (!ZONAS.includes(zona)) throw new ErroHttp(400, 'Zona inválida.');
    const ativa = typeof corpo.ativa === 'boolean' ? corpo.ativa : (atual?.ativa ?? true);
    return { nome, inep, zona, ativa };
  }

  async function inepLivre(banco: Banco, inep: string | null, ignorar?: number) {
    if (!inep) return;
    const { rows } = await banco.query<{ nome: string }>(
      'SELECT nome FROM rede.escola WHERE inep = $1 AND id IS DISTINCT FROM $2',
      [inep, ignorar ?? null],
    );
    if (rows[0]) throw new ErroHttp(409, `O INEP ${inep} já é da escola "${rows[0].nome}".`);
  }

  rotas.post(
    '/escolas',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const d = lerEscola(req.body ?? {});
      await inepLivre(pool, d.inep);
      const { rows } = await pool.query<{ id: number }>(
        'INSERT INTO rede.escola (inep, nome, zona, ativa) VALUES ($1, $2, $3, $4) RETURNING id',
        [d.inep, d.nome, d.zona, d.ativa],
      );
      await registrarHistorico(pool, {
        modulo: 'rede', entidade: 'escola', entidadeId: rows[0]!.id, acao: 'criacao', dados: d,
        usuarioId: usuarioDa(req).id,
      });
      res.status(201).json({ id: rows[0]!.id, ...d, turmas: 0, matriculasAtivas: 0 });
    }),
  );

  rotas.patch(
    '/escolas/:id',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const id = paramId(req);
      const { rows } = await pool.query<Escola>('SELECT id, inep, nome, zona, ativa FROM rede.escola WHERE id = $1', [id]);
      if (!rows[0]) throw new ErroHttp(404, 'Escola não encontrada.');
      const d = lerEscola(req.body ?? {}, rows[0]);
      await inepLivre(pool, d.inep, id);
      await pool.query('UPDATE rede.escola SET inep = $2, nome = $3, zona = $4, ativa = $5 WHERE id = $1', [
        id, d.inep, d.nome, d.zona, d.ativa,
      ]);
      await registrarHistorico(pool, {
        modulo: 'rede', entidade: 'escola', entidadeId: id, acao: 'edicao',
        dados: { antes: rows[0], depois: d }, usuarioId: usuarioDa(req).id,
      });
      res.json({ id, ...d });
    }),
  );

  // --- Anos letivos (UC-R02) ---

  rotas.get(
    '/anos-letivos',
    rota(async (_req, res) => {
      const { rows } = await pool.query<AnoLetivo>(
        `SELECT ano, to_char(inicio, 'YYYY-MM-DD') AS inicio, to_char(fim, 'YYYY-MM-DD') AS fim
           FROM rede.ano_letivo ORDER BY ano DESC`,
      );
      res.json({ anos: rows, corrente: await anoCorrente(pool) });
    }),
  );

  rotas.post(
    '/anos-letivos',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const ano = inteiroOpcional(req.body?.ano);
      const inicio = lerData(req.body?.inicio, 'Data de início');
      const fim = lerData(req.body?.fim, 'Data de fim');
      if (!ano || ano < 2020 || ano > 2100) throw new ErroHttp(400, 'Ano inválido.');
      if (!inicio || !fim || fim <= inicio) throw new ErroHttp(400, 'Informe início e fim, com o fim depois do início.');
      const r = await pool.query(
        'INSERT INTO rede.ano_letivo (ano, inicio, fim) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [ano, inicio, fim],
      );
      if (!r.rowCount) throw new ErroHttp(409, `O ano letivo ${ano} já existe.`);
      res.status(201).json({ ano, inicio, fim });
    }),
  );

  // --- Turmas (UC-R03, R09) ---

  rotas.get(
    '/turmas',
    rota(async (req, res) => {
      const esc = await escopoDe(pool, usuarioDa(req));
      const params: unknown[] = [inteiroOpcional(req.query.ano) ?? (await anoCorrente(pool))];
      let onde = `t.ano_letivo = $1 AND ${filtroTurma(esc, params)}`;
      const escola = inteiroOpcional(req.query.escola);
      if (escola) {
        params.push(escola);
        onde += ` AND t.escola_id = $${params.length}`;
      }
      const { rows } = await pool.query<TurmaLista>(
        `${SELECAO_TURMA} WHERE ${onde} ORDER BY e.nome, t.etapa, t.nome`,
        params,
      );
      res.json(rows);
    }),
  );

  function lerTurma(corpo: Record<string, unknown>, atual?: TurmaLista) {
    const nome = corpo.nome === undefined && atual ? atual.nome : texto(corpo.nome);
    if (!nome) throw new ErroHttp(400, 'Informe o nome da turma (ex.: 2º ano A).');
    const etapa = (corpo.etapa ?? atual?.etapa) as Etapa;
    if (!ETAPAS.includes(etapa)) throw new ErroHttp(400, 'Etapa inválida.');
    const turno = (corpo.turno === undefined ? (atual?.turno ?? null) : corpo.turno || null) as Turno | null;
    if (turno !== null && !TURNOS.includes(turno)) throw new ErroHttp(400, 'Turno inválido.');
    return { nome, etapa, turno };
  }

  rotas.post(
    '/turmas',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const corpo = req.body ?? {};
      const escolaId = inteiroOpcional(corpo.escolaId);
      const anoLetivo = inteiroOpcional(corpo.anoLetivo) ?? (await anoCorrente(pool));
      if (!escolaId) throw new ErroHttp(400, 'Informe a escola.');
      const d = lerTurma(corpo);
      const ok = await pool.query(
        `SELECT (SELECT 1 FROM rede.escola WHERE id = $1) AS escola, (SELECT 1 FROM rede.ano_letivo WHERE ano = $2) AS ano`,
        [escolaId, anoLetivo],
      );
      if (!ok.rows[0].escola) throw new ErroHttp(400, 'Escola não encontrada.');
      if (!ok.rows[0].ano) throw new ErroHttp(400, `O ano letivo ${anoLetivo} ainda não foi aberto.`);
      try {
        const { rows } = await pool.query<{ id: number }>(
          `INSERT INTO rede.turma (escola_id, ano_letivo, nome, etapa, turno) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [escolaId, anoLetivo, d.nome, d.etapa, d.turno],
        );
        await registrarHistorico(pool, {
          modulo: 'rede', entidade: 'turma', entidadeId: rows[0]!.id, acao: 'criacao',
          dados: { escolaId, anoLetivo, ...d }, usuarioId: usuarioDa(req).id,
        });
        const t = await pool.query<TurmaLista>(`${SELECAO_TURMA} WHERE t.id = $1`, [rows[0]!.id]);
        res.status(201).json(t.rows[0]);
      } catch (e) {
        if ((e as { code?: string }).code === '23505') {
          throw new ErroHttp(409, `Já existe a turma "${d.nome}" nesta escola em ${anoLetivo}.`);
        }
        throw e;
      }
    }),
  );

  async function turmaNoEscopo(req: Request, id: number) {
    const eu = usuarioDa(req);
    const esc = await escopoDe(pool, eu);
    const { rows } = await pool.query<TurmaLista>(`${SELECAO_TURMA} WHERE t.id = $1`, [id]);
    const turma = rows[0];
    // Fora do escopo responde 404, sem revelar que a turma existe.
    if (!turma || !alcancaTurma(esc, turma.id, turma.escolaId)) throw new ErroHttp(404, 'Turma não encontrada.');
    return { eu, esc, turma };
  }

  rotas.patch(
    '/turmas/:id',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const { eu, turma } = await turmaNoEscopo(req, paramId(req));
      const d = lerTurma(req.body ?? {}, turma);
      try {
        await pool.query('UPDATE rede.turma SET nome = $2, etapa = $3, turno = $4 WHERE id = $1', [
          turma.id, d.nome, d.etapa, d.turno,
        ]);
      } catch (e) {
        if ((e as { code?: string }).code === '23505') throw new ErroHttp(409, `Já existe a turma "${d.nome}" nesta escola.`);
        throw e;
      }
      await registrarHistorico(pool, {
        modulo: 'rede', entidade: 'turma', entidadeId: turma.id, acao: 'edicao',
        dados: { antes: { nome: turma.nome, etapa: turma.etapa, turno: turma.turno }, depois: d }, usuarioId: eu.id,
      });
      const t = await pool.query<TurmaLista>(`${SELECAO_TURMA} WHERE t.id = $1`, [turma.id]);
      res.json(t.rows[0]);
    }),
  );

  rotas.get(
    '/turmas/:id',
    rota(async (req, res) => {
      const { eu, esc, turma } = await turmaNoEscopo(req, paramId(req));
      const profs = await pool.query<ProfessorTurma>(
        `SELECT tp.usuario_id AS "usuarioId", u.nome, tp.papel
           FROM rede.turma_professor tp JOIN acesso.usuario u ON u.id = tp.usuario_id
          WHERE tp.turma_id = $1 ORDER BY tp.papel DESC, u.nome`,
        [turma.id],
      );
      let matriculas: MatriculaTurma[] | null = null;
      if (esc.nominal) {
        const m = await pool.query<MatriculaTurma>(
          `SELECT m.id, s.id AS "estudanteId", s.nome, to_char(s.data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
                  s.codigo_inep AS "codigoInep", m.situacao
             FROM rede.matricula m JOIN rede.estudante s ON s.id = m.estudante_id
            WHERE m.turma_id = $1
            ORDER BY (m.situacao = 'ativa') DESC, s.nome`,
          [turma.id],
        );
        matriculas = m.rows;
        // LGPD: quem não é professor desta turma deixa registro de que abriu os nomes.
        const ehProfessor = profs.rows.some((p) => p.usuarioId === eu.id);
        if (!ehProfessor && matriculas.length > 0) {
          await pool.query(
            `INSERT INTO nucleo.acesso_nominal (usuario_id, estudante_id, contexto)
             SELECT $1, unnest($2::int[]), 'rede.turma'`,
            [eu.id, matriculas.map((x) => x.estudanteId)],
          );
        }
      }
      const detalhe: TurmaDetalhe = {
        ...turma,
        professoresTurma: profs.rows,
        matriculas,
        pode: {
          editar: pode(eu.perfil, 'rede.gerir'),
          atribuirProfessores: pode(eu.perfil, 'turma.professores'),
          matricular: pode(eu.perfil, 'rede.gerir'),
        },
      };
      res.json(detalhe);
    }),
  );

  // --- Professores da turma (UC-R04) ---

  rotas.get(
    '/professores',
    exigir('turma.professores'),
    rota(async (_req, res) => {
      const { rows } = await pool.query(
        `SELECT id, nome, login FROM acesso.usuario WHERE perfil = 'professor' AND ativo ORDER BY nome`,
      );
      res.json(rows);
    }),
  );

  rotas.put(
    '/turmas/:id/professores',
    exigir('turma.professores'),
    rota(async (req, res) => {
      const { eu, turma } = await turmaNoEscopo(req, paramId(req));
      const lista = req.body?.professores;
      if (!Array.isArray(lista)) throw new ErroHttp(400, 'Envie a lista de professores.');
      const professores = lista.map((p: { usuarioId?: unknown; papel?: unknown }) => {
        const usuarioId = inteiroOpcional(p?.usuarioId);
        const papel = p?.papel === 'apoio' ? 'apoio' : 'regente';
        if (!usuarioId) throw new ErroHttp(400, 'Professor inválido.');
        return { usuarioId, papel };
      });
      const ids = [...new Set(professores.map((p) => p.usuarioId))];
      if (ids.length !== professores.length) throw new ErroHttp(400, 'Professor repetido na lista.');
      await emTransacao(pool, async (c) => {
        const { rows } = await c.query<{ id: number }>(
          `SELECT id FROM acesso.usuario WHERE id = ANY($1::int[]) AND perfil = 'professor' AND ativo`,
          [ids],
        );
        if (rows.length !== ids.length) throw new ErroHttp(400, 'Só usuários ativos com perfil de professor.');
        await c.query('DELETE FROM rede.turma_professor WHERE turma_id = $1', [turma.id]);
        for (const p of professores) {
          await c.query('INSERT INTO rede.turma_professor (turma_id, usuario_id, papel) VALUES ($1, $2, $3)', [
            turma.id, p.usuarioId, p.papel,
          ]);
        }
        await registrarHistorico(c, {
          modulo: 'rede', entidade: 'turma', entidadeId: turma.id, acao: 'professores',
          dados: { professores }, usuarioId: eu.id,
        });
      });
      res.json({ ok: true });
    }),
  );

  // --- Estudantes e matrículas (UC-R05, R07, R08) ---

  rotas.post(
    '/turmas/:id/matriculas',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const { eu, turma } = await turmaNoEscopo(req, paramId(req));
      const corpo = (req.body ?? {}) as MatricularPedido;

      const resultado = await emTransacao(pool, async (c) => {
        let estudanteId = inteiroOpcional(corpo.estudanteId);
        if (!estudanteId) {
          const nome = texto(corpo.nome);
          if (!nome) throw new ErroHttp(400, 'Informe o nome do estudante.');
          const dataNascimento = lerData(corpo.dataNascimento, 'Data de nascimento');
          const codigoInep = lerInep(corpo.codigoInep, 12, 'O ID INEP do estudante');
          if (codigoInep) {
            const ja = await c.query<{ id: number }>('SELECT id FROM rede.estudante WHERE codigo_inep = $1', [codigoInep]);
            estudanteId = ja.rows[0]?.id ?? null;
          }
          if (!estudanteId && !corpo.confirmarNovo) {
            // UC-R08: mesmo nome e nascimento já cadastrados → pode ser a mesma criança.
            const parecidos = await c.query<PossivelDuplicado>(
              `SELECT s.id AS "estudanteId", s.nome, to_char(s.data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
                      (SELECT t.nome || ' · ' || e.nome FROM rede.matricula m JOIN rede.turma t ON t.id = m.turma_id
                         JOIN rede.escola e ON e.id = t.escola_id
                        WHERE m.estudante_id = s.id AND m.situacao = 'ativa' LIMIT 1) AS "turmaAtual"
                 FROM rede.estudante s
                WHERE rede.sem_acento(s.nome) = rede.sem_acento($1)
                  AND s.data_nascimento IS NOT DISTINCT FROM $2::date`,
              [nome, dataNascimento],
            );
            if (parecidos.rows.length > 0) {
              throw new ErroHttp(409, 'Já existe estudante com este nome e nascimento. Confira se é a mesma criança.', {
                codigo: 'possivel_duplicado',
                duplicados: parecidos.rows,
              });
            }
          }
          if (!estudanteId) {
            const novo = await c.query<{ id: number }>(
              'INSERT INTO rede.estudante (nome, data_nascimento, codigo_inep) VALUES ($1, $2, $3) RETURNING id',
              [nome, dataNascimento, codigoInep],
            );
            estudanteId = novo.rows[0]!.id;
          }
        }

        const ativa = await c.query<{ turma: string; turma_id: number }>(
          `SELECT t.nome || ' · ' || e.nome AS turma, t.id AS turma_id
             FROM rede.matricula m JOIN rede.turma t ON t.id = m.turma_id JOIN rede.escola e ON e.id = t.escola_id
            WHERE m.estudante_id = $1 AND m.situacao = 'ativa' AND t.ano_letivo = $2`,
          [estudanteId, turma.anoLetivo],
        );
        if (ativa.rows[0]) {
          throw new ErroHttp(
            409,
            ativa.rows[0].turma_id === turma.id
              ? 'O estudante já está matriculado nesta turma.'
              : `O estudante já tem matrícula ativa em ${ativa.rows[0].turma}. Registre a transferência antes.`,
          );
        }
        const m = await c.query<{ id: number }>(
          `INSERT INTO rede.matricula (estudante_id, turma_id) VALUES ($1, $2)
           ON CONFLICT (estudante_id, turma_id) DO UPDATE SET situacao = 'ativa' RETURNING id`,
          [estudanteId, turma.id],
        );
        await registrarHistorico(c, {
          modulo: 'rede', entidade: 'matricula', entidadeId: m.rows[0]!.id, acao: 'matricula',
          dados: { estudanteId, turmaId: turma.id }, usuarioId: eu.id,
        });
        return { matriculaId: m.rows[0]!.id, estudanteId };
      });
      res.status(201).json(resultado);
    }),
  );

  rotas.patch(
    '/matriculas/:id',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const id = paramId(req);
      const situacao = req.body?.situacao as SituacaoMatricula;
      if (!SITUACOES.includes(situacao)) throw new ErroHttp(400, 'Situação inválida.');
      const { rows } = await pool.query<{ situacao: string }>('SELECT situacao FROM rede.matricula WHERE id = $1', [id]);
      if (!rows[0]) throw new ErroHttp(404, 'Matrícula não encontrada.');
      await pool.query('UPDATE rede.matricula SET situacao = $2 WHERE id = $1', [id, situacao]);
      await registrarHistorico(pool, {
        modulo: 'rede', entidade: 'matricula', entidadeId: id, acao: 'situacao',
        dados: { antes: rows[0].situacao, depois: situacao }, motivo: texto(req.body?.motivo),
        usuarioId: usuarioDa(req).id,
      });
      res.json({ id, situacao });
    }),
  );

  // UC-R07: transferência dentro da rede. A matrícula de origem fica como "transferida" (não
  // some) e nasce a matrícula na turma de destino, no mesmo ano letivo. Saída para fora da rede
  // continua sendo a mudança de situação acima.
  rotas.post(
    '/matriculas/:id/transferir',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const id = paramId(req);
      const corpo = (req.body ?? {}) as Partial<TransferirPedido>;
      const destino = inteiroOpcional(corpo.turmaId);
      if (!destino) throw new ErroHttp(400, 'Escolha a turma de destino.');
      const motivo = texto(corpo.motivo);

      const resultado = await emTransacao(pool, async (c) => {
        const { rows } = await c.query<{ situacao: string; estudante_id: number; turma_id: number; ano: number }>(
          `SELECT m.situacao, m.estudante_id, m.turma_id, t.ano_letivo AS ano
             FROM rede.matricula m JOIN rede.turma t ON t.id = m.turma_id WHERE m.id = $1 FOR UPDATE OF m`,
          [id],
        );
        const origem = rows[0];
        if (!origem) throw new ErroHttp(404, 'Matrícula não encontrada.');
        if (origem.situacao !== 'ativa') throw new ErroHttp(409, 'Só uma matrícula ativa pode ser transferida.');
        if (origem.turma_id === destino) throw new ErroHttp(400, 'O estudante já está nesta turma.');
        const t = await c.query<{ ano: number }>('SELECT ano_letivo AS ano FROM rede.turma WHERE id = $1', [destino]);
        if (!t.rows[0]) throw new ErroHttp(400, 'Turma de destino não encontrada.');
        if (t.rows[0].ano !== origem.ano) {
          throw new ErroHttp(400, 'A turma de destino é de outro ano letivo. Transferência é dentro do mesmo ano.');
        }

        await c.query("UPDATE rede.matricula SET situacao = 'transferida' WHERE id = $1", [id]);
        // Se o estudante já passou por esta turma, a matrícula antiga volta a valer.
        const nova = await c.query<{ id: number }>(
          `INSERT INTO rede.matricula (estudante_id, turma_id) VALUES ($1, $2)
           ON CONFLICT (estudante_id, turma_id) DO UPDATE SET situacao = 'ativa'
           RETURNING id`,
          [origem.estudante_id, destino],
        );
        const novaId = nova.rows[0]!.id;
        const dados = { de: id, para: novaId, turmaOrigem: origem.turma_id, turmaDestino: destino };
        await registrarHistorico(c, {
          modulo: 'rede', entidade: 'matricula', entidadeId: id, acao: 'transferencia_saida', motivo, dados, usuarioId: eu.id,
        });
        await registrarHistorico(c, {
          modulo: 'rede', entidade: 'matricula', entidadeId: novaId, acao: 'transferencia_entrada', motivo, dados, usuarioId: eu.id,
        });
        return { matriculaId: novaId, turmaId: destino };
      });
      res.status(201).json(resultado);
    }),
  );

  // Trajetória do estudante na rede: todas as matrículas, de todos os anos (UC-R07).
  // Mostra nome de escola e turma, sem dado pedagógico; vale para quem pode cadastrar.
  rotas.get(
    '/estudantes/:id/trajetoria',
    exigir('rede.gerir'),
    rota(async (req, res) => {
      const id = paramId(req);
      const { rows } = await pool.query<TrajetoriaItem>(
        `SELECT m.id AS "matriculaId", t.ano_letivo AS "anoLetivo", e.nome AS escola, t.nome AS turma,
                t.etapa, m.situacao
           FROM rede.matricula m JOIN rede.turma t ON t.id = m.turma_id JOIN rede.escola e ON e.id = t.escola_id
          WHERE m.estudante_id = $1
          ORDER BY t.ano_letivo DESC, m.id DESC`,
        [id],
      );
      if (rows.length === 0) throw new ErroHttp(404, 'Estudante não encontrado.');
      res.json(rows);
    }),
  );

  return rotas;
}
