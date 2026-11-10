-- M02 Rede: comparação de nomes sem acento e sem diferença de maiúsculas (UC-R08, importação).
-- Sem a extensão unaccent: o servidor de produção pode não ter extensões além do básico.

CREATE FUNCTION rede.sem_acento(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT lower(regexp_replace(trim(translate(t,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')), '\s+', ' ', 'g'))
$$;

CREATE INDEX estudante_nome_busca ON rede.estudante (rede.sem_acento(nome), data_nascimento);
