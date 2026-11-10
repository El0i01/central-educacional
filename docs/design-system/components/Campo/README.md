# Campo

Rótulo, controle e uma linha de ajuda ou de erro, ligados por `id` e `aria-describedby`.

- O consumidor fornece `id`, `rotulo` e **um** `input`, `select` ou `textarea` como filho; o `Campo` aplica a classe, o `id` e os atributos de acessibilidade.
- `ajuda` em `tinta-suave` explica a regra ("Ausente e não avaliado não recebem resultado de aprendizagem").
- `erro` substitui a ajuda, em `devolvida-tinta`, e marca `aria-invalid`. Diga o que fazer: "Informe a orientação para devolver a ficha."
- Fonte do controle sempre 16 px (`corpo`), para o celular não dar zoom ao tocar.
- Para os itens da FLEO use `EscalaOpcoes`, não `select`.
