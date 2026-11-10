// Gestão de usuários e vínculos (UC-A04, A05, A06).
// Quem pode: admin (qualquer perfil) e responsável pelos cadastros (contas de escola).

import { perfisAtribuiveis } from '@central/escopo';
import {
  PERFIS,
  type CriarUsuarioPedido,
  type EditarUsuarioPedido,
  type ListaUsuarios,
  type Perfil,
  type SenhaProvisoriaResposta,
  type Usuario,
  type UsuarioGestao,
} from '@central/tipos';
import { Router } from 'express';
import type pg from 'pg';
import { emTransacao, type Banco } from '../../banco.js';
import { ErroHttp, paramId, rota, texto } from '../../http.js';
import { registrarHistorico } from '../nucleo/historico.js';
import { exigir } from './escopo.js';
import { usuarioDa } from './middleware.js';
import { gerarSenhaProvisoria, hashSenha } from './senha.js';

const LOGIN = /^[a-z0-9._-]{3,40}$/;
// Perfis que trabalham com vínculo de escola.
const COM_ESCOLA: Perfil[] = ['coordenacao', 'equipe_pedagogica'];

const SELECAO = `
  SELECT u.id, u.login, u.nome, u.perfil, u.ativo, u.trocar_senha AS "trocarSenha",
         coalesce(u.bloqueado_ate > now(), false) AS bloqueado,
         coalesce(array_agg(ue.escola_id ORDER BY ue.escola_id)
                  FILTER (WHERE ue.escola_id IS NOT NULL), '{}') AS escolas
    FROM acesso.usuario u
    LEFT JOIN acesso.usuario_escola ue ON ue.usuario_id = u.id`;

async function buscar(banco: Banco, id: number): Promise<UsuarioGestao | null> {
  const { rows } = await banco.query<UsuarioGestao>(`${SELECAO} WHERE u.id = $1 GROUP BY u.id`, [id]);
  return rows[0] ?? null;
}

function lerPerfil(v: unknown): Perfil {
  if (typeof v !== 'string' || !PERFIS.includes(v as Perfil)) {
    throw new ErroHttp(400, 'Perfil inválido.');
  }
  return v as Perfil;
}

function lerEscolas(v: unknown): number[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every((n) => Number.isInteger(n) && n > 0)) {
    throw new ErroHttp(400, 'Escolas inválidas: envie a lista de códigos.');
  }
  return [...new Set(v as number[])];
}

/** Quem gerencia só mexe em contas cujo perfil ele poderia atribuir. */
function conferirAlvo(eu: Usuario, alvo: UsuarioGestao): void {
  if (!perfisAtribuiveis(eu.perfil).includes(alvo.perfil)) {
    throw new ErroHttp(403, 'Seu perfil não pode alterar esta conta.');
  }
}

async function gravarEscolas(c: pg.PoolClient, usuarioId: number, perfil: Perfil, escolas: number[]) {
  await c.query('DELETE FROM acesso.usuario_escola WHERE usuario_id = $1', [usuarioId]);
  if (!COM_ESCOLA.includes(perfil) || escolas.length === 0) return;
  const { rows } = await c.query<{ id: number }>(
    'SELECT id FROM rede.escola WHERE id = ANY($1::int[])',
    [escolas],
  );
  if (rows.length !== escolas.length) throw new ErroHttp(400, 'Alguma escola informada não existe.');
  await c.query(
    `INSERT INTO acesso.usuario_escola (usuario_id, escola_id) SELECT $1, unnest($2::int[])`,
    [usuarioId, escolas],
  );
}

export function rotasGestaoUsuarios(deps: { pool: pg.Pool }): Router {
  const rotas = Router();

  rotas.get(
    '/usuarios',
    exigir('usuarios.ver'),
    rota(async (req, res) => {
      const { rows } = await deps.pool.query<UsuarioGestao>(
        `${SELECAO} GROUP BY u.id ORDER BY u.ativo DESC, u.nome`,
      );
      const corpo: ListaUsuarios = {
        usuarios: rows,
        perfisAtribuiveis: perfisAtribuiveis(usuarioDa(req).perfil),
      };
      res.json(corpo);
    }),
  );

  rotas.post(
    '/usuarios',
    exigir('usuarios.gerir'),
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const corpo = (req.body ?? {}) as Partial<CriarUsuarioPedido>;
      const login = typeof corpo.login === 'string' ? corpo.login.trim().toLowerCase() : '';
      if (!LOGIN.test(login)) {
        throw new ErroHttp(400, 'Login de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen.');
      }
      const nome = texto(corpo.nome);
      if (!nome) throw new ErroHttp(400, 'Informe o nome.');
      const perfil = lerPerfil(corpo.perfil);
      if (!perfisAtribuiveis(eu.perfil).includes(perfil)) {
        throw new ErroHttp(403, 'Seu perfil não pode criar contas com este perfil.');
      }
      const escolas = lerEscolas(corpo.escolas);
      const provisoria = gerarSenhaProvisoria();
      const hash = await hashSenha(provisoria.senha);

      const id = await emTransacao(deps.pool, async (c) => {
        const existe = await c.query('SELECT 1 FROM acesso.usuario WHERE login = $1', [login]);
        if (existe.rowCount) throw new ErroHttp(409, `O login "${login}" já existe.`);
        const { rows } = await c.query<{ id: number }>(
          `INSERT INTO acesso.usuario (login, nome, perfil, senha_hash, trocar_senha, senha_provisoria_expira)
           VALUES ($1, $2, $3, $4, true, $5) RETURNING id`,
          [login, nome, perfil, hash, provisoria.expiraEm],
        );
        const novo = rows[0]!.id;
        await gravarEscolas(c, novo, perfil, escolas);
        await registrarHistorico(c, {
          modulo: 'acesso',
          entidade: 'usuario',
          entidadeId: novo,
          acao: 'criacao',
          dados: { login, perfil, escolas },
          usuarioId: eu.id,
        });
        return novo;
      });

      const resposta: SenhaProvisoriaResposta = {
        usuario: (await buscar(deps.pool, id))!,
        senhaProvisoria: provisoria.senha,
        expiraEm: provisoria.expiraEm.toISOString(),
      };
      res.status(201).json(resposta);
    }),
  );

  rotas.patch(
    '/usuarios/:id',
    exigir('usuarios.gerir'),
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const id = paramId(req);
      const corpo = (req.body ?? {}) as EditarUsuarioPedido;
      const alvo = await buscar(deps.pool, id);
      if (!alvo) throw new ErroHttp(404, 'Usuário não encontrado.');
      conferirAlvo(eu, alvo);

      const perfil = corpo.perfil === undefined ? alvo.perfil : lerPerfil(corpo.perfil);
      if (perfil !== alvo.perfil && !perfisAtribuiveis(eu.perfil).includes(perfil)) {
        throw new ErroHttp(403, 'Seu perfil não pode atribuir este perfil.');
      }
      if (id === eu.id && (perfil !== alvo.perfil || corpo.ativo === false)) {
        throw new ErroHttp(400, 'Você não pode mudar o próprio perfil nem desativar a própria conta.');
      }
      const nome = corpo.nome === undefined ? alvo.nome : texto(corpo.nome);
      if (!nome) throw new ErroHttp(400, 'Informe o nome.');
      const ativo = typeof corpo.ativo === 'boolean' ? corpo.ativo : alvo.ativo;
      const escolas = corpo.escolas === undefined ? alvo.escolas : lerEscolas(corpo.escolas);

      await emTransacao(deps.pool, async (c) => {
        await c.query('UPDATE acesso.usuario SET nome = $2, perfil = $3, ativo = $4 WHERE id = $1', [
          id,
          nome,
          perfil,
          ativo,
        ]);
        await gravarEscolas(c, id, perfil, escolas);
        await registrarHistorico(c, {
          modulo: 'acesso',
          entidade: 'usuario',
          entidadeId: id,
          acao: 'edicao',
          dados: {
            antes: { nome: alvo.nome, perfil: alvo.perfil, ativo: alvo.ativo, escolas: alvo.escolas },
            depois: { nome, perfil, ativo, escolas },
          },
          usuarioId: eu.id,
        });
      });
      res.json(await buscar(deps.pool, id));
    }),
  );

  rotas.post(
    '/usuarios/:id/senha-provisoria',
    exigir('usuarios.gerir'),
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const id = paramId(req);
      const alvo = await buscar(deps.pool, id);
      if (!alvo) throw new ErroHttp(404, 'Usuário não encontrado.');
      conferirAlvo(eu, alvo);
      if (id === eu.id) throw new ErroHttp(400, 'Para a sua conta, use "trocar senha".');

      const provisoria = gerarSenhaProvisoria();
      await deps.pool.query(
        `UPDATE acesso.usuario
            SET senha_hash = $2, trocar_senha = true, senha_provisoria_expira = $3,
                falhas_login = 0, bloqueado_ate = NULL
          WHERE id = $1`,
        [id, await hashSenha(provisoria.senha), provisoria.expiraEm],
      );
      await registrarHistorico(deps.pool, {
        modulo: 'acesso',
        entidade: 'usuario',
        entidadeId: id,
        acao: 'senha_provisoria',
        usuarioId: eu.id,
      });
      const resposta: SenhaProvisoriaResposta = {
        usuario: (await buscar(deps.pool, id))!,
        senhaProvisoria: provisoria.senha,
        expiraEm: provisoria.expiraEm.toISOString(),
      };
      res.json(resposta);
    }),
  );

  return rotas;
}
