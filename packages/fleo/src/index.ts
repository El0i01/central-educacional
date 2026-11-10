// Regras da FLEO Digital (CLAUDE.md, seção 3) como funções puras.
// A API só aplica o resultado; nenhuma regra de situação mora nas rotas.

import type {
  AcaoFicha,
  DefinicaoInstrumento,
  LinhaDistribuicao,
  Perfil,
  Presenca,
  SituacaoFicha,
} from '@central/tipos';

export class ErroRegra extends Error {
  constructor(
    /** Status HTTP sugerido: 400 dado inválido, 403 perfil, 409 situação. */
    public status: 400 | 403 | 409,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const EDITAVEIS: SituacaoFicha[] = ['rascunho', 'devolvida'];

/** O professor só preenche ficha em rascunho ou devolvida, com o período aberto. */
export function podePreencher(
  perfil: Perfil,
  situacao: SituacaoFicha,
  aplicacaoAberta: boolean,
): boolean {
  return perfil === 'professor' && EDITAVEIS.includes(situacao) && aplicacaoAberta;
}

/**
 * Confere as respostas contra a versão do instrumento da ficha.
 * `completa`: exige todos os itens (envio). Rascunho aceita parcial.
 */
export function validarRespostas(
  definicao: DefinicaoInstrumento,
  respostas: Record<string, string>,
  completa = false,
): void {
  for (const [id, valor] of Object.entries(respostas)) {
    const item = definicao.itens.find((i) => i.id === id);
    if (!item || !item.opcoes.includes(valor)) {
      throw new ErroRegra(400, 'Resposta não pertence a esta versão da ficha.');
    }
  }
  if (completa) {
    const faltando = definicao.itens.filter((i) => !respostas[i.id]);
    if (faltando.length > 0) {
      throw new ErroRegra(400, `Preencha todos os itens antes de enviar (faltam ${faltando.length}).`);
    }
  }
}

/** Ausente ou não avaliado não recebe resultado de aprendizagem: as respostas são descartadas. */
export function respostasParaGravar(
  presenca: Presenca,
  respostas: Record<string, string>,
): Record<string, string> {
  return presenca === 'presente' ? respostas : {};
}

export interface EstadoFicha {
  situacao: SituacaoFicha;
  presenca: Presenca;
  respostas: Record<string, string>;
  aplicacaoAberta: boolean;
  definicao: DefinicaoInstrumento;
}

export interface ResultadoTransicao {
  situacao: SituacaoFicha;
  /** Orientação que fica na ficha (null limpa). */
  orientacao: string | null;
  /** Texto do histórico. */
  rotulo: string;
}

/**
 * Transição de situação:
 *   rascunho/devolvida --enviar (professor)--> enviada
 *   enviada --validar (coordenação)--> validada
 *   enviada --devolver + orientação (coordenação)--> devolvida
 *   validada --reabrir + justificativa (coordenação)--> devolvida
 */
export function transicionar(
  perfil: Perfil,
  ficha: EstadoFicha,
  acao: AcaoFicha,
  motivo?: string | null,
): ResultadoTransicao {
  const texto = motivo?.trim() || null;

  if (acao === 'enviar') {
    if (perfil !== 'professor') {
      throw new ErroRegra(403, 'Apenas o professor responsável envia a ficha.');
    }
    if (!EDITAVEIS.includes(ficha.situacao)) throw new ErroRegra(409, 'A ficha já foi enviada.');
    if (!ficha.aplicacaoAberta) {
      throw new ErroRegra(409, 'O período de preenchimento está encerrado.');
    }
    if (ficha.presenca === 'presente') validarRespostas(ficha.definicao, ficha.respostas, true);
    return { situacao: 'enviada', orientacao: null, rotulo: 'Enviada à coordenação' };
  }

  if (perfil !== 'coordenacao') {
    throw new ErroRegra(403, 'Apenas a coordenação da escola revisa a ficha.');
  }

  if (acao === 'reabrir') {
    if (ficha.situacao !== 'validada') {
      throw new ErroRegra(409, 'Apenas fichas validadas podem ser reabertas.');
    }
    if (!texto) throw new ErroRegra(400, 'Informe a justificativa da reabertura.');
    return { situacao: 'devolvida', orientacao: texto, rotulo: 'Ficha reaberta' };
  }

  if (ficha.situacao !== 'enviada') {
    throw new ErroRegra(409, 'A ficha precisa estar enviada para revisão.');
  }
  if (acao === 'validar') {
    return { situacao: 'validada', orientacao: null, rotulo: 'Ficha validada' };
  }
  if (!texto) throw new ErroRegra(400, 'Informe a orientação para o ajuste.');
  return { situacao: 'devolvida', orientacao: texto, rotulo: 'Devolvida para ajuste' };
}

export interface FichaParaResultado {
  situacao: SituacaoFicha;
  presenca: Presenca;
  respostas: Record<string, string>;
  definicao: DefinicaoInstrumento;
}

/**
 * Distribuição de aprendizagem: só fichas validadas de estudantes acompanhados.
 * Agrupa por item (não só por eixo), na ordem das opções do instrumento.
 */
export function distribuicao(fichas: FichaParaResultado[]): LinhaDistribuicao[] {
  const contagem = new Map<string, LinhaDistribuicao>();
  const ordem: string[] = [];
  for (const f of fichas) {
    if (f.situacao !== 'validada' || f.presenca !== 'presente') continue;
    for (const item of f.definicao.itens) {
      for (const opcao of item.opcoes) {
        const chave = `${item.id}\u0000${opcao}`;
        if (!contagem.has(chave)) {
          contagem.set(chave, { eixo: item.eixo, item: item.enunciado, opcao, quantidade: 0 });
          ordem.push(chave);
        }
      }
      const resposta = f.respostas[item.id];
      if (resposta) contagem.get(`${item.id}\u0000${resposta}`)!.quantidade++;
    }
  }
  return ordem.map((c) => contagem.get(c)!).filter((l) => l.quantidade > 0);
}
