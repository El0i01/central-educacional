# Desenvolvimento

Como trabalhar no repositório: ferramentas, o caminho de cada tela e o roteiro para começar.
Regras de negócio em CLAUDE.md; módulos em [modulos.md](modulos.md); visual em
[design-system.md](design-system.md).

## 1. Ambiente

| Item | Versão / valor |
|---|---|
| Node | 20 (`.nvm`) |
| pnpm | 9.15.9 |
| PostgreSQL | 16, pelo docker compose (porta 5443) |
| API | `pnpm dev:api` → http://localhost:3200 |
| Web | `pnpm dev:web` → http://localhost:5173 (proxy `/api` para a API) |
| Testes | `pnpm test` (pacotes e API; integração usa `TEST_DATABASE_URL`) |

Portas diferentes do Reurb (5442, 3100, 8180) para os dois rodarem juntos.

## 2. Ferramentas do Claude Code no projeto

Configuradas em `.mcp.json` (vale para quem abrir o projeto) e, para a chave do 21st, na
configuração local de cada máquina.

| Ferramenta | Tipo | Para que usamos | Quando |
|---|---|---|---|
| **shadcn** | MCP | Procurar e instalar componentes do registry do shadcn/ui em `packages/ui` | Ao criar um componente que ainda não existe em `@central/ui` |
| **21st** | MCP (HTTP, chave em `API_KEY_21ST`) | Gerar variações de layout e buscar ideias de componentes | Antes de desenhar uma tela nova; o resultado é rascunho (design-system.md, regra 4) |
| **chrome-devtools** | MCP | Abrir a tela no Chrome, emular celular, ler console e rede, medir desempenho | Toda tela, antes de dar por pronta |
| **web-design-guidelines** | Skill | Revisar o código da tela contra regras de acessibilidade, foco, formulário e tipografia | No fim de cada tela e antes de cada commit de interface |
| **Artifact** (documentação) | Página | Regerar a [documentação em HTML](https://claude.ai/artifact/73x3Lgo8UtPmejufbyoPEL) | Sempre que um `.md` de docs/ mudar |

Chave do 21st em máquina nova:

```bash
claude mcp add --transport http 21st https://21st.dev/api/mcp --header "x-api-key: <chave>"
```

Ou `export API_KEY_21ST=<chave>` no `~/.bashrc`, que o `.mcp.json` lê. A chave nunca vai para
o repositório.

## 3. O caminho de cada funcionalidade

Uma funcionalidade = um caso de uso de [funcionalidades.md](funcionalidades.md). Ordem fixa:

1. **Caso de uso.** Escolha o UC (ex.: UC-F16 Enviar à coordenação). Confira se está no módulo
   certo e se o módulo tem a seção preenchida em modulos.md.
2. **Regra pura + teste.** Se há regra, ela vai num `packages/*` com teste Vitest primeiro
   (ex.: `fleo.transicionar`).
3. **Migração.** Tabela nova ou coluna nova: `database/NNN_<schema>_<assunto>.sql`.
4. **API + teste.** Rota em `apps/api/src/modulos/<m>/rotas.ts`, escopo de `packages/escopo`,
   teste de integração com supertest (perfil certo passa, perfil errado recebe 403, versão velha
   recebe 409).
5. **Tela.** Só com `@central/ui`. Faltou componente? MCP `shadcn` para a base, tokens, README.
   Quer ideia de layout? MCP `21st`, tratado como rascunho.
6. **Conferência no navegador** (MCP `chrome-devtools`):
   - 360 × 740 (celular) e 1280 × 800, tema claro e escuro;
   - console sem erro nem aviso;
   - aba Rede: nenhuma chamada repetida, nenhum dado de outra escola na resposta;
   - teclado: Tab percorre tudo com foco visível, Enter/Espaço acionam.
7. **Revisão de interface.** Skill `web-design-guidelines` nos arquivos da tela; corrigir o que
   apontar.
8. **Documentação.** Atualize o `.md` afetado e regere a página HTML
   (`python3 -I docs/html/gerar_doc.py . /tmp/documentacao-central.html`, depois publicar).
9. **Commit** pequeno, em português, citando o UC: `FLEO: enviar à coordenação (UC-F16)`.

## 4. Começando: Fase 0

Ordem sugerida, cada item um commit:

| # | Tarefa | Pronto quando | Situação |
|---|---|---|---|
| 0.1 | `git init`, primeiro commit com docs/ e CLAUDE.md | Repositório criado | ✔ feito |
| 0.2 | **Alinhar o rascunho de código** com a documentação: schemas por módulo (`nucleo`, `acesso`, `rede`, `fleo`), os 6 perfis, pastas `plataforma/` e `modulos/` na API | `pnpm test` passa | ✔ feito |
| 0.3 | `pnpm install`, lint, Vitest rodando em todos os pacotes | `pnpm lint && pnpm test` verdes | ✔ feito |
| 0.4 | `infra/docker-compose.yml` (db, migrar, api, web) | `docker compose up` sobe tudo | ✔ feito |
| 0.5 | Migração `001_nucleo` (histórico, config com `modulos_ativos`, job) | Migra do zero | ✔ feito |
| 0.6 | `packages/ui`: shadcn iniciado no monorepo, `tema.css` gerado de `tokens.json`, os 8 componentes do design system | Página de exemplo no `apps/web` mostra os 8 nos dois temas | a fazer |
| 0.7 | `apps/web`: Vite + React Router + Tailwind 4, casca com `MenuLateral` montado pelo registro de módulos | Menu muda ao ligar/desligar a FLEO na config | a fazer |
| 0.8 | Revisão com `web-design-guidelines` e conferência com `chrome-devtools` da casca | Sem apontamentos | a fazer |

Depois da Fase 0, a Fase 1 (plataforma: acesso, rede, importação) segue o CLAUDE.md, seção 10.

### shadcn no monorepo

`packages/ui` tem o `components.json` com os aliases do pacote (`@central/ui/componentes`,
`@central/ui/lib/utils`); `apps/web` importa de `@central/ui`. Componentes do registry entram
por `pnpm dlx shadcn@latest add <nome>` dentro de `packages/ui` (ou pelo MCP `shadcn`) e são
logo renomeados e ligados aos tokens. Confira a documentação de monorepo do shadcn na versão
instalada antes do primeiro `init`.
