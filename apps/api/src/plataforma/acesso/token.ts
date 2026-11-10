import jwt from 'jsonwebtoken';

export interface ConteudoToken {
  /** id do usuário */
  sub: string;
}

export function assinarToken(usuarioId: number, segredo: string, validade: string): string {
  return jwt.sign({}, segredo, {
    subject: String(usuarioId),
    expiresIn: validade as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/** Devolve o id do usuário ou null se o token for inválido ou expirado. */
export function lerToken(token: string, segredo: string): number | null {
  try {
    const conteudo = jwt.verify(token, segredo, { algorithms: ['HS256'] });
    if (typeof conteudo === 'string' || !conteudo.sub) return null;
    const id = Number(conteudo.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
