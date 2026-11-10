import type { Saude } from '@central/tipos';
import express, { type ErrorRequestHandler } from 'express';
import type pg from 'pg';
import { autenticar } from './plataforma/acesso/middleware.js';
import { rotasGestaoUsuarios } from './plataforma/acesso/gestao.js';
import { rotasEu, rotasLogin } from './plataforma/acesso/rotas.js';
import { repositorioUsuarios } from './plataforma/acesso/usuarios.js';
import { montarModulos, type RegistroModulo } from './plataforma/modulos.js';
import { rotasImportacao } from './plataforma/importacao/rotas.js';
import { rotasRede } from './plataforma/rede/rotas.js';

export interface Dependencias {
  pool: pg.Pool;
  jwtSegredo: string;
  jwtValidade: string;
  /** Módulos da central (apps/api/src/modulos). Os testes passam a lista que precisam. */
  modulos: RegistroModulo[];
  /** Origens que podem chamar a API de outra origem (APK). Vazio = só a mesma origem. */
  corsOrigens?: string[];
}

export function criarApp(deps: Dependencias): express.Express {
  const app = express();
  app.disable('x-powered-by');

  // CORS só para as origens configuradas (o APK). Nunca "*": dado de criança não pode ser lido
  // por página de origem qualquer.
  const origens = new Set(deps.corsOrigens ?? []);
  if (origens.size > 0) {
    app.use('/api', (req, res, next) => {
      const origem = req.headers.origin;
      if (origem && origens.has(origem)) {
        res.setHeader('Access-Control-Allow-Origin', origem);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Max-Age', '600');
        if (req.method === 'OPTIONS') {
          res.status(204).end();
          return;
        }
      }
      next();
    });
  }

  // Corpo JSON até 256 KB; a importação de planilha tem limite próprio (5 MB) na rota dela.
  const json = express.json({ limit: '256kb' });
  app.use((req, res, next) => (req.path.startsWith('/api/importacoes') ? next() : json(req, res, next)));

  const usuarios = repositorioUsuarios(deps.pool);
  const acesso = { pool: deps.pool, usuarios, jwtSegredo: deps.jwtSegredo, jwtValidade: deps.jwtValidade };

  // --- Rotas públicas: só estas duas (CLAUDE.md, seção 3). ---
  app.get('/api/saude', async (_req, res) => {
    let banco: Saude['banco'] = 'ok';
    try {
      await deps.pool.query('SELECT 1');
    } catch {
      banco = 'indisponivel';
    }
    const corpo: Saude = { api: 'ok', banco };
    res.status(banco === 'ok' ? 200 : 503).json(corpo);
  });
  app.use('/api/auth', rotasLogin(acesso));

  // --- Daqui para baixo, toda rota exige login. ---
  app.use('/api', autenticar(usuarios, deps.jwtSegredo));
  app.use('/api', rotasEu(acesso));
  app.use('/api', rotasGestaoUsuarios({ pool: deps.pool }));
  app.use('/api', rotasRede({ pool: deps.pool }));
  app.use('/api', rotasImportacao({ pool: deps.pool }));
  app.use('/api', montarModulos(deps.modulos, { pool: deps.pool }));

  app.use('/api', (_req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
  });

  const tratarErro: ErrorRequestHandler = (erro, _req, res, _next) => {
    if ((erro as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ erro: 'JSON inválido.' });
      return;
    }
    if ((erro as { type?: string }).type === 'entity.too.large') {
      res.status(413).json({ erro: 'Pedido grande demais.' });
      return;
    }
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno.' });
  };
  app.use(tratarErro);

  return app;
}
