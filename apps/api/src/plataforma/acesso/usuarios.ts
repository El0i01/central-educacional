// Acesso à tabela acesso.usuario.

import type { Perfil, Usuario } from '@central/tipos';
import type { Banco } from '../../banco.js';

export interface UsuarioCompleto extends Usuario {
  senhaHash: string;
  falhasLogin: number;
  bloqueadoAte: Date | null;
  senhaProvisoriaExpira: Date | null;
}

const COLUNAS = `id, login, nome, perfil, ativo, trocar_senha AS "trocarSenha",
  senha_hash AS "senhaHash", falhas_login AS "falhasLogin", bloqueado_ate AS "bloqueadoAte",
  senha_provisoria_expira AS "senhaProvisoriaExpira"`;

export function publico(u: UsuarioCompleto): Usuario {
  return {
    id: u.id,
    login: u.login,
    nome: u.nome,
    perfil: u.perfil,
    ativo: u.ativo,
    trocarSenha: u.trocarSenha,
  };
}

export function repositorioUsuarios(banco: Banco) {
  return {
    async buscarPorId(id: number): Promise<UsuarioCompleto | null> {
      const { rows } = await banco.query<UsuarioCompleto>(
        `SELECT ${COLUNAS} FROM acesso.usuario WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async buscarPorLogin(login: string): Promise<UsuarioCompleto | null> {
      const { rows } = await banco.query<UsuarioCompleto>(
        `SELECT ${COLUNAS} FROM acesso.usuario WHERE login = $1`,
        [login],
      );
      return rows[0] ?? null;
    },

    async criar(dados: {
      login: string;
      nome: string;
      perfil: Perfil;
      senhaHash: string;
      trocarSenha?: boolean;
    }): Promise<UsuarioCompleto> {
      const { rows } = await banco.query<UsuarioCompleto>(
        `INSERT INTO acesso.usuario (login, nome, perfil, senha_hash, trocar_senha)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUNAS}`,
        [dados.login, dados.nome, dados.perfil, dados.senhaHash, dados.trocarSenha ?? false],
      );
      return rows[0]!;
    },

    /** Conta a tentativa; ao chegar no limite, bloqueia. Acerto zera a contagem. */
    async registrarTentativa(
      id: number,
      acertou: boolean,
      regra: { maxFalhas: number; bloqueioMin: number },
    ): Promise<{ bloqueou: boolean }> {
      if (acertou) {
        await banco.query(
          'UPDATE acesso.usuario SET falhas_login = 0, bloqueado_ate = NULL WHERE id = $1',
          [id],
        );
        return { bloqueou: false };
      }
      const { rows } = await banco.query<{ falhas: number }>(
        `UPDATE acesso.usuario
            SET falhas_login = CASE WHEN falhas_login + 1 >= $2 THEN 0 ELSE falhas_login + 1 END,
                bloqueado_ate = CASE WHEN falhas_login + 1 >= $2
                                     THEN now() + make_interval(mins => $3) ELSE bloqueado_ate END
          WHERE id = $1
      RETURNING CASE WHEN bloqueado_ate > now() THEN $2 ELSE falhas_login END AS falhas`,
        [id, regra.maxFalhas, regra.bloqueioMin],
      );
      return { bloqueou: rows[0]?.falhas === regra.maxFalhas };
    },

    async trocarSenha(id: number, senhaHash: string): Promise<void> {
      await banco.query(
        `UPDATE acesso.usuario
            SET senha_hash = $2, trocar_senha = false, senha_provisoria_expira = NULL
          WHERE id = $1`,
        [id, senhaHash],
      );
    },
  };
}

export type RepositorioUsuarios = ReturnType<typeof repositorioUsuarios>;
