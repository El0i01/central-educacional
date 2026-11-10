import { describe, expect, it } from 'vitest';
import { calcularPendentes, hashSql, listarMigracoes, PASTA_MIGRACOES } from './migrar.js';

describe('migrações', () => {
  it('os arquivos da pasta seguem o padrão e não repetem número', () => {
    const lista = listarMigracoes(PASTA_MIGRACOES);
    expect(lista.length).toBeGreaterThan(0);
    expect(lista[0]!.nome).toMatch(/^001_/);
  });

  it('recusa migração editada depois de aplicada', () => {
    const m = { nome: '001_a.sql', sql: 'select 1', hash: hashSql('select 1') };
    expect(() => calcularPendentes([m], [{ nome: m.nome, hash: 'outro' }])).toThrow(/editada/);
  });

  it('devolve só as pendentes, em ordem', () => {
    const a = { nome: '001_a.sql', sql: 'a', hash: hashSql('a') };
    const b = { nome: '002_b.sql', sql: 'b', hash: hashSql('b') };
    expect(calcularPendentes([a, b], [{ nome: a.nome, hash: a.hash }]).map((m) => m.nome)).toEqual([
      '002_b.sql',
    ]);
  });
});
