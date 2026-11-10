import type { LoginPedido, LoginResposta } from '@central/tipos';
import { Router } from 'express';
import type pg from 'pg';
import { usuarioDa } from './middleware.js';
import {
  conferirSenha,
  HASH_FICTICIO,
  hashSenha,
  REGRA_BLOQUEIO,
  validarSenhaNova,
} from './senha.js';
import { assinarToken } from './token.js';
import { registrarHistorico } from '../nucleo/historico.js';
import { publico, type RepositorioUsuarios } from './usuarios.js';
import { ErroHttp, rota } from '../../http.js';

interface Deps {
  pool: pg.Pool;
  usuarios: RepositorioUsuarios;
  jwtSegredo: string;
  jwtValidade: string;
}

// "Manter conectado" no celular do professor: não pedir a senha a cada 8h.
const VALIDADE_MANTER = '30d';

/** Rota pública: POST /auth/login. */
export function rotasLogin(deps: Deps): Router {
  const rotas = Router();

  rotas.post(
    '/login',
    rota(async (req, res) => {
      const { login, senha, manter } = (req.body ?? {}) as Partial<LoginPedido>;
      if (typeof login !== 'string' || typeof senha !== 'string' || !login || !senha) {
        throw new ErroHttp(400, 'Informe login e senha.');
      }

      const usuario = await deps.usuarios.buscarPorLogin(login.trim().toLowerCase());
      // Confere a senha mesmo sem usuário, para não revelar pelo tempo quais logins existem.
      const senhaOk = await conferirSenha(senha, usuario?.senhaHash ?? HASH_FICTICIO);

      const bloqueadoAte = usuario?.ativo ? usuario.bloqueadoAte : null;
      if (bloqueadoAte && bloqueadoAte > new Date()) {
        const minutos = Math.max(1, Math.ceil((bloqueadoAte.getTime() - Date.now()) / 60_000));
        throw new ErroHttp(
          429,
          `Acesso bloqueado por tentativas erradas. Tente de novo em ${minutos} min ou peça ao administrador para desbloquear.`,
        );
      }

      if (!usuario || !senhaOk || !usuario.ativo) {
        if (usuario?.ativo) {
          const { bloqueou } = await deps.usuarios.registrarTentativa(
            usuario.id,
            false,
            REGRA_BLOQUEIO,
          );
          if (bloqueou) {
            await registrarHistorico(deps.pool, {
              modulo: 'acesso',
              entidade: 'usuario',
              entidadeId: usuario.id,
              acao: 'bloqueio',
              usuarioId: null,
            });
          }
        }
        throw new ErroHttp(401, 'Login ou senha incorretos.');
      }

      if (
        usuario.trocarSenha &&
        usuario.senhaProvisoriaExpira &&
        usuario.senhaProvisoriaExpira < new Date()
      ) {
        throw new ErroHttp(401, 'A senha provisória venceu. Peça outra ao administrador.');
      }

      await deps.usuarios.registrarTentativa(usuario.id, true, REGRA_BLOQUEIO);
      await registrarHistorico(deps.pool, {
        modulo: 'acesso',
        entidade: 'usuario',
        entidadeId: usuario.id,
        acao: 'login',
        usuarioId: usuario.id,
      });

      const resposta: LoginResposta = {
        token: assinarToken(
          usuario.id,
          deps.jwtSegredo,
          manter === true ? VALIDADE_MANTER : deps.jwtValidade,
        ),
        usuario: publico(usuario),
      };
      res.json(resposta);
    }),
  );

  return rotas;
}

/** Rotas protegidas do próprio usuário: GET /eu e POST /eu/senha. */
export function rotasEu(deps: Deps): Router {
  const rotas = Router();

  rotas.get('/eu', (req, res) => {
    res.json(usuarioDa(req));
  });

  rotas.post(
    '/eu/senha',
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const { senhaAtual, senhaNova } = (req.body ?? {}) as Record<string, unknown>;
      const completo = await deps.usuarios.buscarPorId(eu.id);
      if (
        !completo ||
        typeof senhaAtual !== 'string' ||
        !(await conferirSenha(senhaAtual, completo.senhaHash))
      ) {
        throw new ErroHttp(400, 'A senha atual não confere.');
      }
      const erro = validarSenhaNova(senhaNova);
      if (erro) throw new ErroHttp(400, erro);
      await deps.usuarios.trocarSenha(eu.id, await hashSenha(senhaNova as string));
      await registrarHistorico(deps.pool, {
        modulo: 'acesso',
        entidade: 'usuario',
        entidadeId: eu.id,
        acao: 'troca_senha',
        usuarioId: eu.id,
      });
      res.json({ ...eu, trocarSenha: false });
    }),
  );

  return rotas;
}
