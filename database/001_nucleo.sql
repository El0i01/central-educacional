-- Núcleo da plataforma: histórico, configuração e fila de jobs.
-- CLAUDE.md, seções 2 e 5; docs/modulos.md, seção 2.
-- O schema nucleo já existe: o runner cria (guarda nucleo.migracao).

-- Toda mudança grava quem, quando, o quê e por quê.
-- usuario_id sem FK de propósito: o núcleo não depende de nenhum módulo (acesso vem depois).
CREATE TABLE nucleo.historico (
  id          bigserial PRIMARY KEY,
  modulo      text NOT NULL,           -- 'acesso', 'rede', 'fleo'...
  entidade    text NOT NULL,           -- 'usuario', 'ficha'...
  entidade_id integer NOT NULL,
  acao        text NOT NULL,
  motivo      text,
  dados       jsonb,
  usuario_id  integer,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historico_entidade ON nucleo.historico (modulo, entidade, entidade_id, criado_em DESC);

-- Registro de acesso a dado nominal de estudante (LGPD).
CREATE TABLE nucleo.acesso_nominal (
  id           bigserial PRIMARY KEY,
  usuario_id   integer NOT NULL,
  estudante_id integer NOT NULL,
  contexto     text NOT NULL,          -- 'fleo.ficha', 'rede.matricula'...
  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- Configuração em chave/valor. modulos_ativos liga e desliga módulos (docs/modulos.md, regra 3).
CREATE TABLE nucleo.config (
  chave         text PRIMARY KEY,
  valor         jsonb NOT NULL,
  descricao     text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por integer
);
INSERT INTO nucleo.config (chave, valor, descricao) VALUES
  ('modulos_ativos', '["fleo"]', 'Módulos ligados na central (a plataforma está sempre ligada).'),
  ('ano_letivo_corrente', '2026', 'Ano letivo usado por padrão nas telas e importações.');

-- Fila de jobs no próprio PostgreSQL (SELECT ... FOR UPDATE SKIP LOCKED). Sem Redis.
CREATE TABLE nucleo.job (
  id           bigserial PRIMARY KEY,
  tipo         text NOT NULL,          -- 'importacao.analisar', 'relatorio.exportar'...
  dados        jsonb NOT NULL DEFAULT '{}',
  situacao     text NOT NULL DEFAULT 'pendente'
               CHECK (situacao IN ('pendente', 'executando', 'concluido', 'falhou')),
  tentativas   integer NOT NULL DEFAULT 0,
  erro         text,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  iniciado_em  timestamptz,
  concluido_em timestamptz
);
CREATE INDEX job_pendente ON nucleo.job (criado_em) WHERE situacao = 'pendente';
