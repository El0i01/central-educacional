import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from './app.js';
import { MODULOS } from './modulos/index.js';
import { bancoLimpo, criarUsuario, SEGREDO_TESTE, URL_TESTE } from './teste/apoio.js';

describe.skipIf(!URL_TESTE)('API: plataforma (integração)', () => {
  let pool: pg.Pool;
  let app: ReturnType<typeof criarApp>;

  beforeAll(async () => {
    pool = await bancoLimpo();
    app = criarApp({ pool, jwtSegredo: SEGREDO_TESTE, jwtValidade: '1h', modulos: MODULOS });
    await criarUsuario(pool, 'ana.prof', 'professor');
    await criarUsuario(pool, 'gestor', 'gestor');
    await criarUsuario(pool, 'cadastro', 'cadastro');
    await criarUsuario(pool, 'nova', 'professor', 'provisoria-1234', { trocarSenha: true });
  });

  afterAll(async () => {
    await pool?.end();
  });

  async function entrar(login: string, senha = 'senha-de-teste-123'): Promise<string> {
    const r = await request(app).post('/api/auth/login').send({ login, senha });
    expect(r.status).toBe(200);
    return r.body.token as string;
  }

  it('saúde responde sem login', async () => {
    const r = await request(app).get('/api/saude');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ api: 'ok', banco: 'ok' });
  });

  it('toda outra rota exige login', async () => {
    expect((await request(app).get('/api/eu')).status).toBe(401);
    expect((await request(app).get('/api/modulos')).status).toBe(401);
    expect((await request(app).get('/api/fleo/qualquer')).status).toBe(401);
  });

  it('login devolve token e usuário sem a senha', async () => {
    const r = await request(app)
      .post('/api/auth/login')
      .send({ login: ' Ana.Prof ', senha: 'senha-de-teste-123' });
    expect(r.status).toBe(200);
    expect(r.body.usuario).toMatchObject({ login: 'ana.prof', perfil: 'professor' });
    expect(Object.keys(r.body.usuario).sort()).toEqual(
      ['ativo', 'id', 'login', 'nome', 'perfil', 'trocarSenha'].sort(),
    );
    expect(JSON.stringify(r.body)).not.toMatch(/\$2[aby]\$/); // nenhum hash bcrypt
    const eu = await request(app).get('/api/eu').set('Authorization', `Bearer ${r.body.token}`);
    expect(eu.body.login).toBe('ana.prof');
  });

  it('senha errada é 401 e não revela se o login existe', async () => {
    const a = await request(app).post('/api/auth/login').send({ login: 'ana.prof', senha: 'errada-errada' });
    const b = await request(app).post('/api/auth/login').send({ login: 'nao.existe', senha: 'errada-errada' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.erro).toBe(b.body.erro);
  });

  it('5 tentativas erradas bloqueiam, inclusive a senha certa', async () => {
    await criarUsuario(pool, 'bloq', 'professor');
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ login: 'bloq', senha: 'errada-errada' });
    }
    const r = await request(app).post('/api/auth/login').send({ login: 'bloq', senha: 'senha-de-teste-123' });
    expect(r.status).toBe(429);
    const { rows } = await pool.query(
      "SELECT acao FROM nucleo.historico WHERE modulo = 'acesso' AND acao = 'bloqueio'",
    );
    expect(rows.length).toBe(1);
  });

  it('senha provisória só deixa ver /eu e trocar a senha', async () => {
    const token = await entrar('nova', 'provisoria-1234');
    const bloqueada = await request(app).get('/api/modulos').set('Authorization', `Bearer ${token}`);
    expect(bloqueada.status).toBe(403);
    expect(bloqueada.body.codigo).toBe('trocar_senha');
    const curta = await request(app)
      .post('/api/eu/senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: 'provisoria-1234', senhaNova: 'curta' });
    expect(curta.status).toBe(400);
    const troca = await request(app)
      .post('/api/eu/senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: 'provisoria-1234', senhaNova: 'uma-senha-nova-boa' });
    expect(troca.status).toBe(200);
    const liberada = await request(app).get('/api/modulos').set('Authorization', `Bearer ${token}`);
    expect(liberada.status).toBe(200);
  });

  it('o menu mostra só módulos ligados e permitidos ao perfil', async () => {
    const prof = await entrar('ana.prof');
    const cad = await entrar('cadastro');
    const doProf = await request(app).get('/api/modulos').set('Authorization', `Bearer ${prof}`);
    expect(doProf.body.map((m: { codigo: string }) => m.codigo)).toEqual(['fleo']);
    const doCadastro = await request(app).get('/api/modulos').set('Authorization', `Bearer ${cad}`);
    expect(doCadastro.body).toEqual([]);
  });

  it('módulo desligado some do menu e responde 404 sem reiniciar', async () => {
    const token = await entrar('gestor');
    await pool.query("UPDATE nucleo.config SET valor = '[]' WHERE chave = 'modulos_ativos'");
    try {
      const menu = await request(app).get('/api/modulos').set('Authorization', `Bearer ${token}`);
      expect(menu.body).toEqual([]);
      const rota = await request(app).get('/api/fleo/qualquer').set('Authorization', `Bearer ${token}`);
      expect(rota.status).toBe(404);
      expect(rota.body.erro).toBe('Módulo desligado.');
    } finally {
      await pool.query("UPDATE nucleo.config SET valor = '[\"fleo\"]' WHERE chave = 'modulos_ativos'");
    }
  });

  it('as migrações criam um schema por módulo e a versão publicada do instrumento é imutável', async () => {
    const { rows } = await pool.query<{ nspname: string }>(
      "SELECT nspname FROM pg_namespace WHERE nspname IN ('nucleo','acesso','rede','fleo') ORDER BY 1",
    );
    expect(rows.map((r) => r.nspname)).toEqual(['acesso', 'fleo', 'nucleo', 'rede']);

    const inst = await pool.query<{ id: number }>(
      "INSERT INTO fleo.instrumento (codigo, nome) VALUES ('FLEO', 'Ficha') RETURNING id",
    );
    const versao = await pool.query<{ id: number }>(
      `INSERT INTO fleo.instrumento_versao (instrumento_id, versao, definicao, publicada_em)
       VALUES ($1, 1, '{"itens":[]}', now()) RETURNING id`,
      [inst.rows[0]!.id],
    );
    await expect(
      pool.query(`UPDATE fleo.instrumento_versao SET definicao = '{"itens":[1]}' WHERE id = $1`, [
        versao.rows[0]!.id,
      ]),
    ).rejects.toThrow(/já publicada/);
  });
});
