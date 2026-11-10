-- M02 Rede escolar: escolas, anos letivos, turmas, estudantes, matrículas, atribuição docente.
-- docs/modulos.md, seção 4 (chaves estáveis: INEP da escola, estudante único na rede).

CREATE SCHEMA rede;

CREATE TABLE rede.escola (
  id     serial PRIMARY KEY,
  -- Código INEP: liga às fontes externas (Censo Escolar, SAEB, SAERO).
  inep   text UNIQUE CHECK (inep ~ '^\d{8}$'),
  nome   text NOT NULL,
  zona   text NOT NULL DEFAULT 'urbana' CHECK (zona IN ('urbana', 'rural')),
  ativa  boolean NOT NULL DEFAULT true
);

CREATE TABLE rede.ano_letivo (
  ano    integer PRIMARY KEY CHECK (ano BETWEEN 2020 AND 2100),
  inicio date NOT NULL,
  fim    date NOT NULL CHECK (fim > inicio)
);

CREATE TABLE rede.turma (
  id         serial PRIMARY KEY,
  escola_id  integer NOT NULL REFERENCES rede.escola (id),
  ano_letivo integer NOT NULL REFERENCES rede.ano_letivo (ano),
  nome       text NOT NULL,
  -- Etapa: 'EI4', 'EI5', 'EF1' (1º ano) ... 'EF9'.
  etapa      text NOT NULL CHECK (etapa ~ '^(EI[45]|EF[1-9])$'),
  turno      text CHECK (turno IN ('matutino', 'vespertino', 'noturno', 'integral')),
  UNIQUE (escola_id, ano_letivo, nome)
);
CREATE INDEX turma_escola ON rede.turma (escola_id, ano_letivo);

-- Professor da turma (regente e apoio). Usuário é da plataforma (M01): a rede pode ler.
CREATE TABLE rede.turma_professor (
  turma_id   integer NOT NULL REFERENCES rede.turma (id),
  usuario_id integer NOT NULL REFERENCES acesso.usuario (id),
  papel      text NOT NULL DEFAULT 'regente' CHECK (papel IN ('regente', 'apoio')),
  PRIMARY KEY (turma_id, usuario_id)
);

CREATE TABLE rede.estudante (
  id              serial PRIMARY KEY,
  nome            text NOT NULL,
  data_nascimento date,
  -- ID do estudante no Censo Escolar (INEP), quando houver.
  codigo_inep     text UNIQUE CHECK (codigo_inep ~ '^\d{12}$')
);

CREATE TABLE rede.matricula (
  id           serial PRIMARY KEY,
  estudante_id integer NOT NULL REFERENCES rede.estudante (id),
  turma_id     integer NOT NULL REFERENCES rede.turma (id),
  situacao     text NOT NULL DEFAULT 'ativa'
               CHECK (situacao IN ('ativa', 'transferida', 'abandono', 'concluida')),
  UNIQUE (estudante_id, turma_id)
);
CREATE INDEX matricula_turma ON rede.matricula (turma_id);
