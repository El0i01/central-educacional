# Central Educacional — SEMED Itapuã do Oeste/RO

Este arquivo é o ponto de partida do projeto no Claude Code. Leia inteiro antes de escrever código,
junto com:

- [docs/modulos.md](docs/modulos.md): plataforma, módulos, fronteiras (**leia antes de criar qualquer módulo**)
- [docs/funcionalidades.md](docs/funcionalidades.md): casos de uso por módulo (códigos UC-xx)
- [docs/diagramas.md](docs/diagramas.md): contexto, módulos, implantação, dados, fluxos
- [docs/design-system.md](docs/design-system.md): tokens, componentes `@central/ui` sobre shadcn, tema, regras de tela
- [docs/desenvolvimento.md](docs/desenvolvimento.md): ambiente, ferramentas (MCP shadcn, 21st, chrome-devtools; skill web-design-guidelines), caminho de cada funcionalidade, roteiro da Fase 0
- [Design system Central Educacional SEMED](https://claude.ai/artifact/6qpvWFRzVb5NLUJjQHWyzE): tokens, tipografia, componentes e regras de escrita (fonte da verdade do visual)
- [Documentação em HTML](https://claude.ai/artifact/73x3Lgo8UtPmejufbyoPEL): esta especificação, a modularização, as funcionalidades e os diagramas desenhados, numa página só para análise. Gerada destes arquivos por `docs/html/gerar_doc.py`; regere e republique a cada mudança nos `.md`

## 1. O que é

Central da Secretaria Municipal de Educação para reunir avaliações, indicadores, programas de
alfabetização e relatórios da rede municipal. Professores, coordenação escolar e secretaria no
mesmo acompanhamento.

- **Crescimento horizontal:** uma plataforma comum (acesso, rede escolar, importação, relatórios,
  núcleo) e módulos independentes encaixados lado a lado. Detalhe em docs/modulos.md.
- **Primeiro módulo: FLEO Digital** (Ficha de Leitura, Escrita e Oralidade), preenchida pelo
  professor no computador ou no celular, sem papel.
- **Módulos seguintes**, na ordem que a secretaria decidir: Avaliações (SAERO, SAEB, ProAlfa,
  fluência leitora), Indicadores e metas (IDEB, Indicador Criança Alfabetizada), Programas e
  formações (PAIC, CNCA, ProLEEI), Intervenções pedagógicas.
- Origem: proposta e protótipo feitos no Codex (Next.js/NestJS/Expo), **reescritos na stack do
  Reurb** (seção 5). Do protótipo vieram as regras da FLEO e a direção visual azul.

## 2. Regras invioláveis

1. **Módulo depende só da plataforma.** Nunca de outro módulo. Entre módulos, só leitura opcional
   por visão publicada `v_*`. Um módulo só escreve no próprio schema.
2. **Instrumento versionado e imutável.** A versão publicada da ficha não muda; mudança gera versão
   nova. Cada ficha guarda a versão usada.
3. **Só validado conta.** Resultados e consolidados usam apenas fichas validadas de estudantes
   acompanhados. Rascunho, enviada e devolvida nunca entram.
4. **Ausente não é dificuldade.** Ausente e não avaliado não recebem resultado de aprendizagem;
   campo vazio não é tratado como dificuldade.
5. **Devolver e reabrir exigem texto.** Devolução leva orientação; reabertura de validada leva
   justificativa. Tudo vai para o histórico.
6. **Tudo fica no histórico.** Quem, quando, o quê e por quê, para toda mudança de situação,
   edição, login e acesso a dado nominal de estudante.
7. **Escalas diferentes não se misturam.** Nada de média entre SAEB, SAERO e FLEO. Agregado não
   vira individual. Oficial e cálculo local ficam separados.
8. **Escopo no servidor.** Permissão por perfil e vínculo é conferida na API, sempre, a partir de
   `packages/escopo`. A tela só esconde; quem barra é a API.
9. **Concorrência explícita.** Toda escrita manda a `versao` lida; diferente = 409 e a tela pede
   para recarregar. Nada de "último a salvar vence" em silêncio.
10. **Sincronizado não é validado.** No celular, a tela distingue salvo no aparelho, sincronizado,
    enviado à coordenação e validado.

## 3. Perfis

| Perfil | Enxerga | Escreve |
|---|---|---|
| `professor` | Suas turmas | Fichas das suas turmas |
| `coordenacao` | Escolas vinculadas | Revisão das fichas da escola |
| `equipe_pedagogica` | Escolas e programas autorizados | Instrumentos, aplicações, programas |
| `gestor` | Rede, só agregado (sem nome de estudante) | Metas |
| `cadastro` | Cadastros da rede, sem dado pedagógico | Escolas, turmas, matrículas, vínculos, importações |
| `admin` | Configuração técnica, sem dado pedagógico por padrão | Usuários, módulos ativos |

- Toda rota exige login (JWT) e confere o perfil. Rotas públicas: só `/api/auth/login` e `/api/saude`.
- Senhas com bcrypt; 5 tentativas erradas bloqueiam por 15 min; senha provisória obriga troca.
- Dados de crianças (LGPD): mínimo necessário; abrir dado nominal fora da própria turma grava
  registro de acesso. Gestor e painéis públicos só veem agregado.
- Segredos só em variáveis de ambiente. Nunca commite `.env`, dumps, planilhas com nome real.

## 4. FLEO — fluxo

```
rascunho → enviada → validada
              ↓   ↑       ↓ (reabrir + justificativa)
            devolvida ←───┘
          (+ orientação)
```

Regras em `packages/fleo` (funções puras, com testes): `podePreencher`, `validarRespostas`,
`respostasParaGravar`, `transicionar`, `distribuicao`. A API só aplica o resultado.

**A ficha atual é ilustrativa.** O instrumento oficial da SEMED (eixos, itens, níveis e critérios)
ainda não foi entregue. Não invente itens "oficiais": use a ficha de exemplo marcada
`ilustrativo = true` até a secretaria fornecer a oficial.

## 5. Arquitetura (mesma stack do Reurb)

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces (sem Turborepo), TypeScript em tudo |
| Web | React 19 + Vite + Tailwind 4 + React Router, lucide-react, fontes `@fontsource` |
| Celular | A mesma web como PWA, empacotada em APK com Capacitor (`apps/mobile`); uso sem internet com IndexedDB cifrado e fila de envio, como o Social do Reurb |
| API | Node 20 + Express 5 + `pg` (SQL direto, sem ORM), JWT + bcrypt |
| Banco | PostgreSQL 16, **um schema por módulo** (`nucleo`, `acesso`, `rede`, `importacao`, `fleo`, …) |
| Fila | Tabela `nucleo.job` (`SELECT … FOR UPDATE SKIP LOCKED`). Sem Redis |
| Arquivos | Volume em disco, nome pelo SHA-256, entregues pela API após conferir acesso |
| Testes | Vitest nos pacotes e na API (integração com `TEST_DATABASE_URL`) |
| Interface | `packages/ui` (`@central/ui`): componentes do design system sobre primitivos shadcn/ui (Radix), tema ligado aos tokens; docs/design-system.md |
| Ferramentas | `.mcp.json`: shadcn, 21st, chrome-devtools; skill web-design-guidelines na revisão de tela; docs/desenvolvimento.md |
| Deploy | docker compose local; produção como stack no Portainer, imagens `central/*:<hash curto>` levadas por `docker save \| ssh docker load`; Caddy na frente |

Organização de pastas e regras de import: docs/modulos.md, seção 6.

## 6. Modelo de dados

Diagramas ER em docs/diagramas.md, seção 5. Princípios:

- Hierarquia: Secretaria → Escola (INEP) → Ano letivo → Turma → Matrícula ← Estudante.
- Estudante tem cadastro único e matrículas ao longo dos anos; transferência preserva histórico.
- FLEO: Instrumento → Versão → Aplicação → Ficha (uma por matrícula e aplicação).
- Migrações em `database/NNN_<schema>_<assunto>.sql`, numeradas, aplicadas uma vez, **nunca
  editadas depois de aplicadas** (o runner confere o hash).

## 7. Visual

Design system: [Central Educacional SEMED](https://claude.ai/artifact/6qpvWFRzVb5NLUJjQHWyzE) (tokens claro e escuro,
Lexend + Source Sans 3 + IBM Plex Mono, componentes `Botao`, `SeloSituacao`, `SeloSincronia`, `Campo`,
`EscalaOpcoes`, `Aviso`, `Progresso`, `CartaoTurma`). Na Fase 0 os tokens viram `packages/ui`
(tema do Tailwind 4 + componentes React). Base: o azul `#2b5598` da logo, interface limpa, telas
pensadas primeiro para o celular do professor. Situação sempre com palavra e ícone, nunca só cor.
Alvos de toque de pelo menos 44 px.

## 8. Convenções

- Domínio em português (`ficha`, `turma`, `aplicacao`), sem acento em identificadores. Código e
  comentários em português.
- Regras de negócio têm teste antes de qualquer tela que dependa delas.
- Seeds usam nomes claramente fictícios ("Estudante 01", "Escola Demonstrativa A"). Nunca dado real
  de criança no repositório.
- Commits pequenos, um assunto por commit, mensagem em português.
- Fase concluída = testes passando, migrações aplicando do zero, `docker compose up` subindo tudo.

## 9. Infraestrutura

- Desenvolvimento: `infra/docker-compose.yml` (PostgreSQL na porta 5443, API 3200, web 8280, para
  não colidir com o Reurb).
- Produção: a definir (seção 11). O servidor do Reurb (192.168.1.22, 1 CPU, 8 GB) pode receber a
  stack `central` no mesmo Portainer, com banco próprio.

## 10. Fases

Uma fase por vez. Ao terminar, parar e mostrar o que foi feito.

**Fase 0 — Esqueleto**
Monorepo, lint, Vitest, docker compose, runner de migrações, schema `nucleo` (histórico, config,
job), `packages/ui` com os tokens do design system.

**Fase 1 — Plataforma**
M01 Acesso (login, perfis, vínculos, usuários), M02 Rede (escolas, turmas, estudantes,
matrículas, atribuição docente), M09 Importação de planilha de matrículas, `packages/escopo` com
testes, registro de módulos e menu montado pelos módulos ativos.

**Fase 2 — FLEO na web** *(piloto)*
Instrumento e versão, aplicação, preenchimento por estudante, rascunho, envio, revisão (validar,
devolver, reabrir), histórico, resultados validados, exportação.

**Fase 3 — FLEO no celular** *(piloto)*
PWA + APK Capacitor, uso sem internet, fila de envio, conflitos, selos de situação; preenchimento
por item da turma; evolução entre aplicações.

**Fase 4 em diante — módulos novos**, um por vez, cada um com sua seção preenchida em
docs/modulos.md antes do código: Avaliações, Indicadores e metas, Programas e formações,
Intervenções, integrações.

## 11. Decisões em aberto

- Instrumento oficial da FLEO (eixos, itens, níveis, critérios) e calendário das aplicações.
- Escolas e equipe do piloto; responsáveis pelos cadastros.
- Fonte das matrículas: planilha do sistema de gestão escolar? exportação do Censo Escolar?
- Servidor de produção: mesmo do Reurb ou outro; domínio (ex.: `central.itapuadooeste.ro.gov.br`).
- Autenticação institucional (gov.br ou provedor da prefeitura) para depois do piloto.
- Arquivos disponíveis de SAERO, SAEB, IDEB e ICA para os módulos seguintes.
