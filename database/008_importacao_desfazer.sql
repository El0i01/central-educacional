-- M09 Importação: desfazer a última publicação (UC-M05).
-- Cada linha publicada guarda o que a publicação fez na rede, para poder voltar atrás.

ALTER TABLE importacao.linha ADD COLUMN resultado jsonb;
-- { matriculaId, criada, situacaoAntes, turmaId, turmaCriada, estudanteId, estudanteCriado }

ALTER TABLE importacao.lote DROP CONSTRAINT lote_situacao_check;
ALTER TABLE importacao.lote ADD CONSTRAINT lote_situacao_check
  CHECK (situacao IN ('com_inconsistencias', 'pronto', 'publicado', 'descartado', 'desfeito'));
ALTER TABLE importacao.lote ADD COLUMN desfeito_por integer REFERENCES acesso.usuario (id);
ALTER TABLE importacao.lote ADD COLUMN desfeito_em timestamptz;
ALTER TABLE importacao.lote ADD COLUMN desfeito_motivo text;

-- Consulta do histórico de acessos (UC-A07) por usuário e por data.
CREATE INDEX historico_usuario ON nucleo.historico (usuario_id, criado_em DESC);
CREATE INDEX acesso_nominal_criado ON nucleo.acesso_nominal (criado_em DESC);
