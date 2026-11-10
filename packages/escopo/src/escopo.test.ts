import { describe, expect, it } from 'vitest';
import { alcancaEscola, alcancaTurma, escopo, perfisAtribuiveis, pode } from './index.js';

const v = { escolas: [1], turmas: [10, 11] };

describe('escopo por perfil', () => {
  it('professor: só as suas turmas, com nome e pedagógico', () => {
    const e = escopo('professor', v);
    expect(e.abrangencia).toEqual({ tipo: 'turmas', turmas: [10, 11] });
    expect(e.nominal).toBe(true);
    expect(alcancaTurma(e, 10, 1)).toBe(true);
    expect(alcancaTurma(e, 12, 1)).toBe(false); // outra turma da mesma escola
    expect(alcancaEscola(e, 1, [10, 12])).toBe(true);
    expect(alcancaEscola(e, 2, [20])).toBe(false);
  });

  it('coordenação: a escola inteira, nada de outra escola', () => {
    const e = escopo('coordenacao', v);
    expect(alcancaTurma(e, 99, 1)).toBe(true);
    expect(alcancaTurma(e, 20, 2)).toBe(false);
    expect(alcancaEscola(e, 2)).toBe(false);
  });

  it('coordenação sem vínculo não enxerga nenhuma escola', () => {
    const e = escopo('coordenacao', { escolas: [], turmas: [] });
    expect(alcancaEscola(e, 1)).toBe(false);
  });

  it('equipe pedagógica: rede inteira sem vínculo, só as escolas com vínculo', () => {
    expect(escopo('equipe_pedagogica', { escolas: [], turmas: [] }).abrangencia).toEqual({ tipo: 'rede' });
    const restrita = escopo('equipe_pedagogica', { escolas: [3], turmas: [] });
    expect(alcancaEscola(restrita, 3)).toBe(true);
    expect(alcancaEscola(restrita, 1)).toBe(false);
  });

  it('gestor: rede inteira, sem nome de estudante, pedagógico só agregado', () => {
    const e = escopo('gestor', v);
    expect(e.abrangencia).toEqual({ tipo: 'rede' });
    expect(e.nominal).toBe(false);
    expect(e.pedagogico).toBe('agregado');
  });

  it('cadastro: rede inteira com identificação, sem pedagógico', () => {
    const e = escopo('cadastro', v);
    expect(e.nominal).toBe(true);
    expect(e.pedagogico).toBe('nenhum');
  });

  it('admin: nada da rede por padrão', () => {
    const e = escopo('admin', v);
    expect(alcancaEscola(e, 1)).toBe(false);
    expect(alcancaTurma(e, 10, 1)).toBe(false);
    expect(e.nominal).toBe(false);
  });

  it('não devolve as listas de vínculo por referência', () => {
    const vinc = { escolas: [1], turmas: [10] };
    const e = escopo('professor', vinc);
    vinc.turmas.push(99);
    expect(alcancaTurma(e, 99, 1)).toBe(false);
  });
});

describe('escrita na plataforma', () => {
  it('rede e importação só pelo responsável pelos cadastros', () => {
    expect(pode('cadastro', 'rede.gerir')).toBe(true);
    expect(pode('admin', 'rede.gerir')).toBe(false);
    expect(pode('coordenacao', 'rede.gerir')).toBe(false);
    expect(pode('cadastro', 'importacao.matriculas')).toBe(true);
    expect(pode('equipe_pedagogica', 'importacao.matriculas')).toBe(false);
  });

  it('coordenação atribui professores; configuração só o admin', () => {
    expect(pode('coordenacao', 'turma.professores')).toBe(true);
    expect(pode('professor', 'turma.professores')).toBe(false);
    expect(pode('admin', 'config.gerir')).toBe(true);
    expect(pode('cadastro', 'config.gerir')).toBe(false);
  });

  it('cadastro só cria contas da escola; admin cria qualquer perfil', () => {
    expect(perfisAtribuiveis('cadastro')).toEqual(['professor', 'coordenacao']);
    expect(perfisAtribuiveis('admin')).toContain('admin');
    expect(perfisAtribuiveis('coordenacao')).toEqual([]);
  });
});
