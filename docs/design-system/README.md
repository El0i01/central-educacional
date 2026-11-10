Interface da Central Educacional da SEMED de Itapuã do Oeste/RO: o professor preenche a FLEO no celular ou no computador, a coordenação confere e a secretaria acompanha a rede. Vale para todos os módulos da central (FLEO hoje; Avaliações, Indicadores, Programas e Intervenções depois): um módulo novo usa estes tokens e componentes e não cria estilo próprio.

## Princípios

- **Moderna, limpa, azul.** O azul `semed` da logo é a única cor de marca. O resto é neutro com leve viés azul (`fundo`, `superficie`, `linha`).
- **Celular do professor primeiro.** Toda tela da FLEO é desenhada em 360 px de largura e depois ampliada. Alvo de toque mínimo `alvo-toque` (44 px).
- **Situação sempre escrita.** Cor de situação nunca aparece sozinha: o selo leva palavra e ícone. Validada e devolvida diferem também no ícone (✓ e ↺).
- **Calma, não alarme.** Ausente e não avaliado são situações normais, em tons neutros; o vermelho-terra (`devolvida-*`) é só para ajuste pedido e erro.

## Escrita

- Português do Brasil, frases curtas, voz ativa, tratamento direto ("Preencha os itens", não "Os itens devem ser preenchidos").
- Botão diz o que acontece: "Salvar rascunho", "Enviar à coordenação", "Validar ficha", "Devolver para ajuste". Nunca "OK" ou "Confirmar" sozinho.
- Mensagem de erro diz o que houve e o que fazer: "Esta ficha mudou em outro acesso. Recarregue antes de continuar."
- Situações com os nomes fixos: **Rascunho**, **Aguardando conferência**, **Ajuste solicitado**, **Validada**. Sincronia: **Salvo no aparelho**, **Aguardando conexão**, **Sincronizado**.
- Sem emoji. Nomes de estudante em dados fictícios são sempre "Estudante 01", "Escola Demonstrativa A".
- Datas `10/11/2026`, horas `14:32`, números com vírgula decimal (`61,5%`).

## Fundamentos visuais

**Cor.** `fundo` na página, `superficie` em painéis e cartões, `superficie-2` em cabeçalhos de tabela e campos desabilitados. Texto em `tinta`; apoio em `tinta-suave`. Ação principal com preenchimento `semed` e texto `sobre-semed` (nunca branco fixo: no tema escuro o azul clareia e o texto escurece). Títulos de página em `semed-escuro`. Seleção (menu ativo, opção marcada) em `semed-claro` com texto `semed`.

**Situação da ficha.** Pares fixos fundo/tinta: `rascunho-*`, `enviada-*` (aguardando conferência), `devolvida-*` (ajuste solicitado), `validada-*`. Os mesmos pares servem aos avisos: informativo usa `semed-claro`, atenção `enviada-*`, erro `devolvida-*`, sucesso `validada-*`.

**Tipografia.** Lexend nos títulos (família `titulo`): foi desenhada para facilitar a leitura, o que combina com uma central de alfabetização. Source Sans 3 no texto (`texto`), IBM Plex Mono para código INEP, versão do instrumento e números do painel (`mono`, sempre com `font-variant-numeric: tabular-nums`). Estilos: `display` só na saudação do painel; `titulo-pagina` uma vez por tela; `titulo-secao` nos eixos da ficha; `corpo` (16 px) em campos e texto; `apoio` para legendas; `rotulo` em rótulos de campo. As três famílias vêm do Google Fonts; no app empacotado (APK) use `@fontsource` para funcionar sem internet.

**Espaço e forma.** Escala `espaco-1` a `espaco-8` (4 a 32 px). Painel com padding `espaco-6`, borda 1 px `linha` e `raio-lg`, **sem sombra**; `sombra-flutuante` só no que flutua. Botões, campos e opções em `raio-md`; selos e barra de progresso em `raio-pilula`.

**Foco.** Anel sólido de 3 px em `semed`, afastado 2 px do elemento (`outline: 3px solid var(--semed); outline-offset: 2px`). Visível em todos os controles, nos dois temas (5,6:1 ou mais sobre as superfícies).

**Layout.** Web: menu lateral de `menu-lateral` à esquerda, conteúdo em até 1200 px. Abaixo de 960 px o menu vira barra inferior fixa com os módulos ativos. Texto corrido limitado a `coluna-leitura`. Na ficha, a barra de ações (salvar, enviar) fica fixa no rodapé do celular, com `sombra-flutuante`.

**Movimento.** Mínimo: transição de 120 ms em cor de fundo de botão e opção. Nada anima ao carregar. Respeitar `prefers-reduced-motion`.

## Iconografia

Ícones da família **Lucide** (`lucide-react`, traço 2 px, 16–20 px), em `currentColor`, sempre ao lado de texto, nunca sozinhos sem `aria-label`. Ícones fixos: situação Rascunho = lápis, Aguardando conferência = relógio, Ajuste solicitado = seta circular, Validada = visto; Salvo no aparelho = celular, Aguardando conexão = nuvem riscada, Sincronizado = nuvem com visto. Os componentes deste sistema desenham esses ícones em SVG próprio para não depender da biblioteca nas prévias.

## Logo

Use `assets/Logos/semed.png` como está (veja o README do grupo): sobre `superficie`, em quadro `raio-lg`, mínimo 48 px. Na barra lateral: logo de 56 px ao lado de "Central" em `titulo-secao` e "Educacional" em `apoio`.

## Componentes

`window.CentralUI`, React 18. Todos recebem `className` extra.

- `Botao` — ação. `variante`: `primario` (uma vez por tela), `secundario`, `discreto`, `perigo`.
- `SeloSituacao` — situação da ficha (`rascunho`, `enviada`, `devolvida`, `validada`).
- `SeloSincronia` — onde está o registro no celular (`aparelho`, `aguardando`, `sincronizado`).
- `Campo` — rótulo + controle + ajuda ou erro.
- `EscalaOpcoes` — as opções de um item da FLEO como botões grandes, no lugar de `<select>`.
- `Aviso` — mensagem em faixa: `info`, `atencao`, `erro`, `sucesso`.
- `CartaoTurma` — turma com andamento das fichas.
- `Progresso` — barra de andamento com rótulo.

## Documentação do projeto

Especificação, modularização (crescimento horizontal), funcionalidades e diagramas: [Documentação em HTML](https://claude.ai/artifact/73x3Lgo8UtPmejufbyoPEL). Este design system é a parte visual dessa documentação; os dois andam juntos.
