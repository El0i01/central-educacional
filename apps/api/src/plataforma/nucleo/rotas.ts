// UC-A07: histórico de acessos para o admin. Três visões do núcleo: entradas (login, bloqueio),
// abertura de dado nominal de estudante (LGPD) e alterações em geral. O admin não vê nome de
// estudante: o registro nominal mostra quem abriu, onde e quantos estudantes apareceram.

import type { ListaRegistrosAcesso, RegistroAcesso, TipoRegistroAcesso } from '@central/tipos';
import { Router } from 'express';
import type pg from 'pg';
import { ErroHttp, rota } from '../../http.js';
import { exigir } from '../acesso/escopo.js';

const POR_PAGINA = 50;
const TIPOS: TipoRegistroAcesso[] = ['entradas', 'nominal', 'alteracoes'];
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function textoQuery(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function rotasAuditoria(deps: { pool: pg.Pool }): Router {
  const { pool } = deps;
  const rotas = Router();

  rotas.get(
    '/acessos',
    exigir('auditoria.ver'),
    rota(async (req, res) => {
      const tipo = (textoQuery(req.query.tipo) ?? 'entradas') as TipoRegistroAcesso;
      if (!TIPOS.includes(tipo)) throw new ErroHttp(400, 'Tipo de registro inválido.');
      const pagina = Math.max(1, Math.floor(Number(req.query.pagina)) || 1);
      const de = textoQuery(req.query.de);
      const ate = textoQuery(req.query.ate);
      if ((de && !DATA.test(de)) || (ate && !DATA.test(ate))) throw new ErroHttp(400, 'Data inválida.');
      const usuario = textoQuery(req.query.usuario);

      const params: unknown[] = [];
      const filtros: string[] = [];
      const coluna = tipo === 'nominal' ? 'a.criado_em' : 'h.criado_em';
      if (usuario) {
        params.push(`%${usuario}%`);
        const n = params.length;
        // No bloqueio, quem age é o sistema: o usuário afetado é a entidade (alvo).
        filtros.push(
          tipo === 'nominal'
            ? `(u.login ILIKE $${n} OR u.nome ILIKE $${n})`
            : `(coalesce(u.login, alvo.login) ILIKE $${n} OR coalesce(u.nome, alvo.nome) ILIKE $${n})`,
        );
      }
      if (de) {
        params.push(de);
        filtros.push(`${coluna} >= $${params.length}::date`);
      }
      if (ate) {
        params.push(ate);
        filtros.push(`${coluna} < $${params.length}::date + 1`);
      }

      let consulta: string;
      if (tipo === 'nominal') {
        // Uma linha por abertura de tela: mesmo usuário, contexto e instante.
        consulta = `
          SELECT min(a.id)::int AS id, a.criado_em AS quando, u.nome AS usuario, u.login, a.contexto AS modulo,
                 'abriu nomes' AS acao, NULL AS entidade, NULL::int AS "entidadeId", NULL AS motivo,
                 count(*)::int AS estudantes
            FROM nucleo.acesso_nominal a LEFT JOIN acesso.usuario u ON u.id = a.usuario_id
           ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
           GROUP BY a.criado_em, a.usuario_id, u.nome, u.login, a.contexto`;
      } else {
        filtros.unshift(
          tipo === 'entradas'
            ? "h.modulo = 'acesso' AND h.acao IN ('login', 'bloqueio')"
            : "NOT (h.modulo = 'acesso' AND h.acao = 'login')",
        );
        consulta = `
          SELECT h.id::int, h.criado_em AS quando, coalesce(u.nome, alvo.nome) AS usuario,
                 coalesce(u.login, alvo.login) AS login, h.modulo, h.acao, h.entidade,
                 h.entidade_id AS "entidadeId", h.motivo, NULL::int AS estudantes
            FROM nucleo.historico h
            LEFT JOIN acesso.usuario u ON u.id = h.usuario_id
            LEFT JOIN acesso.usuario alvo
                   ON h.usuario_id IS NULL AND h.entidade = 'usuario' AND alvo.id = h.entidade_id
           WHERE ${filtros.join(' AND ')}`;
      }

      const total = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM (${consulta}) x`, params);
      const itens = await pool.query<RegistroAcesso>(
        `${consulta} ORDER BY quando DESC, id DESC LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}`,
        params,
      );
      const resposta: ListaRegistrosAcesso = {
        itens: itens.rows,
        total: total.rows[0]!.n,
        pagina,
        porPagina: POR_PAGINA,
      };
      res.json(resposta);
    }),
  );

  return rotas;
}
