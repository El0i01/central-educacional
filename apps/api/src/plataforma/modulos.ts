// Registro de módulos: a API se monta a partir dos módulos ligados (docs/modulos.md, seção 1).
// A plataforma não importa nada de modulos/: recebe a lista de registros em criarApp.

import type { CodigoModulo, ModuloAtivo, Perfil } from '@central/tipos';
import { Router } from 'express';
import type pg from 'pg';
import { usuarioDa } from './acesso/middleware.js';

export interface ContextoModulo {
  pool: pg.Pool;
}

export interface RegistroModulo {
  codigo: CodigoModulo;
  nome: string;
  /** Schema PostgreSQL do módulo; só ele escreve ali. */
  schema: string;
  /** Caminho base na web e prefixo das rotas: /api/<codigo>/... */
  caminho: string;
  /** Perfis que veem o módulo no menu. A API confere o perfil de novo em cada rota. */
  perfis: Perfil[];
  rotas: (ctx: ContextoModulo) => Router;
}

/** Códigos ligados em nucleo.config (modulos_ativos). Erro de leitura = nenhum módulo. */
export async function lerModulosAtivos(pool: pg.Pool): Promise<Set<string>> {
  const { rows } = await pool.query<{ valor: unknown }>(
    "SELECT valor FROM nucleo.config WHERE chave = 'modulos_ativos'",
  );
  const valor = rows[0]?.valor;
  return new Set(Array.isArray(valor) ? valor.filter((v) => typeof v === 'string') : []);
}

/**
 * Monta /api/<codigo> para cada módulo. Um módulo desligado responde 404 na hora (a configuração
 * é lida a cada pedido, então ligar e desligar não exige reiniciar a API).
 */
export function montarModulos(registros: RegistroModulo[], ctx: ContextoModulo): Router {
  const rotas = Router();

  rotas.get('/modulos', async (req, res) => {
    const eu = usuarioDa(req);
    const ativos = await lerModulosAtivos(ctx.pool);
    const lista: ModuloAtivo[] = registros
      .filter((m) => ativos.has(m.codigo) && m.perfis.includes(eu.perfil))
      .map(({ codigo, nome, caminho, perfis }) => ({ codigo, nome, caminho, perfis }));
    res.json(lista);
  });

  for (const modulo of registros) {
    const proprias = modulo.rotas(ctx);
    rotas.use(`/${modulo.codigo}`, async (req, res, next) => {
      const ativos = await lerModulosAtivos(ctx.pool);
      if (!ativos.has(modulo.codigo)) {
        res.status(404).json({ erro: 'Módulo desligado.' });
        return;
      }
      proprias(req, res, next);
    });
  }

  return rotas;
}
