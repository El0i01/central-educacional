// Apoio comum às rotas: erro com status, leitura de parâmetros e envoltório de handler.

import { ErroRegra } from '@central/fleo';
import type { Request, Response } from 'express';

export class ErroHttp extends Error {
  constructor(
    public status: number,
    mensagem: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(mensagem);
  }
}

export function param(req: Request, nome: string): string {
  const v = req.params[nome];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

/** Parâmetro de rota numérico (id). Inválido = 404, sem revelar nada. */
export function paramId(req: Request, nome = 'id'): number {
  const n = Number(param(req, nome));
  if (!Number.isInteger(n) || n <= 0) throw new ErroHttp(404, 'Não encontrado.');
  return n;
}

export function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Envolve um handler: ErroHttp e ErroRegra viram resposta com o status certo. */
export function rota(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (erro) {
      if (erro instanceof ErroHttp) {
        res.status(erro.status).json({ erro: erro.message, ...erro.extra });
        return;
      }
      if (erro instanceof ErroRegra) {
        res.status(erro.status).json({ erro: erro.message });
        return;
      }
      throw erro;
    }
  };
}
