import { describe, expect, it } from 'vitest';
import { analisarMatriculas, lerCsv, lerData, lerEtapa, lerTurno, MODELO_MATRICULAS } from './index.js';

describe('leitura de CSV', () => {
  it('detecta ; e , e lida com aspas, BOM e CRLF', () => {
    const a = lerCsv('\uFEFFescola;turma\r\n"Escola ""A""; centro";2º A\r\n\r\n');
    expect(a.cabecalho).toEqual(['escola', 'turma']);
    expect(a.linhas).toEqual([['Escola "A"; centro', '2º A']]);
    const b = lerCsv('escola,turma\nX,"1º, B"');
    expect(b.linhas).toEqual([['X', '1º, B']]);
  });
});

describe('campos', () => {
  it('etapa em vários formatos', () => {
    expect(lerEtapa('EF2')).toBe('EF2');
    expect(lerEtapa('2º ano')).toBe('EF2');
    expect(lerEtapa('2 ano')).toBe('EF2');
    expect(lerEtapa('9')).toBe('EF9');
    expect(lerEtapa('Pré I')).toBe('EI4');
    expect(lerEtapa('pre II')).toBe('EI5');
    expect(lerEtapa('10º ano')).toBeNull();
    expect(lerEtapa('EJA')).toBeNull();
  });

  it('turno e data', () => {
    expect(lerTurno('Manhã')).toBe('matutino');
    expect(lerTurno('')).toBeNull();
    expect(lerTurno('madrugada')).toBe('invalido');
    expect(lerData('10/05/2018')).toBe('2018-05-10');
    expect(lerData('2018-05-10')).toBe('2018-05-10');
    expect(lerData('31/02/2018')).toBe('invalida');
    expect(lerData('01/01/2999')).toBe('invalida');
    expect(lerData('')).toBeNull();
  });
});

describe('análise da planilha de matrículas', () => {
  it('o modelo oferecido para baixar passa sem problemas', () => {
    const r = analisarMatriculas(lerCsv(MODELO_MATRICULAS));
    expect(r.faltando).toEqual([]);
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0]!.problemas).toEqual([]);
    expect(r.linhas[0]!.dados).toMatchObject({ escolaInep: '11000001', etapa: 'EF2', turno: 'matutino', dataNascimento: '2018-05-10' });
  });

  it('cabeçalho sem coluna obrigatória diz o que falta', () => {
    expect(analisarMatriculas(lerCsv('escola;aluno\nX;Y')).faltando).toEqual(['turma', 'etapa']);
  });

  it('aceita nomes de coluna comuns (Aluno, Série, Data de Nascimento)', () => {
    const r = analisarMatriculas(lerCsv('Escola;Turma;Série;Aluno;Data de Nascimento\nEscola B;1º A;1º ano;Estudante 02;01/02/2019'));
    expect(r.faltando).toEqual([]);
    expect(r.linhas[0]!.problemas).toEqual([]);
  });

  it('aponta problemas por linha, com o número da planilha', () => {
    const r = analisarMatriculas(
      lerCsv(
        'escola_inep;turma;etapa;estudante;data_nascimento;inep_estudante\n' +
          '123;2º A;2º ano;Estudante 01;10/05/2018;\n' +
          '11000001;2º A;quinto;;31/02/2018;99\n' +
          '11000001;2º A;2º ano;Estudante 03;;\n' +
          '11000001;2º A;2º ano;  estudante   03 ;;\n',
      ),
    );
    expect(r.linhas.map((l) => l.numero)).toEqual([2, 3, 4, 5]);
    expect(r.linhas[0]!.problemas).toEqual(['INEP da escola precisa ter 8 dígitos.']);
    expect(r.linhas[1]!.problemas).toHaveLength(4);
    expect(r.linhas[2]!.problemas).toEqual([]);
    expect(r.linhas[3]!.problemas).toEqual(['Repete a linha 4.']);
  });
});
