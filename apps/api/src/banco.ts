import pg from 'pg';

/** O que os repositórios precisam do banco. pg.Pool e pg.PoolClient servem. */
export interface Banco {
  query<T extends pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<pg.QueryResult<T>>;
}

export function criarPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl });
}

/** Executa `fn` numa transação; desfaz tudo se lançar. */
export async function emTransacao<T>(
  pool: pg.Pool,
  fn: (c: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}
