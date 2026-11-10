import type { Perfil, Usuario } from '@central/tipos';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { lerToken } from './token.js';
import { publico, type RepositorioUsuarios } from './usuarios.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Preenchido por `autenticar`. */
      usuario?: Usuario;
    }
  }
}

/**
 * Exige token válido de um usuário ativo. O perfil vem do banco a cada requisição,
 * então desativar um usuário ou trocar o perfil vale na hora.
 */
export function autenticar(usuarios: RepositorioUsuarios, segredo: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cabecalho = req.headers.authorization ?? '';
    const [esquema, token] = cabecalho.split(' ');
    const id = esquema === 'Bearer' && token ? lerToken(token, segredo) : null;
    const usuario = id ? await usuarios.buscarPorId(id) : null;

    if (!usuario || !usuario.ativo) {
      res.status(401).json({ erro: 'Login necessário.' });
      return;
    }
    // Senha provisória: até trocar, só vê os próprios dados e troca a senha.
    if (usuario.trocarSenha && !['/eu', '/eu/senha'].includes(req.path)) {
      res
        .status(403)
        .json({ erro: 'Troque a senha provisória antes de continuar.', codigo: 'trocar_senha' });
      return;
    }
    req.usuario = publico(usuario);
    next();
  };
}

/** Exige um dos perfis. Use depois de `autenticar`. */
export function exigirPerfil(...perfis: Perfil[]): RequestHandler {
  return (req, res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      res.status(403).json({ erro: 'Seu perfil não tem acesso a esta ação.' });
      return;
    }
    next();
  };
}

/** Usuário autenticado; só chame em rotas protegidas por `autenticar`. */
export function usuarioDa(req: Request): Usuario {
  if (!req.usuario) throw new Error('Rota sem autenticar: usuário ausente.');
  return req.usuario;
}
