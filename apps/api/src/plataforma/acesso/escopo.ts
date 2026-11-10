// Liga o pacote @central/escopo ao banco: busca os vínculos do usuário e traduz a abrangência
// em filtro SQL. Toda consulta de rede e de módulo passa por aqui (CLAUDE.md, regra 8).

import { escopo, pode, type AcaoPlataforma, type Escopo } from '@central/escopo';
import type { Usuario } from '@central/tipos';
import type { RequestHandler } from 'express';
import type { Banco } from '../../banco.js';
import { usuarioDa } from './middleware.js';

export async function escopoDe(banco: Banco, usuario: Usuario): Promise<Escopo> {
  const [escolas, turmas] = await Promise.all([
    banco.query<{ id: number }>(
      'SELECT escola_id AS id FROM acesso.usuario_escola WHERE usuario_id = $1',
      [usuario.id],
    ),
    banco.query<{ id: number }>(
      'SELECT turma_id AS id FROM rede.turma_professor WHERE usuario_id = $1',
      [usuario.id],
    ),
  ]);
  return escopo(usuario.perfil, {
    escolas: escolas.rows.map((r) => r.id),
    turmas: turmas.rows.map((r) => r.id),
  });
}

/**
 * Condição SQL "a turma `alias` está no escopo". Acrescenta os parâmetros em `params` e usa os
 * números de parâmetro seguintes.
 */
export function filtroTurma(e: Escopo, params: unknown[], alias = 't'): string {
  const a = e.abrangencia;
  if (a.tipo === 'rede') return 'TRUE';
  if (a.tipo === 'nenhuma') return 'FALSE';
  if (a.tipo === 'escolas') {
    params.push(a.escolas);
    return `${alias}.escola_id = ANY($${params.length}::int[])`;
  }
  params.push(a.turmas);
  return `${alias}.id = ANY($${params.length}::int[])`;
}

/** Condição SQL "a escola `alias` está no escopo" (professor: escolas das suas turmas). */
export function filtroEscola(e: Escopo, params: unknown[], alias = 'e'): string {
  const a = e.abrangencia;
  if (a.tipo === 'rede') return 'TRUE';
  if (a.tipo === 'nenhuma') return 'FALSE';
  if (a.tipo === 'escolas') {
    params.push(a.escolas);
    return `${alias}.id = ANY($${params.length}::int[])`;
  }
  params.push(a.turmas);
  return `${alias}.id IN (SELECT escola_id FROM rede.turma WHERE id = ANY($${params.length}::int[]))`;
}

/** Exige a permissão de escrita da plataforma. Use depois de `autenticar`. */
export function exigir(acao: AcaoPlataforma): RequestHandler {
  return (req, res, next) => {
    if (!pode(usuarioDa(req).perfil, acao)) {
      res.status(403).json({ erro: 'Seu perfil não tem acesso a esta ação.' });
      return;
    }
    next();
  };
}
