import type { DefinicaoInstrumento } from '@central/tipos';
import { describe, expect, it } from 'vitest';
import {
  distribuicao,
  ErroRegra,
  podePreencher,
  respostasParaGravar,
  transicionar,
  validarRespostas,
  type EstadoFicha,
} from './index.js';

const OPCOES = ['Ainda não observado', 'Em desenvolvimento', 'Observado'];
const definicao: DefinicaoInstrumento = {
  itens: [
    { id: 'l1', eixo: 'Leitura', enunciado: 'Lê palavras', opcoes: OPCOES },
    { id: 'e1', eixo: 'Escrita', enunciado: 'Escreve palavras', opcoes: OPCOES },
    { id: 'o1', eixo: 'Oralidade', enunciado: 'Reconta história', opcoes: OPCOES },
  ],
};
const completas = { l1: 'Observado', e1: 'Em desenvolvimento', o1: 'Observado' };

function ficha(parcial: Partial<EstadoFicha> = {}): EstadoFicha {
  return {
    situacao: 'rascunho',
    presenca: 'presente',
    respostas: completas,
    aplicacaoAberta: true,
    definicao,
    ...parcial,
  };
}

function falha(fn: () => unknown, status: number) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ErroRegra);
    expect((e as ErroRegra).status).toBe(status);
    return;
  }
  throw new Error('deveria ter falhado');
}

describe('preenchimento', () => {
  it('só o professor, em rascunho ou devolvida, com o período aberto', () => {
    expect(podePreencher('professor', 'rascunho', true)).toBe(true);
    expect(podePreencher('professor', 'devolvida', true)).toBe(true);
    expect(podePreencher('professor', 'enviada', true)).toBe(false);
    expect(podePreencher('professor', 'rascunho', false)).toBe(false);
    expect(podePreencher('coordenacao', 'rascunho', true)).toBe(false);
  });

  it('recusa opção que não existe na versão do instrumento', () => {
    falha(() => validarRespostas(definicao, { l1: 'Excelente' }), 400);
    falha(() => validarRespostas(definicao, { x9: 'Observado' }), 400);
    expect(() => validarRespostas(definicao, { l1: 'Observado' })).not.toThrow();
  });

  it('ausente e não avaliado não guardam respostas', () => {
    expect(respostasParaGravar('ausente', completas)).toEqual({});
    expect(respostasParaGravar('nao_avaliado', completas)).toEqual({});
    expect(respostasParaGravar('presente', completas)).toBe(completas);
  });
});

describe('transições', () => {
  it('professor envia ficha completa', () => {
    expect(transicionar('professor', ficha(), 'enviar').situacao).toBe('enviada');
  });

  it('envio exige todos os itens, exceto para ausente', () => {
    falha(() => transicionar('professor', ficha({ respostas: { l1: 'Observado' } }), 'enviar'), 400);
    expect(
      transicionar('professor', ficha({ presenca: 'ausente', respostas: {} }), 'enviar').situacao,
    ).toBe('enviada');
  });

  it('não envia com período encerrado nem ficha já enviada', () => {
    falha(() => transicionar('professor', ficha({ aplicacaoAberta: false }), 'enviar'), 409);
    falha(() => transicionar('professor', ficha({ situacao: 'enviada' }), 'enviar'), 409);
  });

  it('só o professor envia e só a coordenação revisa', () => {
    falha(() => transicionar('coordenacao', ficha(), 'enviar'), 403);
    falha(() => transicionar('professor', ficha({ situacao: 'enviada' }), 'validar'), 403);
    falha(() => transicionar('equipe_pedagogica', ficha({ situacao: 'enviada' }), 'validar'), 403);
  });

  it('coordenação valida ou devolve com orientação', () => {
    const enviada = ficha({ situacao: 'enviada' });
    expect(transicionar('coordenacao', enviada, 'validar')).toMatchObject({
      situacao: 'validada',
      orientacao: null,
    });
    falha(() => transicionar('coordenacao', enviada, 'devolver', '  '), 400);
    expect(transicionar('coordenacao', enviada, 'devolver', ' Confira a escrita. ')).toMatchObject({
      situacao: 'devolvida',
      orientacao: 'Confira a escrita.',
    });
  });

  it('só revisa ficha enviada', () => {
    falha(() => transicionar('coordenacao', ficha(), 'validar'), 409);
  });

  it('reabrir exige ficha validada e justificativa', () => {
    falha(() => transicionar('coordenacao', ficha({ situacao: 'enviada' }), 'reabrir', 'x'), 409);
    falha(() => transicionar('coordenacao', ficha({ situacao: 'validada' }), 'reabrir'), 400);
    expect(
      transicionar('coordenacao', ficha({ situacao: 'validada' }), 'reabrir', 'Erro de digitação')
        .situacao,
    ).toBe('devolvida');
  });
});

describe('distribuição', () => {
  it('conta só validadas de estudantes acompanhados, por item e na ordem da escala', () => {
    const linhas = distribuicao([
      { situacao: 'validada', presenca: 'presente', respostas: completas, definicao },
      {
        situacao: 'validada',
        presenca: 'presente',
        respostas: { l1: 'Ainda não observado', e1: 'Em desenvolvimento', o1: 'Observado' },
        definicao,
      },
      { situacao: 'enviada', presenca: 'presente', respostas: completas, definicao },
      { situacao: 'validada', presenca: 'ausente', respostas: {}, definicao },
    ]);
    expect(linhas).toEqual([
      { eixo: 'Leitura', item: 'Lê palavras', opcao: 'Ainda não observado', quantidade: 1 },
      { eixo: 'Leitura', item: 'Lê palavras', opcao: 'Observado', quantidade: 1 },
      { eixo: 'Escrita', item: 'Escreve palavras', opcao: 'Em desenvolvimento', quantidade: 2 },
      { eixo: 'Oralidade', item: 'Reconta história', opcao: 'Observado', quantidade: 2 },
    ]);
  });
});
