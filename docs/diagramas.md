# Diagramas da Central Educacional

Diagramas em Mermaid (o VS Code com a extensão *Markdown Preview Mermaid Support* e o GitHub
desenham direto). Texto e regras em [modulos.md](modulos.md) e [funcionalidades.md](funcionalidades.md).

1. [Contexto](#1-contexto)
2. [Módulos: crescimento horizontal](#2-módulos-crescimento-horizontal)
3. [Implantação](#3-implantação)
4. [Organização do código](#4-organização-do-código)
5. [Modelo de dados](#5-modelo-de-dados)
6. [Ciclo de vida da ficha FLEO](#6-ciclo-de-vida-da-ficha-fleo)
7. [Preencher, enviar e validar](#7-preencher-enviar-e-validar)
8. [Uso sem internet no celular](#8-uso-sem-internet-no-celular)
9. [Importação de arquivos](#9-importação-de-arquivos)
10. [Casos de uso por perfil](#10-casos-de-uso-por-perfil)
11. [Escopo de acesso](#11-escopo-de-acesso)

---

## 1. Contexto

Quem usa a central e de onde vêm os dados externos. Nenhuma integração automática é presumida:
as fontes externas entram por arquivo autorizado (M09).

```mermaid
flowchart LR
  prof([Professor])
  coord([Coordenação escolar])
  equipe([Equipe pedagógica SEMED])
  gestor([Gestão da SEMED])
  cad([Responsável pelos cadastros])

  subgraph central[Central Educacional]
    web[Portal web]
    app[App do professor - APK]
    api[(API + PostgreSQL)]
  end

  prof --> app
  prof --> web
  coord --> web
  equipe --> web
  gestor --> web
  cad --> web
  web --> api
  app --> api

  inep[[INEP: Censo Escolar, SAEB, IDEB]]
  saero[[SEDUC-RO: SAERO]]
  mec[[MEC: CNCA, Indicador Criança Alfabetizada]]
  gestao[[Sistema de gestão escolar do município]]

  inep -. arquivo .-> api
  saero -. arquivo .-> api
  mec -. arquivo .-> api
  gestao -. planilha de matrículas .-> api
```

## 2. Módulos: crescimento horizontal

Plataforma embaixo, módulos lado a lado em cima. Cada módulo depende **só da plataforma**. Entre
módulos, só leitura opcional por visão publicada (linha pontilhada).

```mermaid
flowchart TB
  subgraph modulos[Módulos - entram um a um, lado a lado]
    direction LR
    m03[M03 FLEO Digital<br/>agora]
    m04[M04 Avaliações<br/>SAERO · SAEB · ProAlfa · fluência]
    m05[M05 Indicadores e metas<br/>IDEB · ICA]
    m06[M06 Programas e formações<br/>PAIC · CNCA · ProLEEI]
    m07[M07 Intervenções]
    mx[próximo módulo]
  end

  subgraph plataforma[Plataforma - sempre ligada]
    direction LR
    m01[M01 Acesso]
    m02[M02 Rede escolar]
    m09[M09 Importação]
    m08[M08 Relatórios]
    nucleo[Núcleo<br/>histórico · config · fila · arquivos · design system]
  end

  m03 --> plataforma
  m04 --> plataforma
  m05 --> plataforma
  m06 --> plataforma
  m07 --> plataforma
  mx --> plataforma

  m07 -.->|lê fleo.v_*| m03
  m05 -.->|lê avaliacao.v_*| m04

  classDef agora fill:#2b5598,stroke:#1d3d70,color:#ffffff
  classDef base fill:#dbe6f6,stroke:#2b5598,color:#16294a
  classDef futuro fill:#f4f5f7,stroke:#9aa3b2,color:#4b5563,stroke-dasharray:4 3
  class m03 agora
  class m01,m02,m09,m08,nucleo base
  class m04,m05,m06,m07,mx futuro
```

Legenda: azul escuro = primeiro módulo (FLEO); azul claro = plataforma; tracejado = módulos que
entram depois, na ordem que a secretaria decidir.

### 2.1 Registro de módulos

Como a central se monta sozinha a partir dos módulos ligados:

```mermaid
flowchart LR
  cfg[(nucleo.config<br/>modulos_ativos)]
  reg[Lista de registros<br/>fleo · avaliacao · ...]
  api[API monta as rotas<br/>/api/fleo/*]
  web[Web monta o menu<br/>e as telas]
  cfg --> api
  cfg --> web
  reg --> api
  reg --> web
```

## 3. Implantação

Mesmo padrão do Reurb: imagens construídas na máquina de desenvolvimento, carregadas no servidor
(`docker save | ssh docker load`) e publicadas como stack no Portainer.

```mermaid
flowchart LR
  subgraph aparelhos[Aparelhos]
    nav[Navegador<br/>secretaria e escolas]
    apk[APK Capacitor<br/>professor]
  end

  subgraph servidor[Servidor da prefeitura - stack central no Portainer]
    caddy[Caddy<br/>HTTPS]
    web[web<br/>nginx + build Vite]
    api[api<br/>Node 20 + Express 5]
    worker[worker<br/>importação e exportação]
    migrar[migrar<br/>roda e sai]
    db[(PostgreSQL 16<br/>schemas por módulo)]
    vol[/volume arquivos/]
    bkp[/backup diário/]
  end

  nav -->|HTTPS| caddy
  apk -->|HTTPS /api| caddy
  caddy --> web
  web -->|/api| api
  api --> db
  worker --> db
  api --> vol
  worker --> vol
  migrar --> db
  db --> bkp
```

## 4. Organização do código

```mermaid
flowchart TB
  subgraph apps
    web[apps/web<br/>React 19 + Vite + Tailwind 4]
    mobile[apps/mobile<br/>Capacitor: empacota apps/web]
    api[apps/api<br/>Express 5 + pg]
    worker[apps/worker<br/>fila no PostgreSQL]
  end
  subgraph packages
    tipos[tipos<br/>contratos da API]
    escopo[escopo<br/>quem enxerga o quê]
    fleo[fleo<br/>regras da ficha]
    escalas[escalas<br/>fase 4]
    ui[ui<br/>design system]
  end
  db[database<br/>migrações NNN_*.sql + seeds]

  mobile --> web
  web --> tipos
  web --> ui
  web --> fleo
  api --> tipos
  api --> escopo
  api --> fleo
  api --> escalas
  worker --> tipos
  api -. aplica .-> db
  fleo --> tipos
  escopo --> tipos
```

## 5. Modelo de dados

### 5.1 Acesso e rede (M01, M02)

```mermaid
erDiagram
  USUARIO ||--o{ USUARIO_ESCOLA : "vinculado a"
  ESCOLA ||--o{ USUARIO_ESCOLA : ""
  ESCOLA ||--o{ TURMA : oferece
  ANO_LETIVO ||--o{ TURMA : ""
  TURMA ||--o{ TURMA_PROFESSOR : ""
  USUARIO ||--o{ TURMA_PROFESSOR : leciona
  TURMA ||--o{ MATRICULA : ""
  ESTUDANTE ||--o{ MATRICULA : "ao longo dos anos"

  USUARIO {
    int id PK
    text login UK
    text nome
    text perfil
    bool ativo
  }
  ESCOLA {
    int id PK
    text inep UK "8 dígitos"
    text nome
    text zona
  }
  ANO_LETIVO {
    int ano PK
    date inicio
    date fim
  }
  TURMA {
    int id PK
    int escola_id FK
    int ano_letivo FK
    text nome
    text etapa "EI4..EF9"
    text turno
  }
  ESTUDANTE {
    int id PK
    text nome
    date data_nascimento
    text codigo_inep UK
  }
  MATRICULA {
    int id PK
    int estudante_id FK
    int turma_id FK
    text situacao "ativa, transferida..."
  }
```

### 5.2 FLEO (M03)

```mermaid
erDiagram
  INSTRUMENTO ||--o{ INSTRUMENTO_VERSAO : "evolui em"
  INSTRUMENTO_VERSAO ||--o{ APLICACAO : "usada em"
  APLICACAO ||--o{ FICHA : abre
  MATRICULA ||--o{ FICHA : "uma por aplicação"
  FICHA ||--o{ HISTORICO : registra

  INSTRUMENTO {
    int id PK
    text codigo UK "FLEO"
    text nome
  }
  INSTRUMENTO_VERSAO {
    int id PK
    int instrumento_id FK
    int versao
    jsonb definicao "eixos, itens, opções"
    bool publicada "imutável depois"
  }
  APLICACAO {
    int id PK
    int versao_id FK
    int ano_letivo
    text nome
    date inicio
    date fim
    text etapas "lista de etapas"
  }
  FICHA {
    int id PK
    int matricula_id FK
    int aplicacao_id FK
    text situacao
    text presenca
    jsonb respostas
    text observacao
    text orientacao
    int versao "concorrência"
  }
  HISTORICO {
    bigint id PK
    text entidade
    int entidade_id
    text acao
    text motivo
    int usuario_id
  }
```

### 5.3 Avaliações e indicadores (M04, M05)

```mermaid
erDiagram
  AVALIACAO ||--o{ EDICAO : tem
  EDICAO ||--|| ESCALA : usa
  ESCALA ||--o{ NIVEL : "faixas"
  EDICAO ||--o{ RESULTADO : publica
  IMPORTACAO ||--o{ RESULTADO : origina
  INDICADOR ||--o{ VALOR_INDICADOR : "série"
  INDICADOR ||--o{ META : ""

  AVALIACAO {
    int id PK
    text sigla "SAERO, SAEB..."
    text tipo "externa, rede"
    text fonte "INEP, SEDUC-RO, SEMED"
  }
  EDICAO {
    int id PK
    int avaliacao_id FK
    int ano
    text componente "LP, MAT"
    text etapa
  }
  ESCALA {
    int id PK
    text nome
    numeric minimo
    numeric maximo
  }
  RESULTADO {
    int id PK
    int edicao_id FK
    text nivel_agregacao "rede, escola, turma, estudante"
    int ref_id "escola, turma ou estudante"
    numeric proficiencia
    int avaliados
    int previstos
  }
  INDICADOR {
    int id PK
    text sigla "IDEB, ICA"
    bool oficial
  }
  VALOR_INDICADOR {
    int indicador_id FK
    int ano
    text nivel_agregacao
    int ref_id
    numeric valor
  }
  META {
    int indicador_id FK
    int ano
    int ref_id
    numeric valor
  }
```

### 5.4 Programas e intervenções (M06, M07)

```mermaid
erDiagram
  PROGRAMA ||--o{ ADESAO : ""
  ESCOLA ||--o{ ADESAO : ""
  PROGRAMA ||--o{ FORMACAO : oferece
  FORMACAO ||--o{ PRESENCA : ""
  USUARIO ||--o{ PRESENCA : ""
  DIFICULDADE ||--o{ PLANO_ACAO : "gera"
  PLANO_ACAO ||--o{ ANDAMENTO : ""
  PLANO_ACAO }o--o| APLICACAO : "reavaliado em"

  PROGRAMA {
    int id PK
    text sigla "PAIC, CNCA, ProLEEI"
    text responsavel
  }
  ADESAO {
    int programa_id FK
    int escola_id FK
    int ano
    int publico_atendido
  }
  FORMACAO {
    int id PK
    int programa_id FK
    date data
    int carga_horaria
  }
  DIFICULDADE {
    int id PK
    text origem "fleo, avaliacao, observacao"
    int escola_id
    int turma_id
    text descricao
  }
  PLANO_ACAO {
    int id PK
    int dificuldade_id FK
    text responsavel
    date prazo
    text situacao
  }
```

## 6. Ciclo de vida da ficha FLEO

Regras em `packages/fleo` (função `transicionar`). "Não iniciada" é a ficha em rascunho sem
nenhuma resposta; não é uma situação gravada.

```mermaid
stateDiagram-v2
  [*] --> rascunho: aplicação aberta<br/>(uma ficha por matrícula)
  rascunho --> rascunho: professor salva
  rascunho --> enviada: professor envia<br/>(todos os itens ou ausente)
  enviada --> validada: coordenação valida
  enviada --> devolvida: coordenação devolve<br/>+ orientação obrigatória
  devolvida --> devolvida: professor ajusta
  devolvida --> enviada: professor reenvia
  validada --> devolvida: coordenação reabre<br/>+ justificativa obrigatória
  validada --> [*]: entra nos resultados
```

## 7. Preencher, enviar e validar

Controle de concorrência: toda escrita manda a `versao` lida; se outra pessoa mudou antes, a API
responde 409 e a tela pede para recarregar.

```mermaid
sequenceDiagram
  autonumber
  actor P as Professor
  participant W as Web/APK
  participant A as API
  participant D as PostgreSQL
  actor C as Coordenação

  P->>W: abre a turma e o estudante
  W->>A: GET /fleo/fichas?turma=12
  A->>D: consulta com escopo do professor
  D-->>A: fichas da turma
  A-->>W: fichas + versão do instrumento
  P->>W: marca leitura, escrita, oralidade
  W->>A: PATCH /fleo/fichas/7 {versao: 3, respostas}
  A->>A: fleo.validarRespostas()
  A->>D: UPDATE ... WHERE versao = 3
  D-->>A: ok, versao 4 + histórico
  P->>W: Enviar à coordenação
  W->>A: POST /fleo/fichas/7/transicao {acao: enviar, versao: 4}
  A->>A: fleo.transicionar(professor, ficha, enviar)
  A->>D: situacao = enviada, versao 5
  C->>W: abre fichas enviadas da escola
  C->>W: Validar
  W->>A: POST /fleo/fichas/7/transicao {acao: validar, versao: 5}
  A->>D: situacao = validada + histórico
  Note over A,D: só a partir daqui a ficha conta nos resultados
```

## 8. Uso sem internet no celular

Mesmo modelo do app do Social no Reurb: rascunho cifrado no aparelho (IndexedDB), fila de envio
e conferência no servidor ao reconectar. Sincronizado **não** é validado.

```mermaid
sequenceDiagram
  autonumber
  actor P as Professor
  participant L as Aparelho<br/>(IndexedDB cifrado)
  participant F as Fila de envio
  participant A as API

  Note over P,A: 1º acesso e turmas exigem conexão
  P->>L: preenche sem internet
  L-->>P: selo "Salvo no aparelho"
  P->>F: Enviar (sem conexão)
  F-->>P: selo "Aguardando conexão"
  Note over F,A: conexão volta
  F->>A: PATCH + transição {id_operacao, versao}
  alt versão confere e permissão ok
    A-->>F: 200 + nova versão
    F-->>P: selo "Enviada à coordenação"
  else outra edição no meio (409)
    A-->>F: 409 + ficha atual
    F-->>P: tela de conflito: manter a minha ou a do servidor
  else permissão revogada ou período encerrado
    A-->>F: 403 / 409
    F-->>P: fica no aparelho com o motivo
  end
```

Selos na tela (UC-F19):

| Selo | Significa |
|---|---|
| Salvo no aparelho | só neste celular |
| Aguardando conexão | na fila, sai sozinho |
| Sincronizado | rascunho chegou ao servidor |
| Enviada à coordenação | aguardando conferência |
| Validada | conta nos resultados |

## 9. Importação de arquivos

Repetível sem duplicar: cada tipo de arquivo tem uma chave natural (ex.: INEP da escola + nome da
turma + ano; ID do estudante + edição).

```mermaid
stateDiagram-v2
  [*] --> recebido: envio do arquivo<br/>(hash SHA-256)
  recebido --> analisando: job na fila
  analisando --> com_inconsistencias: estrutura ou vínculo com problema
  analisando --> pronto: tudo confere
  com_inconsistencias --> pronto: corrigir ou ignorar linhas
  pronto --> publicado: confirmar<br/>(chama o serviço do módulo de destino)
  publicado --> desfeito: desfazer última publicação
  com_inconsistencias --> descartado
  pronto --> descartado
  publicado --> [*]
```

## 10. Casos de uso por perfil

Códigos em [funcionalidades.md](funcionalidades.md). Só o que entra no piloto da FLEO.

```mermaid
flowchart LR
  prof([Professor])
  coord([Coordenação])
  equipe([Equipe pedagógica])
  gestor([Gestor])
  cad([Cadastro])
  admin([Admin])

  subgraph M01[Acesso]
    A01[UC-A01 Entrar]
    A04[UC-A04 Usuários]
  end
  subgraph M02[Rede]
    R03[UC-R03 Turmas]
    R05[UC-R05 Matrículas]
    R06[UC-R06 Importar planilha]
  end
  subgraph M03[FLEO]
    F03[UC-F03 Abrir aplicação]
    F11[UC-F11 Preencher ficha]
    F16[UC-F16 Enviar]
    F18[UC-F18 Sem internet]
    F22[UC-F22 Validar]
    F23[UC-F23 Devolver]
    F30[UC-F30 Resultados]
  end

  prof --> A01
  prof --> F11
  prof --> F16
  prof --> F18
  coord --> F22
  coord --> F23
  coord --> F30
  equipe --> F03
  equipe --> F30
  gestor --> F30
  cad --> R03
  cad --> R05
  cad --> R06
  admin --> A04
```

## 11. Escopo de acesso

```mermaid
flowchart TB
  u{Perfil do usuário}
  u -->|professor| t[Turmas em turma_professor]
  u -->|coordenacao| e[Escolas em usuario_escola]
  u -->|equipe_pedagogica| ep[Escolas e programas autorizados]
  u -->|gestor| ag[Rede inteira, só agregado<br/>sem nome de estudante]
  u -->|cadastro| rc[Cadastros da rede<br/>sem dado pedagógico]
  u -->|admin| cfg[Configuração técnica<br/>sem dado pedagógico]
  t --> n[Dado nominal permitido]
  e --> n
  ep --> n
  n --> log[(Acesso fora da própria turma<br/>grava registro LGPD)]
```
