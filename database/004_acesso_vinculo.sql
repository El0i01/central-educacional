-- M01 Acesso: vínculos do usuário com escolas (coordenação, equipe pedagógica).
-- Depois de 003 porque aponta para rede.escola. Programas entram com o módulo M06.

CREATE TABLE acesso.usuario_escola (
  usuario_id integer NOT NULL REFERENCES acesso.usuario (id),
  escola_id  integer NOT NULL REFERENCES rede.escola (id),
  PRIMARY KEY (usuario_id, escola_id)
);
