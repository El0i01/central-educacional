# Design system no código

O visual da central tem uma fonte da verdade e um espelho:

- **Fonte da verdade:** [Design system Central Educacional SEMED](https://claude.ai/artifact/6qpvWFRzVb5NLUJjQHWyzE)
  (tokens, componentes com prévia ao vivo, regras de escrita).
- **Espelho no repositório:** `docs/design-system/` (tokens.json, README, `components/`). Mudou
  no artifact, copie para cá no mesmo commit.
- **Implementação:** `packages/ui`, feito na Fase 0 a partir deste documento. As telas da web e
  do APK só usam `@central/ui`; nenhuma tela define cor, fonte ou raio próprios.

Todos os componentes abaixo estão desenhados ao vivo na
[documentação em HTML](https://claude.ai/artifact/73x3Lgo8UtPmejufbyoPEL), seção Design system.

<!-- vitrine -->

## 1. Tokens

Nomes e valores em `docs/design-system/tokens.json`. Resumo:

| Grupo | Tokens | Regra |
|---|---|---|
| Superfícies | `fundo`, `superficie`, `superficie-2` | Página, painel, cabeçalho de tabela |
| Texto | `tinta`, `tinta-suave` | Principal e apoio; 5,8:1 ou mais nos dois temas |
| Marca | `semed`, `semed-escuro`, `semed-claro`, `sobre-semed` | Ação, títulos, seleção, texto sobre azul |
| Bordas | `linha` (decorativa), `borda-controle` (campos, 3:1) | Controle nunca só com `linha` |
| Situação | `rascunho-*`, `enviada-*`, `devolvida-*`, `validada-*` (fundo + tinta) | Sempre com palavra e ícone |
| Espaço | `espaco-1` 4 · `espaco-2` 8 · `espaco-3` 12 · `espaco-4` 16 · `espaco-6` 24 · `espaco-8` 32 | |
| Raio | `raio-sm` 4 · `raio-md` 8 · `raio-lg` 12 · `raio-pilula` | |
| Tamanho | `alvo-toque` 44 px · `coluna-leitura` 72ch · `menu-lateral` 248 px | |
| Fontes | `titulo` Lexend · `texto` Source Sans 3 · `mono` IBM Plex Mono | No APK, via `@fontsource` (sem internet) |

## 2. Componentes e base shadcn

Os componentes da central são feitos **sobre os primitivos do shadcn/ui** (Radix + Tailwind),
copiados para `packages/ui` e restilizados com os tokens acima. O shadcn dá acessibilidade e
teclado prontos; a central dá nome em português, texto, cores e regras.

| Componente (`@central/ui`) | Base shadcn | Variantes / props | Onde aparece |
|---|---|---|---|
| `Botao` | `button` (+ `asChild` para link) | `primario` = default · `secundario` = outline · `discreto` = ghost · `perigo` = destructive outline; `href`, `ocupado`, `largo` | Toda tela |
| `SeloSituacao` | `badge` | `rascunho`, `enviada`, `devolvida`, `validada` | Lista de fichas, topo da ficha |
| `SeloSincronia` | `badge` | `aparelho`, `aguardando`, `sincronizado` | APK, ao lado do selo de situação |
| `Campo` | `field` + `label` + `input` / `textarea` / `select` nativo | `rotulo`, `ajuda`, `erro` | Formulários |
| `EscalaOpcoes` | `radio-group` (estilo cartão) | `opcoes` na ordem do instrumento | Itens da FLEO |
| `Aviso` | `alert` | `info`, `atencao`, `erro`, `sucesso` | Ficha ilustrativa, orientação, confirmação |
| `Progresso` | `progress` | `valor`, `total`, `rotulo` | Cartão de turma, etapas da ficha |
| `CartaoTurma` | `card` | `href`, `nivelTitulo` | Painel do professor e da coordenação |

### Componentes previstos (entram quando a tela precisar)

| Componente | Base shadcn | Para quê | Fase |
|---|---|---|---|
| `Tabela` | `table` | Lista de fichas da turma, usuários, importações | 1–2 |
| `MenuLateral` | `sidebar` | Menu da web montado pelos módulos ativos | 1 |
| `BarraInferior` | — (próprio) | Menu do celular abaixo de 960 px | 3 |
| `Confirmacao` | `alert-dialog` | Devolver, reabrir, desfazer importação | 2 |
| `Gaveta` | `sheet` | Histórico da ficha no celular | 2 |
| `Abas` | `tabs` | Eixos da ficha (Leitura, Escrita, Oralidade, Revisão) | 2 |
| `Carregando` | `skeleton` | Listas enquanto a API responde | 1 |
| `MenuPerfil` | `dropdown-menu` | Usuário, trocar senha, sair | 1 |

Não entra: toast (`sonner`). Confirmação é `Aviso` na própria tela, perto do que mudou.

### Tema do shadcn ligado aos tokens

O shadcn lê variáveis próprias (`--primary`, `--border`…). Em `packages/ui/src/tema.css` elas
apontam para os tokens da central; assim um componente novo do registry já nasce com o visual
certo:

```css
@import 'tailwindcss';

:root {
  /* tokens da central (gerados de docs/design-system/tokens.json) */
  --fundo: #f4f6fa; --superficie: #ffffff; --superficie-2: #eaf0f8;
  --tinta: #1b2638; --tinta-suave: #4f5d72; --linha: #d8e0eb; --borda-controle: #7d8aa0;
  --semed: #2b5598; --semed-escuro: #1d3d70; --semed-claro: #dbe6f6; --sobre-semed: #ffffff;
  --devolvida-fundo: #fbe5df; --devolvida-tinta: #9a3412;

  /* nomes do shadcn apontando para os tokens */
  --background: var(--fundo);        --foreground: var(--tinta);
  --card: var(--superficie);         --card-foreground: var(--tinta);
  --popover: var(--superficie);      --popover-foreground: var(--tinta);
  --primary: var(--semed);           --primary-foreground: var(--sobre-semed);
  --secondary: var(--superficie-2);  --secondary-foreground: var(--tinta);
  --muted: var(--superficie-2);      --muted-foreground: var(--tinta-suave);
  --accent: var(--semed-claro);      --accent-foreground: var(--semed);
  --destructive: var(--devolvida-tinta);
  --border: var(--linha);            --input: var(--borda-controle);
  --ring: var(--semed);              --radius: 0.5rem; /* raio-md */
}

[data-tema='escuro'] {
  --fundo: #0f1522; --superficie: #161e2e; --superficie-2: #1d2840;
  --tinta: #e6ecf5; --tinta-suave: #a5b2c6; --linha: #2a3650; --borda-controle: #6b7a95;
  --semed: #8fb1e8; --semed-escuro: #b9cff2; --semed-claro: #22345a; --sobre-semed: #0f1522;
  --devolvida-fundo: #3d221c; --devolvida-tinta: #f6a98f;
  color-scheme: dark;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-destructive: var(--destructive);
  --font-titulo: 'Lexend', system-ui, sans-serif;
  --font-sans: 'Source Sans 3', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
```

O arquivo completo (todos os tokens, os dois temas) é **gerado** de `tokens.json` por um script
da Fase 0; o trecho acima mostra o formato. Não edite cor à mão no `tema.css`.

## 3. Regras para quem cria tela

1. Use um componente de `@central/ui`. Não existe? Procure no shadcn (MCP `shadcn`), copie para
   `packages/ui`, ligue aos tokens, dê nome e API em português e escreva o README do componente.
2. **Nada de cor literal** em tela (`#2b5598`, `bg-blue-600`). Só classes ligadas aos tokens
   (`bg-primary`, `text-muted-foreground`) ou `var(--…)`.
3. Texto da interface segue o README do design system: verbo no início, situações com os nomes
   fixos, erro que diz o que fazer, sem emoji.
4. Componente vindo do **21st.dev** é rascunho: serve de ideia de layout. Antes de entrar, troque
   cores e fontes pelos tokens, traduza o texto, confira teclado e leitor de tela.
5. Toda tela é aberta em 360 px e em 1280 px, nos temas claro e escuro, antes de dar por pronta
   (docs/desenvolvimento.md, seção 3).
