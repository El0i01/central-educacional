# SeloSincronia

Diz onde está o registro feito no celular sem internet: só no aparelho, na fila ou já no servidor.

- `aparelho` (Salvo no aparelho): gravado só neste celular.
- `aguardando` (Aguardando conexão): na fila de envio; sai sozinho quando a conexão voltar.
- `sincronizado` (Sincronizado): o rascunho chegou ao servidor.

**Sincronizado não é enviado nem validado.** Mostre o `SeloSincronia` ao lado do `SeloSituacao`, nunca no lugar dele: um registro pode estar "Sincronizado" e ainda "Rascunho". O selo é `role="status"`, então leitores de tela anunciam a mudança.
