# Modularização da Central Educacional

Este documento define como o sistema é dividido **antes** de qualquer código de módulo. Cada módulo
novo começa por aqui: entra na tabela, ganha fronteira, dono dos dados e lugar no código.

Diagramas correspondentes: [diagramas.md](diagramas.md) (seções 2, 4 e 5).
Casos de uso: [funcionalidades.md](funcionalidades.md).

## 1. Crescimento horizontal

A central cresce **para os lados**: uma **plataforma** comum embaixo e os **módulos** encaixados
lado a lado em cima dela. Cada módulo é uma fatia completa (tabelas, regras, API e telas) e
**não depende de outro módulo**. Entra, sai ou é desligado sem mexer nos vizinhos.

```
 ┌────────┐ ┌───────────┐ ┌─────────────┐ ┌───────────┐ ┌──────────────┐ ┌─ ─ ─ ─ ─ ┐
 │  FLEO  │ │ Avaliações│ │ Indicadores │ │ Programas │ │ Intervenções │   próximo
 │  M03   │ │    M04    │ │     M05     │ │    M06    │ │     M07      │ │  módulo  │
 └───┬────┘ └─────┬─────┘ └──────┬──────┘ └─────┬─────┘ └──────┬───────┘ └─ ─ ─ ─ ─ ┘
     │            │              │              │              │
 ════╧════════════╧══════════════╧══════════════╧══════════════╧═══════════════════════
   PLATAFORMA   Acesso (M01) · Rede escolar (M02) · Importação (M09) · Relatórios (M08)
                Núcleo: histórico, configuração, fila de jobs, arquivos, design system
 ══════════════════════════════════════════════════════════════════════════════════════
```

**Hoje começamos pela FLEO (M03)**, com a plataforma mínima que ela precisa (M01, M02, núcleo).
Os demais módulos chegam um a um, na ordem que a secretaria decidir, sem reabrir o que já está
pronto.

### Regras do crescimento horizontal

1. **Módulo depende só da plataforma.** Nunca de outro módulo. FLEO não conhece Avaliações;
   Avaliações não conhece FLEO.
2. **Um módulo, um schema.** `fleo`, `avaliacao`, `indicador`, `programa`, `intervencao`. Só o
   próprio módulo escreve no seu schema.
3. **Módulo ligável.** A secretaria liga um módulo em `nucleo.config` (`modulos_ativos`). Desligado,
   ele não monta rotas na API nem aparece no menu. Os dados ficam guardados.
4. **Contrato de saída, não acesso direto.** Quando um módulo precisa mostrar algo de outro
   (Intervenções usando um resultado da FLEO; Relatórios juntando tudo), ele lê uma **visão
   publicada** (`VIEW` com prefixo `v_`) que o módulo de origem mantém estável. Se o módulo de
   origem estiver desligado, a função que depende dele some da tela; nada quebra.
5. **Registro do módulo.** Cada módulo exporta `{ codigo, nome, schema, rotas, menu, perfis }`.
   A API e a web montam a central a partir dessa lista. Módulo novo = registro novo, sem editar
   os existentes.
6. **Mesmo design system.** Todo módulo usa `packages/ui`. A central parece um sistema só.

### Plataforma × módulo

| | Plataforma | Módulo |
|---|---|---|
| Quem usa | todos os módulos | a área atendida |
| Pode ser desligada | não | sim |
| Exemplos | login, escolas, turmas, estudantes, importação, histórico | FLEO, SAERO/SAEB, IDEB, PAIC |
| Muda quando | entra um dado comum a vários módulos | muda a regra daquela área |

### Escala também horizontal

A API não guarda estado em memória (sessão no JWT, arquivos no volume, fila no PostgreSQL). Se a
rede crescer, basta subir mais réplicas da `api` e do `worker` atrás do Caddy, sem mudar código.
Para Itapuã do Oeste, uma réplica basta.

## 2. Mapa

### Plataforma

| Código | Parte | Responsabilidade | Schema | Fase |
|---|---|---|---|---|
| — | **Núcleo** | Histórico, configuração e módulos ativos, fila de jobs, arquivos por hash, registro de acesso a dado pessoal | `nucleo` | 0 |
| M01 | **Acesso** | Usuários, perfis, vínculos (escola, turma, programa), login, senha, bloqueio | `acesso` | 1 |
| M02 | **Rede escolar** | Escolas (INEP), anos letivos, turmas, estudantes, matrículas, atribuição docente | `rede` | 1 |
| M09 | **Importação** | Arquivo → prévia → inconsistências → publicação; cada módulo registra seus tipos de arquivo | `importacao` | 1 |
| M08 | **Relatórios** | Painel inicial por perfil, exportações. Só lê as visões `v_*` dos módulos ativos | — | 2 |

### Módulos (lado a lado)

| Código | Módulo | Responsabilidade | Schema | Ordem |
|---|---|---|---|---|
| M03 | **FLEO Digital** | Instrumentos versionados, aplicações (períodos), fichas, revisão, resultados | `fleo` | **1º — agora** |
| M04 | **Avaliações** | SAERO, SAEB, ProAlfa, fluência leitora: edições, escalas, participação, resultados | `avaliacao` | a definir |
| M05 | **Indicadores e metas** | IDEB, Indicador Criança Alfabetizada, séries históricas, metas | `indicador` | a definir |
| M06 | **Programas e formações** | PAIC, CNCA, ProLEEI, formações: adesão, participantes, presença, entregas | `programa` | a definir |
| M07 | **Intervenções pedagógicas** | Dificuldade → plano de ação → andamento → reavaliação | `intervencao` | a definir |

### Onde cada iniciativa da rede se encaixa

| Iniciativa | Tipo | Módulo |
|---|---|---|
| FLEO | Instrumento da rede (preenchido no sistema) | M03 |
| SAERO | Avaliação externa estadual | M04 |
| SAEB | Avaliação externa federal | M04 |
| ProAlfa (avaliações) | Avaliação | M04 |
| Fluência leitora | Avaliação | M04 |
| IDEB | Indicador oficial | M05 |
| Indicador Criança Alfabetizada | Indicador oficial | M05 |
| PAIC | Programa | M06 |
| CNCA | Programa (compromisso nacional) | M06 |
| ProLEEI | Programa | M06 |
| Formações | Ação formativa | M06 |

## 3. Ligações permitidas

| De | Para | Como |
|---|---|---|
| Qualquer módulo | Plataforma (M01, M02, núcleo) | serviço exportado no `index.ts` da plataforma |
| Qualquer módulo | Outro módulo | **só leitura**, por visão `v_*` publicada; opcional (some se o outro estiver desligado) |
| M09 Importação | Módulo de destino | o módulo registra o tipo de arquivo e o serviço que publica; a importação nunca escreve na tabela dele |
| M08 Relatórios | Módulos ativos | visões `v_*` |

Exemplos:

- **FLEO → Rede:** a ficha pertence a uma matrícula (`rede.matricula`). Permitido: é plataforma.
- **Intervenções → FLEO:** o plano de ação cita um resultado da FLEO lendo `fleo.v_resultado_item`.
  Se a FLEO estiver desligada, a opção "origem: FLEO" não aparece.
- **Indicadores → Avaliações:** a meta de alfabetização compara com `avaliacao.v_resultado_escola`.
- **Proibido:** `JOIN fleo.ficha` dentro do módulo de Avaliações; importar
  `modulos/fleo/repositorio` de outro módulo.

## 4. Fronteiras de dados (quem é dono do quê)

| Dado | Dono | Quem lê |
|---|---|---|
| Usuário, perfil, vínculo | M01 (plataforma) | todos |
| Escola (INEP), turma, estudante, matrícula | M02 (plataforma) | todos |
| Instrumento, aplicação, ficha FLEO | M03 | outros só por `fleo.v_*` |
| Edição de avaliação, escala, resultado | M04 | outros só por `avaliacao.v_*` |
| Indicador, série, meta | M05 | outros só por `indicador.v_*` |
| Programa, adesão, formação, presença | M06 | outros só por `programa.v_*` |
| Intervenção, plano, andamento | M07 | outros só por `intervencao.v_*` |
| Lote de importação, inconsistências | M09 (plataforma) | — |
| Histórico, config, job, arquivo | Núcleo | todos |

Chaves que ligam tudo (estáveis, nunca reaproveitadas):

- **Escola:** `rede.escola.id` + código **INEP** (8 dígitos). O INEP liga às fontes externas.
- **Estudante:** `rede.estudante.id` + ID INEP quando houver. Um estudante, várias matrículas ao
  longo dos anos. Transferência preserva o histórico.
- **Período:** ano letivo + aplicação ou edição. Nada é comparado sem período.

## 5. Escopo de acesso (plataforma, vale para todos os módulos)

Calculado em um lugar só: `packages/escopo`, função pura
`escopo(usuario, vinculos) → { escolas, turmas, programas, nominal }`. Cada módulo aplica o escopo
nas próprias consultas; nenhum módulo inventa regra de acesso própria.

| Perfil | Enxerga | Dado nominal de estudante | Escreve (na FLEO) |
|---|---|---|---|
| `professor` | Turmas atribuídas a ele | Sim, das suas turmas | Preenche e envia fichas |
| `coordenacao` | Escolas vinculadas | Sim, da escola | Valida, devolve, reabre |
| `equipe_pedagogica` | Escolas e programas autorizados | Sim, dentro do escopo | Instrumentos e aplicações |
| `gestor` | Rede inteira, **só agregado** | Não | — |
| `cadastro` | Cadastros da rede | Identificação, não pedagógico | — (escreve na Rede) |
| `admin` | Configuração técnica | Não, por padrão | — (liga módulos, usuários) |

Abrir dado nominal de estudante fora da própria turma grava registro de acesso (LGPD).

## 6. Como o código acompanha

```
central-educacional/
├── apps/
│   ├── api/src/
│   │   ├── plataforma/      nucleo/ · acesso/ · rede/ · importacao/ · relatorios/
│   │   └── modulos/
│   │       ├── fleo/        index.ts (registro) · rotas.ts · servico.ts · repositorio.ts
│   │       └── …            um diretório por módulo, mesmo formato
│   ├── web/src/
│   │   ├── plataforma/      login, casca, menu, cadastros da rede
│   │   └── modulos/fleo/    telas, rotas do React Router, item de menu
│   ├── worker/              jobs da fila: importação, exportação, consolidação
│   └── mobile/              casca Capacitor da web (APK do professor)
├── packages/
│   ├── tipos/               contratos da API (um arquivo por módulo)
│   ├── escopo/              quem enxerga o quê
│   ├── fleo/                regras puras da FLEO
│   └── ui/                  design system: tokens e componentes
├── database/
│   ├── NNN_<schema>_*.sql   migrações numeradas; cada arquivo mexe em um schema só
│   └── seeds/               dados fictícios
├── docs/                    modulos.md · funcionalidades.md · diagramas.md
└── infra/                   docker compose, stack do Portainer, deploy
```

Regras do código:

- `modulos/<m>/index.ts` é a **única** porta de entrada do módulo. ESLint `no-restricted-imports`
  proíbe um módulo importar arquivo de outro módulo.
- Plataforma não importa nada de `modulos/`. Ela só recebe a lista de registros.
- Migração com o schema no nome: `003_rede_turma.sql`, `010_fleo_ficha.sql`.
- Módulo não altera tabela da plataforma. Precisa de um dado comum novo (ex.: turno da turma)?
  Vira mudança da plataforma, revisada à parte.

## 7. Checklist de um módulo novo

Antes de codar, preencher uma seção no fim deste arquivo:

1. **Objetivo** em uma frase e o perfil que mais usa.
2. **Casos de uso** (códigos UC-xx em funcionalidades.md).
3. **Dados próprios** (tabelas do schema) e **visões que publica** (`v_*`).
4. **O que lê** da plataforma e de visões de outros módulos (sempre opcional).
5. **Regras puras**, pacote e lista de testes.
6. **Escopo:** o que cada perfil vê e escreve.
7. **Fonte dos dados:** digitação, importação (qual arquivo, quem fornece) ou integração.
8. **Critério de aceite** do piloto.

## 8. Regras de avaliações e indicadores (para quando M04 e M05 entrarem)

- Todo resultado guarda **fonte, edição, período, escala, nível de agregação** (rede, escola,
  turma, estudante), **participação** e **denominador**, quando a fonte informa.
- **Escalas diferentes não se misturam.** Nada de média entre SAEB, SAERO e FLEO.
- **Agregado não vira individual.** Resultado que chega por escola fica por escola.
- **Oficial e cálculo local ficam separados.** O IDEB publicado é um dado; uma projeção é outro.
- **Rascunho nunca entra em consolidado.** Na FLEO, só ficha validada de estudante acompanhado.
- Integração automática com SAERO ou outros sistemas **não é presumida**: primeiro arquivo
  autorizado, com prévia e conferência.

---

## Módulo M03 — FLEO Digital (primeiro módulo)

1. **Objetivo:** o professor registra leitura, escrita e oralidade de cada estudante sem papel;
   a coordenação confere e valida; a secretaria vê o consolidado. Perfil principal: professor.
2. **Casos de uso:** UC-F01 a UC-F33 (funcionalidades.md). Piloto: os marcados com ✔.
3. **Dados próprios (schema `fleo`):** `instrumento`, `instrumento_versao` (definição congelada
   ao publicar), `aplicacao`, `ficha`. **Visões publicadas:** `v_resultado_item` (distribuição
   por item e opção, só validadas), `v_andamento_turma` (fichas por situação).
4. **Lê da plataforma:** `rede.matricula`, `rede.turma`, `rede.escola`, `acesso.usuario`, escopo.
   Não lê nenhum outro módulo.
5. **Regras puras:** `packages/fleo`: `podePreencher`, `validarRespostas`, `respostasParaGravar`,
   `transicionar`, `distribuicao`. Testes: cada transição permitida e proibida por perfil;
   envio incompleto; ausente sem respostas; período encerrado; reabrir sem justificativa;
   distribuição só com validadas de presentes.
6. **Escopo:** professor (suas turmas), coordenação (sua escola), equipe pedagógica (rede,
   configura instrumento e aplicação), gestor (só agregado).
7. **Fonte:** digitação pelo professor (web e APK com uso sem internet). Instrumento oficial
   fornecido pela SEMED; **a ficha atual é ilustrativa** até chegar a oficial.
8. **Aceite do piloto:** um professor preenche, a coordenação valida e a secretaria vê o
   consolidado certo, sem duplicidade, com a aplicação e a versão do instrumento identificadas,
   histórico preservado e permissões respeitadas.
