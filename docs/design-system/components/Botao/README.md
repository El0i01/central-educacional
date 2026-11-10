# Botao

Dispara uma ação; o texto diz exatamente o que acontece, com verbo no início ("Salvar rascunho", "Validar ficha").

- `primario` (preenchimento `semed`, texto `sobre-semed`): no máximo um por tela, para a ação principal (Enviar à coordenação, Validar ficha).
- `secundario`: ações de apoio (Salvar rascunho, Exportar). `discreto`: navegação e consultas (Ver histórico).
- `perigo` (tinta `devolvida-tinta`): Devolver para ajuste, Reabrir. Nunca para a ação principal.
- `largo` ocupa a largura: use no celular, na barra de ações fixa da ficha.
- `ocupado` mostra um giro no lugar do ícone, desabilita e marca `aria-busy` enquanto a API responde; mantenha o texto.
- `href` transforma o botão em link: use para **navegação** (Abrir turma, Ver ficha), assim Ctrl+clique e o botão do meio funcionam. Sem `href` é **ação** (`<button>`).
- Altura mínima `alvo-toque`. Ícone opcional à esquerda, sempre acompanhado de texto.

O consumidor fornece: `children` (texto), `onClick`, e opcionalmente `variante`, `icone`, `largo`, `ocupado`.
