// Histórico da plataforma: toda mudança grava quem, quando, o quê e por quê (CLAUDE.md, regra 6).

import type { Banco } from '../../banco.js';

export interface RegistroHistorico {
  /** Módulo dono da entidade: 'acesso', 'rede', 'fleo'... */
  modulo: string;
  entidade: string;
  entidadeId: number;
  acao: string;
  usuarioId: number | null;
  motivo?: string | null;
  dados?: unknown;
}

export async function registrarHistorico(banco: Banco, r: RegistroHistorico): Promise<void> {
  await banco.query(
    `INSERT INTO nucleo.historico (modulo, entidade, entidade_id, acao, motivo, dados, usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      r.modulo,
      r.entidade,
      r.entidadeId,
      r.acao,
      r.motivo ?? null,
      r.dados === undefined ? null : JSON.stringify(r.dados),
      r.usuarioId,
    ],
  );
}
