// Quem enxerga o quê e quem escreve o quê (docs/modulos.md, seção 5; CLAUDE.md, seção 3).
// Funções puras: a API busca os vínculos no banco e aplica o resultado nas consultas.
// Nenhum módulo inventa regra de acesso própria: todos chamam este pacote.

import type { Perfil } from '@central/tipos';

export interface Vinculos {
  /** Escolas em acesso.usuario_escola (coordenação, equipe pedagógica). */
  escolas: number[];
  /** Turmas em rede.turma_professor (professor). */
  turmas: number[];
}

/**
 * Até onde o usuário enxerga a rede:
 * - `turmas`: só as turmas listadas (professor);
 * - `escolas`: só as escolas listadas e suas turmas (coordenação; equipe com vínculo);
 * - `rede`: a rede inteira;
 * - `nenhuma`: nada da rede (admin: configuração técnica).
 */
export type Abrangencia =
  | { tipo: 'turmas'; turmas: number[] }
  | { tipo: 'escolas'; escolas: number[] }
  | { tipo: 'rede' }
  | { tipo: 'nenhuma' };

export interface Escopo {
  abrangencia: Abrangencia;
  /** Pode ver nome e dados de estudante (dentro da abrangência). */
  nominal: boolean;
  /** Pode ver dado pedagógico (fichas, resultados). Gestor vê só agregado. */
  pedagogico: 'completo' | 'agregado' | 'nenhum';
}

export function escopo(perfil: Perfil, vinculos: Vinculos): Escopo {
  switch (perfil) {
    case 'professor':
      return {
        abrangencia: { tipo: 'turmas', turmas: [...vinculos.turmas] },
        nominal: true,
        pedagogico: 'completo',
      };
    case 'coordenacao':
      return {
        abrangencia: { tipo: 'escolas', escolas: [...vinculos.escolas] },
        nominal: true,
        pedagogico: 'completo',
      };
    case 'equipe_pedagogica':
      // Sem vínculo de escola = acompanha a rede inteira (a equipe da SEMED). Com vínculo,
      // fica restrita às escolas autorizadas.
      return {
        abrangencia:
          vinculos.escolas.length > 0
            ? { tipo: 'escolas', escolas: [...vinculos.escolas] }
            : { tipo: 'rede' },
        nominal: true,
        pedagogico: 'completo',
      };
    case 'gestor':
      return { abrangencia: { tipo: 'rede' }, nominal: false, pedagogico: 'agregado' };
    case 'cadastro':
      return { abrangencia: { tipo: 'rede' }, nominal: true, pedagogico: 'nenhum' };
    case 'admin':
      return { abrangencia: { tipo: 'nenhuma' }, nominal: false, pedagogico: 'nenhum' };
  }
}

/** A escola está dentro da abrangência? `turmasDaEscola` só importa para o professor. */
export function alcancaEscola(e: Escopo, escolaId: number, turmasDaEscola: number[] = []): boolean {
  const a = e.abrangencia;
  if (a.tipo === 'rede') return true;
  if (a.tipo === 'escolas') return a.escolas.includes(escolaId);
  if (a.tipo === 'turmas') return turmasDaEscola.some((t) => a.turmas.includes(t));
  return false;
}

/** A turma está dentro da abrangência? */
export function alcancaTurma(e: Escopo, turmaId: number, escolaDaTurma: number): boolean {
  const a = e.abrangencia;
  if (a.tipo === 'rede') return true;
  if (a.tipo === 'escolas') return a.escolas.includes(escolaDaTurma);
  if (a.tipo === 'turmas') return a.turmas.includes(turmaId);
  return false;
}

// --- Escrita na plataforma ---

export type AcaoPlataforma =
  | 'usuarios.ver'
  | 'usuarios.gerir'
  | 'rede.gerir' // escolas, anos letivos, turmas, estudantes, matrículas
  | 'turma.professores' // atribuir professores
  | 'importacao.matriculas'
  | 'config.gerir'
  | 'auditoria.ver'; // histórico de acessos e de acesso a dado nominal

const PERMISSOES: Record<AcaoPlataforma, Perfil[]> = {
  'usuarios.ver': ['admin', 'cadastro'],
  'usuarios.gerir': ['admin', 'cadastro'],
  'rede.gerir': ['cadastro'],
  'turma.professores': ['cadastro', 'coordenacao'],
  'importacao.matriculas': ['cadastro'],
  'config.gerir': ['admin'],
  'auditoria.ver': ['admin'],
};

export function pode(perfil: Perfil, acao: AcaoPlataforma): boolean {
  return PERMISSOES[acao].includes(perfil);
}

/**
 * Perfis que cada perfil pode criar ou atribuir. O responsável pelos cadastros abre contas da
 * escola (professor, coordenação); perfis da secretaria e técnicos só o admin.
 */
export function perfisAtribuiveis(quem: Perfil): Perfil[] {
  if (quem === 'admin') {
    return ['professor', 'coordenacao', 'equipe_pedagogica', 'gestor', 'cadastro', 'admin'];
  }
  if (quem === 'cadastro') return ['professor', 'coordenacao'];
  return [];
}
