import { randomInt } from 'node:crypto';
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

// Recuperação sem e-mail: o admin ou o responsável pelos cadastros gera uma senha provisória, que
// vale por pouco tempo e obriga a troca no primeiro login.
export const VALIDADE_PROVISORIA_HORAS = 24;

// Sem letras e números que se confundem (l, 1, o, 0, i), para ditar ou copiar do papel.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Senha provisória legível em três grupos: `xxxx-xxxx-xxxx` (14 caracteres). */
export function gerarSenhaProvisoria(): { senha: string; expiraEm: Date } {
  const grupos = Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join(''),
  );
  return {
    senha: grupos.join('-'),
    expiraEm: new Date(Date.now() + VALIDADE_PROVISORIA_HORAS * 3600_000),
  };
}
