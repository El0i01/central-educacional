import type pg from 'pg';
import { Router } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from '../app.js';
import { bancoLimpo, criarUsuario, SEGREDO_TESTE, URL_TESTE } from '../teste/apoio.js';

describe.skipIf(!URL_TESTE)('Plataforma: usuários e rede escolar (integração)', () => {
  let pool: pg.Pool;
  let app: ReturnType<typeof criarApp>;
  const tokens: Record<string, string> = {};
  const ids: Record<string, number> = {};

  const como = (quem: string) => ({
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${tokens[quem]}`),
    post: (url: string, corpo?: object) =>
      request(app).post(url).set('Authorization', `Bearer ${tokens[quem]}`).send(corpo ?? {}),
    patch: (url: string, corpo: object) =>
      request(app).patch(url).set('Authorization', `Bearer ${tokens[quem]}`).send(corpo),
    put: (url: string, corpo: object) =>
      request(app).put(url).set('Authorization', `Bearer ${tokens[quem]}`).send(corpo),
  });

  beforeAll(async () => {
    pool = await bancoLimpo();
    app = criarApp({ pool, jwtSegredo: SEGREDO_TESTE, jwtValidade: '1h', modulos: [] });
    for (const [login, perfil] of [
      ['admin', 'admin'],
      ['cad', 'cadastro'],
      ['coord', 'coordenacao'],
      ['prof', 'professor'],
      ['prof2', 'professor'],
      ['gestor', 'gestor'],
      ['equipe', 'equipe_pedagogica'],
    ] as const) {
      ids[login] = await criarUsuario(pool, login, perfil);
      const r = await request(app).post('/api/auth/login').send({ login, senha: 'senha-de-teste-123' });
      tokens[login] = r.body.token;
    }
    await pool.query("INSERT INTO rede.ano_letivo VALUES (2026, '2026-02-01', '2026-12-18')");
  });

  afterAll(async () => {
    await pool?.end();
  });

  // --- Usuários ---

  it('cadastro cria professor com senha provisória que obriga a troca', async () => {
    const r = await como('cad').post('/api/usuarios', { login: 'Nova.Prof', nome: 'Nova Professora', perfil: 'professor' });
    expect(r.status).toBe(201);
    expect(r.body.usuario).toMatchObject({ login: 'nova.prof', perfil: 'professor', trocarSenha: true });
    expect(r.body.senhaProvisoria).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    const login = await request(app).post('/api/auth/login').send({ login: 'nova.prof', senha: r.body.senhaProvisoria });
    expect(login.body.usuario.trocarSenha).toBe(true);
  });

  it('cadastro não cria nem altera perfis da secretaria; admin pode', async () => {
    expect((await como('cad').post('/api/usuarios', { login: 'x.gestor', nome: 'X', perfil: 'gestor' })).status).toBe(403);
    expect((await como('cad').patch(`/api/usuarios/${ids.gestor}`, { nome: 'Outro' })).status).toBe(403);
    expect((await como('cad').patch(`/api/usuarios/${ids.prof}`, { perfil: 'admin' })).status).toBe(403);
    expect((await como('admin').post('/api/usuarios', { login: 'novo.gestor', nome: 'G', perfil: 'gestor' })).status).toBe(201);
  });

  it('login repetido e login fora do padrão são recusados', async () => {
    expect((await como('admin').post('/api/usuarios', { login: 'prof', nome: 'P', perfil: 'professor' })).status).toBe(409);
    expect((await como('admin').post('/api/usuarios', { login: 'a b', nome: 'P', perfil: 'professor' })).status).toBe(400);
  });

  it('professor, coordenação e gestor não gerenciam usuários', async () => {
    for (const quem of ['prof', 'coord', 'gestor']) {
      expect((await como(quem).get('/api/usuarios')).status).toBe(403);
    }
  });

  it('ninguém se desativa nem muda o próprio perfil', async () => {
    expect((await como('admin').patch(`/api/usuarios/${ids.admin}`, { ativo: false })).status).toBe(400);
    expect((await como('admin').patch(`/api/usuarios/${ids.admin}`, { perfil: 'gestor' })).status).toBe(400);
  });

  it('senha provisória nova desbloqueia a conta', async () => {
    await pool.query(`UPDATE acesso.usuario SET bloqueado_ate = now() + interval '1 hour' WHERE id = $1`, [ids.prof2]);
    const r = await como('cad').post(`/api/usuarios/${ids.prof2}/senha-provisoria`);
    expect(r.status).toBe(200);
    expect(r.body.usuario.bloqueado).toBe(false);
    const ok = await request(app).post('/api/auth/login').send({ login: 'prof2', senha: r.body.senhaProvisoria });
    expect(ok.status).toBe(200);
  });

  // --- Rede ---

  it('cadastro monta a rede; INEP e turma repetidos são recusados', async () => {
    const a = await como('cad').post('/api/escolas', { nome: 'Escola Demonstrativa A', inep: '1100 0001' });
    expect(a.status).toBe(201);
    expect(a.body.inep).toBe('11000001');
    ids.escolaA = a.body.id;
    ids.escolaB = (await como('cad').post('/api/escolas', { nome: 'Escola Demonstrativa B', zona: 'rural' })).body.id;
    expect((await como('cad').post('/api/escolas', { nome: 'Outra', inep: '11000001' })).status).toBe(409);
    expect((await como('admin').post('/api/escolas', { nome: 'Do admin' })).status).toBe(403);

    const t = await como('cad').post('/api/turmas', { escolaId: ids.escolaA, nome: '2º ano A', etapa: 'EF2', turno: 'matutino' });
    expect(t.status).toBe(201);
    ids.turmaA = t.body.id;
    ids.turmaA2 = (await como('cad').post('/api/turmas', { escolaId: ids.escolaA, nome: '1º ano A', etapa: 'EF1' })).body.id;
    ids.turmaB = (await como('cad').post('/api/turmas', { escolaId: ids.escolaB, nome: '2º ano B', etapa: 'EF2' })).body.id;
    expect((await como('cad').post('/api/turmas', { escolaId: ids.escolaA, nome: '2º ano A', etapa: 'EF2' })).status).toBe(409);
    expect((await como('cad').post('/api/turmas', { escolaId: ids.escolaA, nome: 'X', etapa: 'EF2', anoLetivo: 2030 })).status).toBe(400);
  });

  it('coordenação vinculada atribui professor só na própria escola', async () => {
    await como('admin').patch(`/api/usuarios/${ids.coord}`, { escolas: [ids.escolaA] });
    const ok = await como('coord').put(`/api/turmas/${ids.turmaA}/professores`, {
      professores: [{ usuarioId: ids.prof, papel: 'regente' }],
    });
    expect(ok.status).toBe(200);
    const fora = await como('coord').put(`/api/turmas/${ids.turmaB}/professores`, {
      professores: [{ usuarioId: ids.prof }],
    });
    expect(fora.status).toBe(404);
    const naoProf = await como('coord').put(`/api/turmas/${ids.turmaA}/professores`, {
      professores: [{ usuarioId: ids.gestor }],
    });
    expect(naoProf.status).toBe(400);
  });

  it('matrícula: duplicado provável pede confirmação; matrícula ativa dupla no ano é recusada', async () => {
    const m1 = await como('cad').post(`/api/turmas/${ids.turmaA}/matriculas`, { nome: 'Estudante Fictício Um', dataNascimento: '2018-05-10' });
    expect(m1.status).toBe(201);
    const dup = await como('cad').post(`/api/turmas/${ids.turmaB}/matriculas`, { nome: 'ESTUDANTE ficticio  um', dataNascimento: '2018-05-10' });
    expect(dup.status).toBe(409);
    expect(dup.body.codigo).toBe('possivel_duplicado');
    expect(dup.body.duplicados[0].turmaAtual).toContain('2º ano A');
    const mesma = await como('cad').post(`/api/turmas/${ids.turmaB}/matriculas`, { estudanteId: m1.body.estudanteId });
    expect(mesma.status).toBe(409);
    expect(mesma.body.erro).toMatch(/transferência/);
    await como('cad').patch(`/api/matriculas/${m1.body.matriculaId}`, { situacao: 'transferida' });
    expect((await como('cad').post(`/api/turmas/${ids.turmaB}/matriculas`, { estudanteId: m1.body.estudanteId })).status).toBe(201);
    const outra = await como('cad').post(`/api/turmas/${ids.turmaA}/matriculas`, {
      nome: 'Estudante Fictício Um', dataNascimento: '2018-05-10', confirmarNovo: true,
    });
    expect(outra.status).toBe(201);
  });

  it('cada perfil enxerga só o seu escopo', async () => {
    const turmas = async (quem: string) => ((await como(quem).get('/api/turmas')).body as { id: number }[]).map((t) => t.id).sort();
    expect(await turmas('prof')).toEqual([ids.turmaA]);
    expect(await turmas('coord')).toEqual([ids.turmaA, ids.turmaA2].sort());
    expect(await turmas('gestor')).toHaveLength(3);
    expect(await turmas('equipe')).toHaveLength(3);
    expect(await turmas('admin')).toEqual([]);
    expect((await como('prof').get('/api/escolas')).body.map((e: { id: number }) => e.id)).toEqual([ids.escolaA]);
    expect((await como('prof').get(`/api/turmas/${ids.turmaB}`)).status).toBe(404);
    expect((await como('prof').get(`/api/turmas/${ids.turmaA2}`)).status).toBe(404);
  });

  it('gestor não vê nome de estudante; coordenação vê e deixa registro de acesso', async () => {
    const g = await como('gestor').get(`/api/turmas/${ids.turmaA}`);
    expect(g.status).toBe(200);
    expect(g.body.matriculas).toBeNull();
    const antes = await pool.query('SELECT count(*)::int AS n FROM nucleo.acesso_nominal');
    const c = await como('coord').get(`/api/turmas/${ids.turmaA}`);
    expect(c.body.matriculas.length).toBeGreaterThan(0);
    const depois = await pool.query('SELECT count(*)::int AS n FROM nucleo.acesso_nominal');
    expect(depois.rows[0].n).toBe(antes.rows[0].n + c.body.matriculas.length);
    // O professor da turma não gera registro.
    await como('prof').get(`/api/turmas/${ids.turmaA}`);
    const prof = await pool.query('SELECT count(*)::int AS n FROM nucleo.acesso_nominal WHERE usuario_id = $1', [ids.prof]);
    expect(prof.rows[0].n).toBe(0);
  });

  // --- Transferência (UC-R07) ---

  it('transferência: origem fica como transferida, destino ativa, trajetória completa', async () => {
    const m = await como('cad').post(`/api/turmas/${ids.turmaA2}/matriculas`, { nome: 'Estudante Fictício Transferido', dataNascimento: '2019-03-03' });
    expect(m.status).toBe(201);
    const url = `/api/matriculas/${m.body.matriculaId}/transferir`;
    expect((await como('coord').post(url, { turmaId: ids.turmaB })).status).toBe(403);
    expect((await como('cad').post(url, {})).status).toBe(400);
    expect((await como('cad').post(url, { turmaId: ids.turmaA2 })).status).toBe(400);

    const t = await como('cad').post(url, { turmaId: ids.turmaB, motivo: 'Mudança de endereço' });
    expect(t.status).toBe(201);
    const situacoes = await pool.query<{ turma_id: number; situacao: string }>(
      'SELECT turma_id, situacao FROM rede.matricula WHERE estudante_id = $1 ORDER BY id', [m.body.estudanteId],
    );
    expect(situacoes.rows).toEqual([
      { turma_id: ids.turmaA2, situacao: 'transferida' },
      { turma_id: ids.turmaB, situacao: 'ativa' },
    ]);
    expect((await como('cad').post(url, { turmaId: ids.turmaA })).status).toBe(409);

    const h = await pool.query("SELECT acao, motivo FROM nucleo.historico WHERE acao LIKE 'transferencia_%' ORDER BY id");
    expect(h.rows).toEqual([
      { acao: 'transferencia_saida', motivo: 'Mudança de endereço' },
      { acao: 'transferencia_entrada', motivo: 'Mudança de endereço' },
    ]);
    const traj = await como('cad').get(`/api/estudantes/${m.body.estudanteId}/trajetoria`);
    expect(traj.body.map((x: { situacao: string }) => x.situacao)).toEqual(['ativa', 'transferida']);
    expect((await como('gestor').get(`/api/estudantes/${m.body.estudanteId}/trajetoria`)).status).toBe(403);
  });

  it('transferência só dentro do mesmo ano letivo', async () => {
    await pool.query("INSERT INTO rede.ano_letivo VALUES (2027, '2027-02-01', '2027-12-17')");
    const t27 = await como('cad').post('/api/turmas', { escolaId: ids.escolaB, nome: '3º ano B', etapa: 'EF3', anoLetivo: 2027 });
    expect(t27.status).toBe(201);
    const m = await como('cad').post(`/api/turmas/${ids.turmaA2}/matriculas`, { nome: 'Estudante Fictício Ano', dataNascimento: '2019-04-04' });
    const r = await como('cad').post(`/api/matriculas/${m.body.matriculaId}/transferir`, { turmaId: t27.body.id });
    expect(r.status).toBe(400);
    expect(r.body.erro).toMatch(/outro ano letivo/);
  });

  // --- Histórico de acessos (UC-A07) ---

  it('admin consulta entradas e acesso nominal, sem nome de estudante; os outros não', async () => {
    expect((await como('gestor').get('/api/acessos')).status).toBe(403);
    expect((await como('cad').get('/api/acessos')).status).toBe(403);

    const e = await como('admin').get('/api/acessos?tipo=entradas&usuario=coord');
    expect(e.status).toBe(200);
    expect(e.body.itens.length).toBeGreaterThan(0);
    expect(e.body.itens.every((x: { login: string; acao: string }) => x.login === 'coord' && x.acao === 'login')).toBe(true);

    const n = await como('admin').get('/api/acessos?tipo=nominal');
    expect(n.body.itens[0]).toMatchObject({ login: 'coord', modulo: 'rede.turma' });
    expect(n.body.itens[0].estudantes).toBeGreaterThan(0);
    expect(JSON.stringify(n.body)).not.toMatch(/Estudante Fictício/);

    const a = await como('admin').get('/api/acessos?tipo=alteracoes');
    expect(a.body.itens.some((x: { acao: string }) => x.acao === 'transferencia_saida')).toBe(true);
    expect(a.body.itens.some((x: { acao: string }) => x.acao === 'login')).toBe(false);
    expect((await como('admin').get('/api/acessos?tipo=x')).status).toBe(400);
    expect((await como('admin').get('/api/acessos?de=ontem')).status).toBe(400);
  });
});

describe.skipIf(!URL_TESTE)('Plataforma: ligar e desligar módulos (integração)', () => {
  let pool: pg.Pool;
  let app: ReturnType<typeof criarApp>;
  const tokens: Record<string, string> = {};
  const com = (quem: string) => ({ Authorization: `Bearer ${tokens[quem]}` });

  beforeAll(async () => {
    pool = await bancoLimpo();
    app = criarApp({
      pool, jwtSegredo: SEGREDO_TESTE, jwtValidade: '1h',
      modulos: [{
        codigo: 'fleo', nome: 'FLEO Digital', schema: 'fleo', caminho: '/fleo', perfis: ['professor'],
        rotas: () => Router().get('/ping', (_req, res) => { res.json({ ok: true }); }),
      }],
    });
    for (const [login, perfil] of [['admin', 'admin'], ['cad', 'cadastro'], ['prof', 'professor']] as const) {
      await criarUsuario(pool, login, perfil);
      tokens[login] = (await request(app).post('/api/auth/login').send({ login, senha: 'senha-de-teste-123' })).body.token;
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('só o admin liga e desliga; desligar exige motivo e vale no próximo pedido', async () => {
    const lista = await request(app).get('/api/config/modulos').set(com('admin'));
    expect(lista.body).toEqual([{ codigo: 'fleo', nome: 'FLEO Digital', caminho: '/fleo', perfis: ['professor'], ativo: true }]);
    expect((await request(app).get('/api/config/modulos').set(com('cad'))).status).toBe(403);
    expect((await request(app).put('/api/config/modulos/fleo').set(com('cad')).send({ ativo: false, motivo: 'x' })).status).toBe(403);
    expect((await request(app).put('/api/config/modulos/fleo').set(com('admin')).send({ ativo: false })).status).toBe(400);
    expect((await request(app).put('/api/config/modulos/outro').set(com('admin')).send({ ativo: true })).status).toBe(404);
    expect((await request(app).get('/api/fleo/ping').set(com('prof'))).status).toBe(200);

    const off = await request(app).put('/api/config/modulos/fleo').set(com('admin')).send({ ativo: false, motivo: 'Manutenção' });
    expect(off.body.ativo).toBe(false);
    expect((await request(app).get('/api/fleo/ping').set(com('prof'))).status).toBe(404);
    expect((await request(app).get('/api/modulos').set(com('prof'))).body).toEqual([]);

    await request(app).put('/api/config/modulos/fleo').set(com('admin')).send({ ativo: true });
    expect((await request(app).get('/api/fleo/ping').set(com('prof'))).status).toBe(200);
    const h = await pool.query("SELECT acao, motivo FROM nucleo.historico WHERE modulo = 'nucleo' ORDER BY id");
    expect(h.rows).toEqual([
      { acao: 'modulo_desligado', motivo: 'Manutenção' },
      { acao: 'modulo_ligado', motivo: null },
    ]);
  });
});
