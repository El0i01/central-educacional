import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from '../app.js';
import { bancoLimpo, criarUsuario, SEGREDO_TESTE, URL_TESTE } from '../teste/apoio.js';

const PLANILHA =
  'escola_inep;turma;etapa;turno;estudante;data_nascimento;inep_estudante\n' +
  '11000001;2º ano A;2º ano;manhã;Estudante 01;10/05/2018;\n' +
  '11000001;2º ano A;2º ano;manhã;Estudante 02;11/06/2018;\n' +
  '11000001;1º ano A;1º ano;tarde;Estudante 03;01/02/2019;\n' +
  '99999999;1º ano A;1º ano;;Estudante 04;01/02/2019;\n' +
  '11000001;2º ano A;quinto;;Estudante 05;;\n';

describe.skipIf(!URL_TESTE)('Importação de matrículas (integração)', () => {
  let pool: pg.Pool;
  let app: ReturnType<typeof criarApp>;
  let token = '';
  const enviar = (conteudo: string) =>
    request(app)
      .post('/api/importacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'matriculas', arquivoNome: 'matriculas.csv', conteudo });
  const como = (url: string, corpo?: object) =>
    request(app).post(url).set('Authorization', `Bearer ${token}`).send(corpo ?? {});

  beforeAll(async () => {
    pool = await bancoLimpo();
    app = criarApp({ pool, jwtSegredo: SEGREDO_TESTE, jwtValidade: '1h', modulos: [] });
    await criarUsuario(pool, 'cad', 'cadastro');
    await criarUsuario(pool, 'coord', 'coordenacao');
    token = (await request(app).post('/api/auth/login').send({ login: 'cad', senha: 'senha-de-teste-123' })).body.token;
    await pool.query("INSERT INTO rede.ano_letivo VALUES (2026, '2026-02-01', '2026-12-18')");
    await pool.query("INSERT INTO rede.escola (inep, nome) VALUES ('11000001', 'Escola Demonstrativa A')");
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('só o responsável pelos cadastros importa', async () => {
    const t = (await request(app).post('/api/auth/login').send({ login: 'coord', senha: 'senha-de-teste-123' })).body.token;
    const r = await request(app).get('/api/importacoes').set('Authorization', `Bearer ${t}`);
    expect(r.status).toBe(403);
  });

  it('planilha sem coluna obrigatória é recusada dizendo o que falta', async () => {
    const r = await enviar('escola;aluno\nX;Y');
    expect(r.status).toBe(400);
    expect(r.body.erro).toMatch(/turma, etapa/);
  });

  it('prévia aponta problemas por linha; só publica depois de ignorar ou corrigir', async () => {
    const r = await enviar(PLANILHA);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ situacao: 'com_inconsistencias', total: 5, novas: 3, comProblema: 2 });
    const l5 = r.body.linhas.find((l: { numero: number }) => l.numero === 5);
    expect(l5.problemas[0]).toMatch(/INEP 99999999 não cadastrada/);
    const id = r.body.id;

    expect((await como(`/api/importacoes/${id}/publicar`)).status).toBe(409);

    for (const numero of [5, 6]) {
      await request(app)
        .patch(`/api/importacoes/${id}/linhas/${numero}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ignorar: true });
    }
    const pub = await como(`/api/importacoes/${id}/publicar`);
    expect(pub.status).toBe(200);
    expect(pub.body.situacao).toBe('publicado');
    expect(pub.body.resumo).toEqual({ matriculasCriadas: 3, turmasCriadas: 2, estudantesCriados: 3 });

    const turmas = await pool.query("SELECT nome, etapa, turno FROM rede.turma ORDER BY nome");
    expect(turmas.rows).toEqual([
      { nome: '1º ano A', etapa: 'EF1', turno: 'vespertino' },
      { nome: '2º ano A', etapa: 'EF2', turno: 'matutino' },
    ]);
    expect((await como(`/api/importacoes/${id}/publicar`)).status).toBe(409);
  });

  it('reimportar o mesmo arquivo não duplica nada e avisa que já foi publicado', async () => {
    const r = await enviar(PLANILHA);
    expect(r.body).toMatchObject({ novas: 0, jaExistentes: 3 });
    expect(r.body.mesmoArquivoPublicadoEm).not.toBeNull();
    for (const numero of [5, 6]) {
      await request(app).patch(`/api/importacoes/${r.body.id}/linhas/${numero}`).set('Authorization', `Bearer ${token}`).send({ ignorar: true });
    }
    const pub = await como(`/api/importacoes/${r.body.id}/publicar`);
    expect(pub.body.resumo).toEqual({ matriculasCriadas: 0, turmasCriadas: 0, estudantesCriados: 0 });
    const n = await pool.query('SELECT count(*)::int AS n FROM rede.matricula');
    expect(n.rows[0].n).toBe(3);
  });

  it('estudante já matriculado em outra turma no ano vira problema (transferência antes)', async () => {
    const r = await enviar(
      'escola_inep;turma;etapa;estudante;data_nascimento\n11000001;1º ano A;1º ano;Estudante 01;10/05/2018\n',
    );
    expect(r.body.comProblema).toBe(1);
    expect(r.body.linhas[0].problemas[0]).toMatch(/Já matriculado em 2º ano A/);
  });

  it('turma existente com outra etapa vira problema', async () => {
    const r = await enviar('escola_inep;turma;etapa;estudante\n11000001;2º ano A;3º ano;Estudante 09\n');
    expect(r.body.linhas[0].problemas[0]).toMatch(/já existe como 2º ano/);
  });

  it('descartar encerra a importação sem gravar na rede', async () => {
    const r = await enviar('escola_inep;turma;etapa;estudante\n11000001;3º ano A;3º ano;Estudante 10\n');
    expect(r.body.situacao).toBe('pronto');
    const d = await como(`/api/importacoes/${r.body.id}/descartar`);
    expect(d.body.situacao).toBe('descartado');
    expect((await como(`/api/importacoes/${r.body.id}/publicar`)).status).toBe(409);
    const t = await pool.query("SELECT 1 FROM rede.turma WHERE nome = '3º ano A'");
    expect(t.rowCount).toBe(0);
  });
});
