// Registro de módulos: a API se monta a partir dos módulos ligados (docs/modulos.md, seção 1).
// A plataforma não importa nada de modulos/: recebe a lista de registros em criarApp.

import type { CodigoModulo, ModuloAtivo, ModuloConfig, Perfil } from '@central/tipos';
import { Router } from 'express';
import type pg from 'pg';
import { emTransacao } from '../banco.js';
import { ErroHttp, param, rota, texto } from '../http.js';
import { exigir } from './acesso/escopo.js';
import { usuarioDa } from './acesso/middleware.js';
import { registrarHistorico } from './nucleo/historico.js';

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

  // UC-A08: o admin liga e desliga módulos. Vale no próximo pedido, sem reiniciar a API.
  // Desligar não apaga nada: o schema do módulo fica intacto e volta igual ao religar.
  rotas.get(
    '/config/modulos',
    exigir('config.gerir'),
    rota(async (_req, res) => {
      const ativos = await lerModulosAtivos(ctx.pool);
      const lista: ModuloConfig[] = registros.map(({ codigo, nome, caminho, perfis }) => ({
        codigo, nome, caminho, perfis, ativo: ativos.has(codigo),
      }));
      res.json(lista);
    }),
  );

  rotas.put(
    '/config/modulos/:codigo',
    exigir('config.gerir'),
    rota(async (req, res) => {
      const eu = usuarioDa(req);
      const codigo = param(req, 'codigo');
      const modulo = registros.find((m) => m.codigo === codigo);
      if (!modulo) throw new ErroHttp(404, 'Módulo não encontrado.');
      const ativo = req.body?.ativo;
      if (typeof ativo !== 'boolean') throw new ErroHttp(400, 'Informe se o módulo fica ligado ou desligado.');
      const motivo = texto(req.body?.motivo);
      if (!ativo && !motivo) throw new ErroHttp(400, 'Diga por que o módulo está sendo desligado.');

      await emTransacao(ctx.pool, async (c) => {
        const { rows } = await c.query<{ valor: unknown }>(
          "SELECT valor FROM nucleo.config WHERE chave = 'modulos_ativos' FOR UPDATE",
        );
        const atual = new Set(Array.isArray(rows[0]?.valor) ? (rows[0]!.valor as string[]) : []);
        if (atual.has(codigo) === ativo) return;
        if (ativo) atual.add(codigo);
        else atual.delete(codigo);
        await c.query(
          `UPDATE nucleo.config SET valor = $1, atualizado_em = now(), atualizado_por = $2 WHERE chave = 'modulos_ativos'`,
          [JSON.stringify([...atual].sort()), eu.id],
        );
        await registrarHistorico(c, {
          modulo: 'nucleo', entidade: 'config', entidadeId: 0,
          acao: ativo ? 'modulo_ligado' : 'modulo_desligado', motivo, dados: { modulo: codigo }, usuarioId: eu.id,
        });
      });
      const resposta: ModuloConfig = {
        codigo: modulo.codigo, nome: modulo.nome, caminho: modulo.caminho, perfis: modulo.perfis, ativo,
      };
      res.json(resposta);
    }),
  );

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
