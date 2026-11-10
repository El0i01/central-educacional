// Dados fictícios para desenvolvimento (CLAUDE.md, seção 8: nunca dado real de criança).
//   DATABASE_URL=... pnpm semear
// Reexecutável: se já semeado, não faz nada. Recusa em produção.

import bcrypt from 'bcryptjs';
import pg from 'pg';

// Mesma senha para todos os usuários de teste. Só para desenvolvimento local.
const SENHA_TESTE = '1234567890';
const ANO = 2026;

const USUARIOS = [
  { login: 'prof.ana', nome: 'Ana Professora (teste)', perfil: 'professor' },
  { login: 'prof.pedro', nome: 'Pedro Professor (teste)', perfil: 'professor' },
  { login: 'coord.marina', nome: 'Marina Coordenadora (teste)', perfil: 'coordenacao' },
  { login: 'equipe.semed', nome: 'Equipe Pedagógica (teste)', perfil: 'equipe_pedagogica' },
  { login: 'gestor.semed', nome: 'Gestão SEMED (teste)', perfil: 'gestor' },
  { login: 'cadastro.semed', nome: 'Cadastro SEMED (teste)', perfil: 'cadastro' },
] as const;

const ESCOLAS = [
  {
    inep: '11000001', nome: 'Escola Demonstrativa A', zona: 'urbana',
    turmas: [
      { nome: '1º ano A', etapa: 'EF1', turno: 'matutino', professor: 'prof.ana', estudantes: 8 },
      { nome: '2º ano A', etapa: 'EF2', turno: 'matutino', professor: 'prof.ana', estudantes: 10 },
      { nome: '2º ano B', etapa: 'EF2', turno: 'vespertino', professor: null, estudantes: 9 },
    ],
  },
  {
    inep: '11000002', nome: 'Escola Demonstrativa B', zona: 'rural',
    turmas: [{ nome: '2º ano', etapa: 'EF2', turno: 'matutino', professor: 'prof.pedro', estudantes: 7 }],
  },
] as const;

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida.');
  if (process.env.NODE_ENV === 'production') throw new Error('Seeds de desenvolvimento não rodam em produção.');

  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    const ja = await c.query("SELECT 1 FROM acesso.usuario WHERE login = 'prof.ana'");
    if (ja.rowCount) {
      console.log('Dados fictícios já existem. Nada a fazer.');
      return;
    }
    await c.query('BEGIN');
    const hash = await bcrypt.hash(SENHA_TESTE, 12);
    const ids: Record<string, number> = {};
    for (const u of USUARIOS) {
      const r = await c.query<{ id: number }>(
        'INSERT INTO acesso.usuario (login, nome, perfil, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id',
        [u.login, u.nome, u.perfil, hash],
      );
      ids[u.login] = r.rows[0]!.id;
    }
    await c.query(
      `INSERT INTO rede.ano_letivo (ano, inicio, fim) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [ANO, `${ANO}-02-02`, `${ANO}-12-18`],
    );

    let n = 0;
    for (const e of ESCOLAS) {
      const escola = await c.query<{ id: number }>(
        'INSERT INTO rede.escola (inep, nome, zona) VALUES ($1, $2, $3) RETURNING id',
        [e.inep, e.nome, e.zona],
      );
      const escolaId = escola.rows[0]!.id;
      if (e.inep === '11000001') {
        await c.query('INSERT INTO acesso.usuario_escola VALUES ($1, $2)', [ids['coord.marina'], escolaId]);
      }
      for (const t of e.turmas) {
        const turma = await c.query<{ id: number }>(
          'INSERT INTO rede.turma (escola_id, ano_letivo, nome, etapa, turno) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [escolaId, ANO, t.nome, t.etapa, t.turno],
        );
        const turmaId = turma.rows[0]!.id;
        if (t.professor) {
          await c.query('INSERT INTO rede.turma_professor (turma_id, usuario_id) VALUES ($1, $2)', [turmaId, ids[t.professor]]);
        }
        const idade = t.etapa === 'EF1' ? 6 : 7;
        for (let i = 0; i < t.estudantes; i++) {
          n++;
          const nasc = `${ANO - idade - 1}-${String((n % 12) + 1).padStart(2, '0')}-${String((n % 27) + 1).padStart(2, '0')}`;
          const est = await c.query<{ id: number }>(
            'INSERT INTO rede.estudante (nome, data_nascimento) VALUES ($1, $2) RETURNING id',
            [`Estudante ${String(n).padStart(2, '0')}`, nasc],
          );
          await c.query('INSERT INTO rede.matricula (estudante_id, turma_id) VALUES ($1, $2)', [est.rows[0]!.id, turmaId]);
        }
      }
    }
    await c.query('COMMIT');
    console.log(`Dados fictícios criados: ${USUARIOS.length} usuários, ${ESCOLAS.length} escolas, ${n} estudantes.`);
    console.log(`Senha de todos os usuários de teste: ${SENHA_TESTE}`);
  } catch (erro) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw erro;
  } finally {
    await c.end();
  }
}

principal().catch((erro: Error) => {
  console.error(erro.message);
  process.exit(1);
});
