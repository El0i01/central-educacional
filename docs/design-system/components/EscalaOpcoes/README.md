# EscalaOpcoes

Um item da FLEO com suas opções como alvos grandes de toque, no lugar de um `select`: o professor vê a escala inteira e marca com um toque.

- O consumidor fornece `nome` (id do item), `enunciado`, `opcoes` **na ordem do instrumento** (da menos à mais desenvolvida), `valor` e `onChange`.
- O número à esquerda é a posição na escala, não uma nota. Não some nem tire média desses números.
- Por baixo são `input type="radio"` num `fieldset` com `legend`: funciona com teclado (setas) e leitor de tela.
- Opção marcada: fundo `semed-claro`, borda `semed`, visto à direita.
- `disabled` para consulta (coordenação, ficha enviada ou validada): mostra a marcação sem permitir mudar.
- Os textos vêm sempre da versão do instrumento gravada na ficha; nunca escreva opções fixas na tela.
