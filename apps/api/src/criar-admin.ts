// Cria o primeiro usuário admin. Recusa se já existir algum admin.
//   ADMIN_LOGIN=... ADMIN_NOME=... ADMIN_SENHA=... pnpm --filter @central/api criar-admin

import { criarPool } from './banco.js';
import { hashSenha, validarSenhaNova } from './plataforma/acesso/senha.js';
import { repositorioUsuarios } from './plataforma/acesso/usuarios.js';
import { registrarHistorico } from './plataforma/nucleo/historico.js';

async function principal(): Promise<void> {
  const { DATABASE_URL, ADMIN_LOGIN, ADMIN_NOME, ADMIN_SENHA } = process.env;
  if (!DATABASE_URL) throw new Error('DATABASE_URL não definida.');
  if (!ADMIN_LOGIN || !ADMIN_NOME || !ADMIN_SENHA) {
    throw new Error('Defina ADMIN_LOGIN, ADMIN_NOME e ADMIN_SENHA.');
  }
  const erroSenha = validarSenhaNova(ADMIN_SENHA);
  if (erroSenha) throw new Error(erroSenha);

  const pool = criarPool(DATABASE_URL);
  try {
    const { rows } = await pool.query("SELECT 1 FROM acesso.usuario WHERE perfil = 'admin'");
    if (rows.length > 0) throw new Error('Já existe um admin. Crie os demais usuários pela central.');

    const admin = await repositorioUsuarios(pool).criar({
      login: ADMIN_LOGIN.trim().toLowerCase(),
      nome: ADMIN_NOME.trim(),
      perfil: 'admin',
      senhaHash: await hashSenha(ADMIN_SENHA),
    });
    await registrarHistorico(pool, {
      modulo: 'acesso',
      entidade: 'usuario',
      entidadeId: admin.id,
      acao: 'criacao',
      dados: { login: admin.login, perfil: 'admin', origem: 'criar-admin' },
      usuarioId: null,
    });
    console.log(`Admin "${admin.login}" criado.`);
  } finally {
    await pool.end();
  }
}

principal().catch((erro: Error) => {
  console.error(erro.message);
  process.exit(1);
});
