# Aviso

Faixa de mensagem no fluxo da tela, com ícone e texto; não é janela nem toast.

| `tom` | Uso | Tokens |
|---|---|---|
| `info` | Contexto: ficha ilustrativa, regra do período | `semed-claro` + ícone `semed` |
| `atencao` | Prazo perto do fim, conflito a revisar | `enviada-*` |
| `erro` | Falha, e a orientação da coordenação numa ficha devolvida | `devolvida-*` |
| `sucesso` | Confirmação: "Ficha enviada à coordenação." | `validada-*` |

`titulo` opcional em negrito. `erro` é `role="alert"`; os outros, `role="status"`. Um aviso por assunto; não empilhe mais de dois.
