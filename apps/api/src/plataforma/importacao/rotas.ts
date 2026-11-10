// M09 Importação de matrículas (UC-M01 a M04): arquivo → prévia → inconsistências → publicação.
// A conferência e a publicação de cada linha são do serviço da rede (plataforma/rede/servico.ts).

import { analisarMatriculas, lerCsv } from '@central/importacao';
import type { LinhaImportacao, LoteImportacao, NovaImportacaoPedido } from '@central/tipos';
import express, { Router } from 'express';
import { createHash } from 'node:crypto';
import type pg from 'pg';
import { emTransacao, type Banco } from '../../banco.js';
import { ErroHttp, paramId, rota, texto } from '../../http.js';
import { exigir } from '../acesso/escopo.js';
import { usuarioDa } from '../acesso/middleware.js';
import { registrarHistorico } from '../nucleo/historico.js';
import {
  conferirMatricula,
  desfazerMatricula,
  ErroDesfazer,
  importarMatricula,
  type ResultadoImportacao,
} from '../rede/servico.js';

const MAX_LINHAS = 5000;

const SELECAO_LOTE = `
  SELECT l.id, l.tipo, l.arquivo_nome AS "arquivoNome", l.ano_letivo AS "anoLetivo", l.situacao, l.resumo,
         u.nome AS "criadoPor", l.criado_em AS "criadoEm", l.publicado_em AS "publicadoEm",
         l.desfeito_em AS "desfeitoEm", l.desfeito_motivo AS "desfeitoMotivo",
         (l.situacao = 'publicado' AND NOT EXISTS (
            SELECT 1 FROM importacao.lote p WHERE p.situacao = 'publicado' AND p.publicado_em > l.publicado_em
         )) AS "podeDesfazer",
         count(x.numero)::int AS total,
         count(x.numero) FILTER (WHERE NOT x.ignorar AND x.situacao = 'nova')::int AS novas,
         count(x.numero) FILTER (WHERE NOT x.ignorar AND x.situacao = 'ja_existe')::int AS "jaExistentes",
         count(x.numero) FILTER (WHERE NOT x.ignorar AND x.situacao = 'problema')::int AS "comProblema",
         count(x.numero) FILTER (WHERE x.ignorar)::int AS ignoradas,
         (SELECT max(o.publicado_em) FROM importacao.lote o
           WHERE o.arquivo_hash = l.arquivo_hash AND o.id <> l.id AND o.situacao = 'publicado') AS "mesmoArquivoPublicadoEm"
    FROM importacao.lote l
    JOIN acesso.usuario u ON u.id = l.criado_por
    LEFT JOIN importacao.linha x ON x.lote_id = l.id`;

async function buscarLote(banco: Banco, id: number, comLinhas: boolean): Promise<LoteImportacao> {
  const { rows } = await banco.query<LoteImportacao>(`${SELECAO_LOTE} WHERE l.id = $1 GROUP BY l.id, u.nome`, [id]);
  const lote = rows[0];
  if (!lote) throw new ErroHttp(404, 'Importação não encontrada.');
  if (comLinhas) {
    const l = await banco.query<LinhaImportacao>(
      'SELECT numero, dados, situacao, problemas, ignorar FROM importacao.linha WHERE lote_id = $1 ORDER BY numero',
      [id],
    );
    lote.linhas = l.rows;
  }
  return lote;
}

/** com_inconsistencias enquanto houver linha com problema que não foi ignorada. */
async function recalcularSituacao(banco: Banco, id: number): Promise<void> {
  await banco.query(
    `UPDATE importacao.lote SET situacao = CASE
       WHEN EXISTS (SELECT 1 FROM importacao.linha WHERE lote_id = $1 AND situacao = 'problema' AND NOT ignorar)
       THEN 'com_inconsistencias' ELSE 'pronto' END
     WHERE id = $1 AND situacao IN ('com_inconsistencias', 'pronto')`,
    [id],
  );
}

async function anoCorrente(banco: Banco): Promise<number> {
  const { rows } = await banco.query<{ valor: unknown }>("SELECT valor FROM nucleo.config WHERE chave = 'ano_letivo_corrente'");
  return Number(rows[0]?.valor) || new Date().getFullYear();
}

export function rotasImportacao(deps: { pool: pg.Pool }): Router {
  const { pool } = deps;
  const rotas = Router();
  // A planilha vem no corpo como texto: limite maior só aqui.
  rotas.use('/importacoes', express.json({ limit: '5mb' }));

  rotas.get(
    '/importacoes',
    exigir('importacao.matriculas'),
    rota(async (_req, res) => {
      const { rows } = await pool.query(`${SELECAO_LOTE} GROUP BY l.id, u.nome ORDER BY l.criado_em DESC LIMIT 50`);
      res.json(rows);
    }),
  );

  rotas.get(
    '/importacoes/:id',
    exigir('importacao.matriculas'),
    rota(async (req, res) => {
      res.json(await buscarLote(pool, paramId(req), true));
    }),
  );

  rotas.post(
    '/importacoes',
    exigir('importacao.matriculas'),
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const corpo = (req.body ?? {}) as Partial<NovaImportacaoPedido>;
      if (corpo.tipo !== 'matriculas') throw new ErroHttp(400, 'Tipo de importação inválido.');
      const arquivoNome = texto(corpo.arquivoNome) ?? 'planilha.csv';
      if (typeof corpo.conteudo !== 'string' || !corpo.conteudo.trim()) throw new ErroHttp(400, 'O arquivo está vazio.');
      const ano = Number(corpo.anoLetivo) || (await anoCorrente(pool));
      const existeAno = await pool.query('SELECT 1 FROM rede.ano_letivo WHERE ano = $1', [ano]);
      if (!existeAno.rowCount) throw new ErroHttp(400, `O ano letivo ${ano} ainda não foi aberto.`);

      const analise = analisarMatriculas(lerCsv(corpo.conteudo));
      if (analise.faltando.length > 0) {
        throw new ErroHttp(400, `Faltam colunas na planilha: ${analise.faltando.join(', ')}. Use o modelo.`);
      }
      if (analise.linhas.length === 0) throw new ErroHttp(400, 'A planilha não tem linhas de dados.');
      if (analise.linhas.length > MAX_LINHAS) {
        throw new ErroHttp(400, `Planilha com mais de ${MAX_LINHAS} linhas: divida em arquivos por escola.`);
      }

      const linhas: LinhaImportacao[] = [];
      for (const l of analise.linhas) {
        if (l.problemas.length > 0) {
          linhas.push({ numero: l.numero, dados: l.dados, situacao: 'problema', problemas: l.problemas, ignorar: false });
        } else {
          const c = await conferirMatricula(pool, l.dados, ano);
          linhas.push({ numero: l.numero, dados: l.dados, situacao: c.situacao, problemas: c.problemas, ignorar: false });
        }
      }

      const hash = createHash('sha256').update(corpo.conteudo).digest('hex');
      const id = await emTransacao(pool, async (c) => {
        const { rows } = await c.query<{ id: number }>(
          `INSERT INTO importacao.lote (tipo, arquivo_nome, arquivo_hash, ano_letivo, situacao, criado_por)
           VALUES ('matriculas', $1, $2, $3, 'pronto', $4) RETURNING id`,
          [arquivoNome, hash, ano, eu.id],
        );
        const loteId = rows[0]!.id;
        await c.query(
          `INSERT INTO importacao.linha (lote_id, numero, dados, situacao, problemas)
           SELECT $1, x.numero, x.dados, x.situacao, ARRAY(SELECT jsonb_array_elements_text(x.problemas))
             FROM jsonb_to_recordset($2::jsonb) AS x(numero int, dados jsonb, situacao text, problemas jsonb)`,
          [loteId, JSON.stringify(linhas)],
        );
        await recalcularSituacao(c, loteId);
        return loteId;
      });
      res.status(201).json(await buscarLote(pool, id, true));
    }),
  );

  rotas.patch(
    '/importacoes/:id/linhas/:numero',
    exigir('importacao.matriculas'),
    rota(async (req, res) => {
      const id = paramId(req);
      const numero = paramId(req, 'numero');
      if (typeof req.body?.ignorar !== 'boolean') throw new ErroHttp(400, 'Informe se a linha deve ser ignorada.');
      const lote = await buscarLote(pool, id, false);
      if (!['com_inconsistencias', 'pronto'].includes(lote.situacao)) {
        throw new ErroHttp(409, 'Esta importação já foi publicada ou descartada.');
      }
      const r = await pool.query('UPDATE importacao.linha SET ignorar = $3 WHERE lote_id = $1 AND numero = $2', [
        id, numero, req.body.ignorar,
      ]);
      if (!r.rowCount) throw new ErroHttp(404, 'Linha não encontrada.');
      await recalcularSituacao(pool, id);
      res.json(await buscarLote(pool, id, true));
    }),
  );

  rotas.post(
    '/importacoes/:id/descartar',
    exigir('importacao.matriculas'),
    rota(async (req, res) => {
      const id = paramId(req);
      const r = await pool.query(
        `UPDATE importacao.lote SET situacao = 'descartado' WHERE id = $1 AND situacao IN ('com_inconsistencias', 'pronto')`,
        [id],
      );
      if (!r.rowCount) throw new ErroHttp(409, 'Só dá para descartar importação ainda não publicada.');
      res.json(await buscarLote(pool, id, false));
    }),
  );

  rotas.post(
    '/importacoes/:id/publicar',
    exigir('importacao.matriculas'),
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const id = paramId(req);
      await emTransacao(pool, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(hashtext('importacao.publicacao'))");
        const { rows } = await c.query<{ situacao: string; ano_letivo: number }>(
          'SELECT situacao, ano_letivo FROM importacao.lote WHERE id = $1 FOR UPDATE',
          [id],
        );
        const lote = rows[0];
        if (!lote) throw new ErroHttp(404, 'Importação não encontrada.');
        if (lote.situacao !== 'pronto') {
          throw new ErroHttp(409, lote.situacao === 'com_inconsistencias'
            ? 'Corrija ou ignore as linhas com problema antes de publicar.'
            : 'Esta importação já foi publicada ou descartada.');
        }
        const linhas = await c.query<LinhaImportacao>(
          `SELECT numero, dados, situacao, problemas, ignorar FROM importacao.linha
            WHERE lote_id = $1 AND NOT ignorar AND situacao <> 'problema' ORDER BY numero`,
          [id],
        );
        const resumo = { matriculasCriadas: 0, turmasCriadas: 0, estudantesCriados: 0 };
        for (const l of linhas.rows) {
          // A rede pode ter mudado desde a prévia: confere de novo antes de gravar.
          const agora = await conferirMatricula(c, l.dados, lote.ano_letivo);
          if (agora.situacao === 'problema') {
            throw new ErroHttp(409, `A linha ${l.numero} mudou desde a prévia: ${agora.problemas.join(' ')} Envie o arquivo de novo.`);
          }
          const r = await importarMatricula(c, l.dados, lote.ano_letivo, eu.id);
          await c.query('UPDATE importacao.linha SET resultado = $3 WHERE lote_id = $1 AND numero = $2', [id, l.numero, r]);
          if (r.matricula === 'criada') resumo.matriculasCriadas++;
          if (r.turmaCriada) resumo.turmasCriadas++;
          if (r.estudanteCriado) resumo.estudantesCriados++;
        }
        await c.query(
          `UPDATE importacao.lote SET situacao = 'publicado', resumo = $2, publicado_por = $3, publicado_em = now() WHERE id = $1`,
          [id, resumo, eu.id],
        );
        await registrarHistorico(c, {
          modulo: 'importacao', entidade: 'lote', entidadeId: id, acao: 'publicacao', dados: resumo, usuarioId: eu.id,
        });
      });
      res.json(await buscarLote(pool, id, false));
    }),
  );

  // UC-M05: desfaz a última publicação. Só a mais recente, para não desmontar o que outra
  // importação depois dela já usou. Motivo obrigatório: vai para o histórico.
  rotas.post(
    '/importacoes/:id/desfazer',
    exigir('importacao.matriculas'),
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const id = paramId(req);
      const motivo = texto(req.body?.motivo);
      if (!motivo) throw new ErroHttp(400, 'Diga por que a importação está sendo desfeita.');
      await emTransacao(pool, async (c) => {
        // Uma publicação ou desfazer de cada vez.
        await c.query("SELECT pg_advisory_xact_lock(hashtext('importacao.publicacao'))");
        const { rows } = await c.query<{ situacao: string; ultima: boolean }>(
          `SELECT l.situacao, NOT EXISTS (
                    SELECT 1 FROM importacao.lote p WHERE p.situacao = 'publicado' AND p.publicado_em > l.publicado_em
                  ) AS ultima
             FROM importacao.lote l WHERE l.id = $1 FOR UPDATE`,
          [id],
        );
        const lote = rows[0];
        if (!lote) throw new ErroHttp(404, 'Importação não encontrada.');
        if (lote.situacao !== 'publicado') throw new ErroHttp(409, 'Só uma importação publicada pode ser desfeita.');
        if (!lote.ultima) throw new ErroHttp(409, 'Há uma publicação mais recente. Desfaça primeiro a mais recente.');

        const linhas = await c.query<{ resultado: ResultadoImportacao }>(
          'SELECT resultado FROM importacao.linha WHERE lote_id = $1 AND resultado IS NOT NULL ORDER BY numero DESC',
          [id],
        );
        if (linhas.rows.length === 0) {
          throw new ErroHttp(409, 'Esta importação foi publicada antes de o sistema guardar o que cada linha fez. Desfaça à mão.');
        }
        try {
          for (const l of linhas.rows) await desfazerMatricula(c, l.resultado, eu.id, id);
        } catch (erro) {
          if (erro instanceof ErroDesfazer) throw new ErroHttp(409, erro.message);
          throw erro;
        }
        await c.query(
          `UPDATE importacao.lote SET situacao = 'desfeito', desfeito_por = $2, desfeito_em = now(), desfeito_motivo = $3 WHERE id = $1`,
          [id, eu.id, motivo],
        );
        await registrarHistorico(c, {
          modulo: 'importacao', entidade: 'lote', entidadeId: id, acao: 'desfeito', motivo, usuarioId: eu.id,
        });
      });
      res.json(await buscarLote(pool, id, false));
    }),
  );

  return rotas;
}
