# Funcionalidades da Central Educacional

Casos de uso por módulo. Os códigos (UC-xxx) são estáveis: aparecem nos commits, nos testes e
nas telas. Módulos e fronteiras em [modulos.md](modulos.md); fluxos desenhados em
[diagramas.md](diagramas.md).

**Fase** segue o CLAUDE.md, seção 10. **Piloto** = obrigatório para o piloto da FLEO com escolas.

Perfis: `professor`, `coordenacao`, `equipe_pedagogica` (equipe da SEMED), `gestor`, `cadastro`
(responsável pelos cadastros), `admin`.

---

## M01 — Acesso

| ID | Caso de uso | Ator | Fase | Piloto |
|---|---|---|---|---|
| UC-A01 | Entrar com login e senha; "manter conectado" no celular | todos | 1 | ✔ |
| UC-A02 | Trocar a própria senha; senha provisória obriga troca no 1º acesso | todos | 1 | ✔ |
| UC-A03 | Bloqueio automático após 5 tentativas erradas (15 min) | sistema | 1 | ✔ |
| UC-A04 | Cadastrar usuário, definir perfil, ativar e desativar | admin, cadastro | 1 | ✔ |
| UC-A05 | Gerar senha provisória (recuperação sem e-mail) | admin | 1 | ✔ |
| UC-A06 | Vincular usuário a escolas (coordenação) e a programas (equipe) | cadastro | 1 | ✔ |
| UC-A07 | Consultar histórico de acessos e de acesso a dado nominal | admin | 1 | |
| UC-A08 | Ligar e desligar módulos da central | admin | 1 | |
| UC-A09 | Autenticação institucional (gov.br ou provedor da prefeitura) | todos | 6 | |

## M02 — Rede e vida escolar

| ID | Caso de uso | Ator | Fase | Piloto |
|---|---|---|---|---|
| UC-R01 | Cadastrar escola com código INEP, zona e situação | cadastro | 1 | ✔ |
| UC-R02 | Abrir ano letivo | cadastro | 1 | ✔ |
| UC-R03 | Cadastrar turma (etapa, turno, ano letivo) | cadastro | 1 | ✔ |
| UC-R04 | Atribuir professores à turma (regente e apoio) | cadastro, coordenacao | 1 | ✔ |
| UC-R05 | Cadastrar estudante (cadastro único na rede) e matricular | cadastro | 1 | ✔ |
| UC-R06 | Importar escolas, turmas e matrículas de planilha (via M09) | cadastro | 1 | ✔ |
| UC-R07 | Registrar transferência, abandono e conclusão, preservando o histórico | cadastro | 1 | |
| UC-R08 | Detectar estudante duplicado (nome + nascimento, ID INEP) | sistema | 1 | |
| UC-R09 | Consultar a turma: estudantes, professores, situação das fichas | professor, coordenacao | 1 | ✔ |

## M03 — FLEO Digital

### Configuração (secretaria)

| ID | Caso de uso | Ator | Fase | Piloto |
|---|---|---|---|---|
| UC-F01 | Cadastrar instrumento: eixos, itens, opções na ordem da escala | equipe_pedagogica | 2 | ✔ |
| UC-F02 | Publicar versão do instrumento (a versão publicada é imutável) | equipe_pedagogica | 2 | ✔ |
| UC-F03 | Abrir aplicação: nome, versão, etapas, início e fim | equipe_pedagogica | 2 | ✔ |
| UC-F04 | Encerrar ou prorrogar aplicação | equipe_pedagogica | 2 | ✔ |

### Preenchimento (professor)

| ID | Caso de uso | Ator | Fase | Piloto |
|---|---|---|---|---|
| UC-F10 | Ver minhas turmas e o andamento de cada uma | professor | 2 | ✔ |
| UC-F11 | Preencher a ficha **por estudante** (leitura, escrita, oralidade, observação) | professor | 2 | ✔ |
| UC-F12 | Preencher **por item, a turma inteira** (um item, todos os estudantes na mesma tela) | professor | 2 | |
| UC-F13 | Registrar ausente ou não avaliado, sem resultado de aprendizagem | professor | 2 | ✔ |
| UC-F14 | Salvar rascunho e continuar depois | professor | 2 | ✔ |
| UC-F15 | Ver o que falta antes de enviar | professor | 2 | ✔ |
| UC-F16 | Enviar à coordenação | professor | 2 | ✔ |
| UC-F17 | Ver a orientação da coordenação e ajustar a ficha devolvida | professor | 2 | ✔ |
| UC-F18 | Preencher no celular **sem internet** e enviar quando a conexão voltar | professor | 3 | ✔ |
| UC-F19 | Ver na tela se a ficha está **no aparelho**, **sincronizada** ou **enviada** | professor | 3 | ✔ |

### Revisão (coordenação)

| ID | Caso de uso | Ator | Fase | Piloto |
|---|---|---|---|---|
| UC-F20 | Acompanhar fichas da escola por turma e situação | coordenacao | 2 | ✔ |
| UC-F21 | Conferir a ficha com o histórico de alterações | coordenacao | 2 | ✔ |
| UC-F22 | Validar a ficha (uma a uma ou a turma em bloco) | coordenacao | 2 | ✔ |
| UC-F23 | Devolver com orientação obrigatória | coordenacao | 2 | ✔ |
| UC-F24 | Reabrir ficha validada com justificativa | coordenacao | 2 | ✔ |
| UC-F25 | Cobrar pendências: lista de fichas não enviadas por professor | coordenacao | 2 | |

### Resultados

| ID | Caso de uso | Ator | Fase | Piloto |
|---|---|---|---|---|
| UC-F30 | Distribuição por item e opção, só fichas validadas de acompanhados | coordenacao, equipe_pedagogica, gestor | 2 | ✔ |
| UC-F31 | Comparar turmas e escolas na mesma aplicação | equipe_pedagogica, gestor | 2 | |
| UC-F32 | Evolução do estudante e da turma entre aplicações (mesmo instrumento) | professor, coordenacao | 3 | |
| UC-F33 | Lista de estudantes que precisam de apoio, por item | professor, coordenacao | 3 | |

## M04 — Avaliações

| ID | Caso de uso | Ator | Fase |
|---|---|---|---|
| UC-V01 | Cadastrar avaliação (SAERO, SAEB, ProAlfa, fluência) e edição, com escala e etapas | equipe_pedagogica | 4 |
| UC-V02 | Importar resultados da edição com prévia e inconsistências (via M09) | equipe_pedagogica | 4 |
| UC-V03 | Consultar resultado por rede, escola, turma ou estudante, conforme a fonte | perfis com escopo | 4 |
| UC-V04 | Ver participação (avaliados / previstos) ao lado de cada resultado | todos | 4 |
| UC-V05 | Comparar edições da mesma avaliação (mesma escala) | equipe_pedagogica, gestor | 4 |
| UC-V06 | Registrar avaliação de fluência leitora aplicada pela rede | professor | 4 |

## M05 — Indicadores e metas

| ID | Caso de uso | Ator | Fase |
|---|---|---|---|
| UC-I01 | Registrar indicador oficial (IDEB, Indicador Criança Alfabetizada) por edição | equipe_pedagogica | 4 |
| UC-I02 | Ver série histórica do indicador por escola e rede | todos com escopo | 4 |
| UC-I03 | Definir meta da rede e das escolas por indicador e ano | gestor | 4 |
| UC-I04 | Acompanhar meta × resultado, com fonte e data da atualização | gestor, equipe_pedagogica | 4 |

## M06 — Programas e formações

| ID | Caso de uso | Ator | Fase |
|---|---|---|---|
| UC-P01 | Cadastrar programa (PAIC, CNCA, ProLEEI) com responsáveis | equipe_pedagogica | 5 |
| UC-P02 | Registrar adesão das escolas e o público atendido | equipe_pedagogica | 5 |
| UC-P03 | Cadastrar formação: calendário, público, carga horária | equipe_pedagogica | 5 |
| UC-P04 | Registrar presença na formação | equipe_pedagogica | 5 |
| UC-P05 | Acompanhar entregas previstas e pendências | equipe_pedagogica, gestor | 5 |

## M07 — Intervenções pedagógicas

| ID | Caso de uso | Ator | Fase |
|---|---|---|---|
| UC-N01 | Registrar dificuldade identificada (origem: FLEO, avaliação ou observação) | coordenacao, equipe_pedagogica | 5 |
| UC-N02 | Criar plano de ação: público, responsável, prazo, forma de acompanhar | coordenacao, equipe_pedagogica | 5 |
| UC-N03 | Registrar andamento da ação | professor, coordenacao | 5 |
| UC-N04 | Reavaliar: ligar o plano à aplicação ou edição seguinte | coordenacao, equipe_pedagogica | 5 |

## M08 — Relatórios

| ID | Caso de uso | Ator | Fase |
|---|---|---|---|
| UC-L01 | Painel inicial por perfil (pendências do professor, escola, rede) | todos | 2 |
| UC-L02 | Relatório para reunião: escola, ano escolar, período; PDF | coordenacao, equipe_pedagogica | 3 |
| UC-L03 | Exportar consolidado em CSV/XLSX (sem dado nominal para gestor) | equipe_pedagogica, gestor | 2 |
| UC-L04 | Mostrar sempre fonte, período, data de atualização e pendências | sistema | 2 |

## M09 — Importação e integrações

| ID | Caso de uso | Ator | Fase |
|---|---|---|---|
| UC-M01 | Enviar arquivo e escolher o tipo (matrículas, resultados de avaliação…) | cadastro, equipe_pedagogica | 1 |
| UC-M02 | Prévia: estrutura, vínculos (INEP, turma, estudante) e inconsistências | sistema | 1 |
| UC-M03 | Corrigir ou ignorar linhas e publicar | cadastro, equipe_pedagogica | 1 |
| UC-M04 | Reimportar sem duplicar (chave natural por tipo de arquivo) | sistema | 1 |
| UC-M05 | Consultar histórico de importações e desfazer a última publicação | cadastro, admin | 1 |
| UC-M06 | Conectores automáticos e API para BI (quando houver fonte oficial e autorização) | admin | 6 |

## Núcleo (transversal)

| ID | Funcionalidade | Fase |
|---|---|---|
| UC-X01 | Histórico de toda mudança: quem, quando, o quê, por quê | 0 |
| UC-X02 | Registro de acesso a dado nominal de estudante (LGPD) | 1 |
| UC-X03 | Fila de jobs no PostgreSQL (`FOR UPDATE SKIP LOCKED`), sem Redis | 1 |
| UC-X04 | Arquivos por hash SHA-256, entregues pela API depois de conferir o acesso | 1 |
| UC-X05 | Configuração: módulos ativos, ano letivo corrente, parâmetros | 0 |
| UC-X06 | Backup diário e restauração testada | 1 |
