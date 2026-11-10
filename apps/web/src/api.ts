// Cliente da API: todo pedido leva o token; 401 desloga.

const CHAVE_TOKEN = 'central.token';

export class ErroApi extends Error {
  constructor(
    public status: number,
    mensagem: string,
    public codigo?: string,
    /** Corpo completo da resposta de erro (ex.: lista de prováveis duplicados). */
    public extra?: Record<string, unknown>,
  ) {
    super(mensagem);
  }
}

let aoDeslogar: (() => void) | null = null;
export function quandoDeslogar(fn: () => void): void {
  aoDeslogar = fn;
}

export function lerToken(): string | null {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN) ?? localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

/** "Manter conectado" guarda no aparelho (localStorage); sem isso, só até fechar a aba. */
export function gravarToken(token: string | null, manter = false): void {
  try {
    sessionStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_TOKEN);
    if (token) (manter ? localStorage : sessionStorage).setItem(CHAVE_TOKEN, token);
  } catch {
    // Sem armazenamento (modo privado): vale até recarregar.
  }
}

export async function chamar<T>(
  caminho: string,
  opcoes: { metodo?: string; json?: unknown } = {},
): Promise<T> {
  const token = lerToken();
  let res: Response;
  try {
    res = await fetch(`/api${caminho}`, {
      method: opcoes.metodo ?? (opcoes.json === undefined ? 'GET' : 'POST'),
      headers: {
        ...(opcoes.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opcoes.json !== undefined ? JSON.stringify(opcoes.json) : undefined,
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor. Confira a internet e tente de novo.');
  }
  if (res.status === 401 && caminho !== '/auth/login') {
    gravarToken(null);
    aoDeslogar?.();
  }
  const corpo = (res.headers.get('content-type') ?? '').includes('json') ? await res.json() : null;
  if (!res.ok) {
    throw new ErroApi(res.status, corpo?.erro ?? `Erro ${res.status} no servidor.`, corpo?.codigo, corpo ?? undefined);
  }
  return corpo as T;
}
