# SeloSituacao

Mostra a situação da ficha FLEO com palavra, ícone e cor fixos; nunca só a cor.

| `situacao` | Texto | Ícone | Tokens |
|---|---|---|---|
| `rascunho` | Rascunho | lápis | `rascunho-fundo` / `rascunho-tinta` |
| `enviada` | Aguardando conferência | relógio | `enviada-fundo` / `enviada-tinta` |
| `devolvida` | Ajuste solicitado | seta circular | `devolvida-fundo` / `devolvida-tinta` |
| `validada` | Validada | visto | `validada-fundo` / `validada-tinta` |

Use na lista de fichas, no topo da ficha aberta e no histórico. Não invente outros textos: são os nomes da regra de negócio (CLAUDE.md, seção 4). Módulos futuros com ciclo próprio ganham seu próprio selo, com os mesmos pares de cor.
