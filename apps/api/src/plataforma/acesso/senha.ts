import bcrypt from 'bcryptjs';

const CUSTO = 12;
export const SENHA_MINIMA = 10;

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO);
}

export function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

// Hash de uma senha qualquer: usado quando o login não existe, para a resposta levar
// o mesmo tempo e não revelar quais logins existem.
export const HASH_FICTICIO = bcrypt.hashSync('senha-que-nao-existe', CUSTO);

export function validarSenhaNova(senha: unknown): string | null {
  if (typeof senha !== 'string' || senha.length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  }
  return null;
}

// Tentativas erradas seguidas bloqueiam o login por alguns minutos.
export const REGRA_BLOQUEIO = { maxFalhas: 5, bloqueioMin: 15 };
