# CartaoTurma

Uma turma no painel do professor e da coordenação: nome, etapa, escola, contagens e andamento das fichas validadas.

- O consumidor fornece `nome`, `etapa`, `escola`, `estudantes`, `enviadas`, `validadas` e `href` (link da turma). `nivelTitulo` (padrão 3) acompanha a hierarquia da página.
- Painel `superficie` com borda `linha` e `raio-lg`, sem sombra. Números em `mono` tabular.
- Em grade de cartões de mesma largura (2 a 4 colunas na web, 1 no celular).
- O botão "Abrir turma" é o primário do cartão; com vários cartões na tela, ele é a exceção à regra de um primário por tela.
