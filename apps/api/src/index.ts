import { criarApp } from './app.js';
import { criarPool } from './banco.js';
import { lerConfig } from './config.js';
import { MODULOS } from './modulos/index.js';

const config = lerConfig(process.env);
const pool = criarPool(config.databaseUrl);

const app = criarApp({
  pool,
  jwtSegredo: config.jwtSegredo,
  jwtValidade: config.jwtValidade,
  modulos: MODULOS,
  corsOrigens: config.corsOrigens,
});

const servidor = app.listen(config.porta, () => {
  console.log(`API da Central Educacional na porta ${config.porta}`);
});

function encerrar(): void {
  servidor.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);
