-- M03 FLEO Digital: instrumento versionado, aplicações (períodos) e fichas.
-- CLAUDE.md, seção 4; docs/modulos.md, "Módulo M03". Lê só a plataforma (rede, acesso).

CREATE SCHEMA fleo;

CREATE TABLE fleo.instrumento (
  id     serial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,          -- 'FLEO'
  nome   text NOT NULL
);

-- A definição (eixos, itens, opções) fica congelada ao publicar. Mudou a ficha da SEMED: versão nova.
CREATE TABLE fleo.instrumento_versao (
  id             serial PRIMARY KEY,
  instrumento_id integer NOT NULL REFERENCES fleo.instrumento (id),
  versao         integer NOT NULL CHECK (versao > 0),
  -- Ficha de exemplo: a tela avisa que não é o instrumento oficial.
  ilustrativa    boolean NOT NULL DEFAULT false,
  definicao      jsonb NOT NULL,
  publicada_em   timestamptz,
  UNIQUE (instrumento_id, versao)
);

CREATE FUNCTION fleo.versao_imutavel() RETURNS trigger AS $$
BEGIN
  IF OLD.publicada_em IS NOT NULL AND (
       NEW.definicao IS DISTINCT FROM OLD.definicao
    OR NEW.versao <> OLD.versao
    OR NEW.instrumento_id <> OLD.instrumento_id
    OR NEW.publicada_em IS DISTINCT FROM OLD.publicada_em) THEN
    RAISE EXCEPTION 'Versão % do instrumento já publicada: crie uma versão nova.', OLD.versao;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER versao_imutavel BEFORE UPDATE ON fleo.instrumento_versao
  FOR EACH ROW EXECUTE FUNCTION fleo.versao_imutavel();

-- Aplicação: um período da rede (ex.: "FLEO diagnóstica 2026 — 1º bimestre").
CREATE TABLE fleo.aplicacao (
  id         serial PRIMARY KEY,
  versao_id  integer NOT NULL REFERENCES fleo.instrumento_versao (id),
  ano_letivo integer NOT NULL REFERENCES rede.ano_letivo (ano),
  nome       text NOT NULL,
  inicio     date NOT NULL,
  fim        date NOT NULL CHECK (fim >= inicio),
  -- Encerrar antes do fim ou reabrir é decisão da equipe pedagógica.
  aberta     boolean NOT NULL DEFAULT true,
  -- Etapas que fazem esta aplicação (ex.: {EF1,EF2}). Vazio = todas.
  etapas     text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE fleo.ficha (
  id             serial PRIMARY KEY,
  matricula_id   integer NOT NULL REFERENCES rede.matricula (id),
  aplicacao_id   integer NOT NULL REFERENCES fleo.aplicacao (id),
  situacao       text NOT NULL DEFAULT 'rascunho'
                 CHECK (situacao IN ('rascunho', 'enviada', 'devolvida', 'validada')),
  presenca       text NOT NULL DEFAULT 'presente'
                 CHECK (presenca IN ('presente', 'ausente', 'nao_avaliado')),
  respostas      jsonb NOT NULL DEFAULT '{}',
  observacao     text NOT NULL DEFAULT '' CHECK (length(observacao) <= 3000),
  -- Orientação da coordenação na devolução, ou justificativa da reabertura.
  orientacao     text,
  -- Concorrência: quem salva manda a versão lida; diferente = 409.
  versao         integer NOT NULL DEFAULT 1,
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  atualizado_por integer REFERENCES acesso.usuario (id),
  UNIQUE (matricula_id, aplicacao_id)
);
CREATE INDEX ficha_aplicacao ON fleo.ficha (aplicacao_id, situacao);

-- Abre as fichas de uma aplicação: uma por matrícula ativa nas etapas dela.
-- Reexecutável: matrícula que já tem ficha fica como está. Devolve quantas abriu.
CREATE FUNCTION fleo.abrir_fichas(p_aplicacao integer) RETURNS integer AS $$
DECLARE
  n integer;
BEGIN
  INSERT INTO fleo.ficha (matricula_id, aplicacao_id)
  SELECT m.id, a.id
    FROM fleo.aplicacao a
    JOIN rede.turma t ON t.ano_letivo = a.ano_letivo
                     AND (cardinality(a.etapas) = 0 OR t.etapa = ANY (a.etapas))
    JOIN rede.matricula m ON m.turma_id = t.id AND m.situacao = 'ativa'
   WHERE a.id = p_aplicacao
  ON CONFLICT (matricula_id, aplicacao_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$ LANGUAGE plpgsql;

-- Visões publicadas (contrato de saída do módulo; outros módulos só leem por aqui).

-- Andamento: fichas por situação, por turma e aplicação.
CREATE VIEW fleo.v_andamento_turma AS
SELECT f.aplicacao_id, t.escola_id, t.id AS turma_id,
       count(*)                                           AS fichas,
       count(*) FILTER (WHERE f.situacao = 'rascunho')    AS rascunho,
       count(*) FILTER (WHERE f.situacao = 'enviada')     AS enviadas,
       count(*) FILTER (WHERE f.situacao = 'devolvida')   AS devolvidas,
       count(*) FILTER (WHERE f.situacao = 'validada')    AS validadas
  FROM fleo.ficha f
  JOIN rede.matricula m ON m.id = f.matricula_id
  JOIN rede.turma t ON t.id = m.turma_id
 GROUP BY f.aplicacao_id, t.escola_id, t.id;

-- Resultado: contagem por item e opção, só fichas validadas de estudantes acompanhados.
CREATE VIEW fleo.v_resultado_item AS
SELECT f.aplicacao_id, t.escola_id, t.id AS turma_id,
       r.key AS item_id, r.value #>> '{}' AS opcao, count(*) AS quantidade
  FROM fleo.ficha f
  JOIN rede.matricula m ON m.id = f.matricula_id
  JOIN rede.turma t ON t.id = m.turma_id
  CROSS JOIN LATERAL jsonb_each(f.respostas) r
 WHERE f.situacao = 'validada' AND f.presenca = 'presente'
 GROUP BY f.aplicacao_id, t.escola_id, t.id, r.key, r.value #>> '{}';
