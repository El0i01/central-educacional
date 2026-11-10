// Apoio aos testes de integração: banco descartável em TEST_DATABASE_URL, migrado do zero.

import { listarMigracoes, migrar, PASTA_MIGRACOES } from '@central/database/migrar';
import pg from 'pg';
import { hashSenha } from '../plataforma/acesso/senha.js';
import type { Perfil } from '@central/tipos';

export const URL_TESTE = process.env.TEST_DATABASE_URL ?? '';
export const SEGREDO_TESTE = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const SCHEMAS = ['fleo', 'rede', 'acesso', 'nucleo'];

/** Apaga os schemas da central e aplica todas as migrações. Só em banco de teste. */
export async function bancoLimpo(): Promise<pg.Pool> {
  if (!/_teste\b|_test\b/.test(URL_TESTE)) {
    throw new Error('TEST_DATABASE_URL precisa apontar para um banco com _teste no nome.');
  }
  const cliente = new pg.Client({ connectionString: URL_TESTE });
  await cliente.connect();
  try {
    await cliente.query(`DROP SCHEMA IF EXISTS ${SCHEMAS.join(', ')} CASCADE`);
    await migrar(cliente, listarMigracoes(PASTA_MIGRACOES), () => undefined);
  } finally {
    await cliente.end();
  }
  return new pg.Pool({ connectionString: URL_TESTE });
}

export async function criarUsuario(
  pool: pg.Pool,
  login: string,
  perfil: Perfil,
  senha = 'senha-de-teste-123',
  extra: { trocarSenha?: boolean; provisoriaExpira?: Date } = {},
): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO acesso.usuario (login, nome, perfil, senha_hash, trocar_senha, senha_provisoria_expira)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [login, `Usuário ${login}`, perfil, await hashSenha(senha), extra.trocarSenha ?? false, extra.provisoriaExpira ?? null],
  );
  return rows[0]!.id;
}
