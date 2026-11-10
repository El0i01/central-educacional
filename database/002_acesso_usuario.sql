-- M01 Acesso: usuários e perfis. Vínculos com escola ficam em 004 (dependem da rede).
-- CLAUDE.md, seção 3; docs/modulos.md, seção 5.

CREATE SCHEMA acesso;

CREATE TABLE acesso.usuario (
  id                      serial PRIMARY KEY,
  login                   text NOT NULL UNIQUE CHECK (login = lower(login) AND login ~ '^[a-z0-9._-]{3,40}$'),
  nome                    text NOT NULL,
  perfil                  text NOT NULL CHECK (perfil IN
                            ('professor', 'coordenacao', 'equipe_pedagogica', 'gestor', 'cadastro', 'admin')),
  senha_hash              text NOT NULL,
  ativo                   boolean NOT NULL DEFAULT true,
  trocar_senha            boolean NOT NULL DEFAULT false,
  senha_provisoria_expira timestamptz,
  falhas_login            integer NOT NULL DEFAULT 0,
  bloqueado_ate           timestamptz,
  criado_em               timestamptz NOT NULL DEFAULT now()
);
