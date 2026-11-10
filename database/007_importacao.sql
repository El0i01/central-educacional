-- M09 Importação: lotes de arquivo, linhas e inconsistências (UC-M01 a M05).
-- A publicação chama o serviço do módulo de destino; este schema guarda só o lote.

CREATE SCHEMA importacao;

CREATE TABLE importacao.lote (
  id            serial PRIMARY KEY,
  tipo          text NOT NULL CHECK (tipo IN ('matriculas')),
  arquivo_nome  text NOT NULL,
  arquivo_hash  text NOT NULL,           -- SHA-256 do conteúdo
  ano_letivo    integer NOT NULL,
  situacao      text NOT NULL CHECK (situacao IN ('com_inconsistencias', 'pronto', 'publicado', 'descartado')),
  resumo        jsonb,                   -- contagens da publicação
  criado_por    integer NOT NULL REFERENCES acesso.usuario (id),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  publicado_por integer REFERENCES acesso.usuario (id),
  publicado_em  timestamptz
);
CREATE INDEX lote_criado ON importacao.lote (criado_em DESC);

CREATE TABLE importacao.linha (
  lote_id   integer NOT NULL REFERENCES importacao.lote (id) ON DELETE CASCADE,
  numero    integer NOT NULL,            -- linha na planilha (cabeçalho = 1)
  dados     jsonb NOT NULL,
  situacao  text NOT NULL CHECK (situacao IN ('nova', 'ja_existe', 'problema')),
  problemas text[] NOT NULL DEFAULT '{}',
  ignorar   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (lote_id, numero)
);
