// Runner de migrações.
//
// Regras (CLAUDE.md, seção 7):
// - arquivos `NNN_descricao.sql` nesta pasta, aplicados em ordem numérica;
// - cada migração roda numa transação e fica registrada em nucleo.migracao com o hash SHA-256;
// - migração já aplicada nunca é editada: se o hash mudar, o runner recusa e não aplica nada.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';

export interface Migracao {
  nome: string;
  hash: string;
  sql: string;
}

export interface MigracaoAplicada {
  nome: string;
  hash: string;
}

const PADRAO_ARQUIVO = /^(\d{3})_[a-z0-9_]+\.sql$/;

// Chave fixa do pg_advisory_lock: impede dois runners ao mesmo tempo.
const CHAVE_TRAVA = 2026110301;

export function hashSql(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export function listarMigracoes(pasta: string): Migracao[] {
  const arquivos = readdirSync(pasta).filter((nome) => nome.endsWith('.sql'));

  const invalidos = arquivos.filter((nome) => !PADRAO_ARQUIVO.test(nome));
  if (invalidos.length > 0) {
    throw new Error(`Nome de migração fora do padrão NNN_descricao.sql: ${invalidos.join(', ')}`);
  }

  const numeros = new Map<string, string>();
  for (const nome of arquivos) {
    const numero = nome.slice(0, 3);
    const outro = numeros.get(numero);
    if (outro) throw new Error(`Número de migração repetido: ${outro} e ${nome}`);
    numeros.set(numero, nome);
  }

  return arquivos.sort().map((nome) => {
    const sql = readFileSync(join(pasta, nome), 'utf8');
    return { nome, hash: hashSql(sql), sql };
  });
}

/**
 * Confere as migrações já aplicadas contra os arquivos e devolve as pendentes, em ordem.
 * Recusa se um arquivo aplicado sumiu ou mudou.
 */
export function calcularPendentes(arquivos: Migracao[], aplicadas: MigracaoAplicada[]): Migracao[] {
  const porNome = new Map(arquivos.map((m) => [m.nome, m]));

  for (const aplicada of aplicadas) {
    const arquivo = porNome.get(aplicada.nome);
    if (!arquivo) {
      throw new Error(`Migração ${aplicada.nome} está aplicada no banco mas o arquivo não existe.`);
    }
    if (arquivo.hash !== aplicada.hash) {
      throw new Error(
        `Migração ${aplicada.nome} foi editada depois de aplicada. Crie uma nova migração em vez de editar.`,
      );
    }
  }

  const nomesAplicados = new Set(aplicadas.map((a) => a.nome));
  const pendentes = arquivos.filter((m) => !nomesAplicados.has(m.nome));

  // Uma pendente com número menor que a última aplicada indica arquivo inserido fora de ordem.
  const ultimaAplicada = [...nomesAplicados].sort().at(-1);
  const foraDeOrdem = pendentes.find((m) => ultimaAplicada && m.nome < ultimaAplicada);
  if (foraDeOrdem) {
    throw new Error(
      `Migração ${foraDeOrdem.nome} é anterior à última aplicada (${ultimaAplicada}). Renumere-a.`,
    );
  }

  return pendentes;
}

export async function migrar(
  cliente: pg.ClientBase,
  arquivos: Migracao[],
  log: (msg: string) => void = console.log,
): Promise<string[]> {
  await cliente.query('SELECT pg_advisory_lock($1)', [CHAVE_TRAVA]);
  try {
    await cliente.query('CREATE SCHEMA IF NOT EXISTS nucleo');
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS nucleo.migracao (
        nome        text PRIMARY KEY,
        hash        text NOT NULL,
        aplicada_em timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await cliente.query<MigracaoAplicada>(
      'SELECT nome, hash FROM nucleo.migracao ORDER BY nome',
    );
    const pendentes = calcularPendentes(arquivos, rows);

    if (pendentes.length === 0) {
      log('Nenhuma migração pendente.');
      return [];
    }

    for (const m of pendentes) {
      log(`Aplicando ${m.nome}...`);
      await cliente.query('BEGIN');
      try {
        await cliente.query(m.sql);
        await cliente.query('INSERT INTO nucleo.migracao (nome, hash) VALUES ($1, $2)', [
          m.nome,
          m.hash,
        ]);
        await cliente.query('COMMIT');
      } catch (erro) {
        await cliente.query('ROLLBACK');
        throw new Error(`Falha em ${m.nome}: ${(erro as Error).message}`, { cause: erro });
      }
    }

    log(`${pendentes.length} migração(ões) aplicada(s).`);
    return pendentes.map((m) => m.nome);
  } finally {
    await cliente.query('SELECT pg_advisory_unlock($1)', [CHAVE_TRAVA]);
  }
}

export const PASTA_MIGRACOES = dirname(fileURLToPath(import.meta.url));

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida.');

  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    await migrar(cliente, listarMigracoes(PASTA_MIGRACOES));
  } finally {
    await cliente.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((erro: Error) => {
    console.error(erro.message);
    process.exit(1);
  });
}
