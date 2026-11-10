// Contratos da API: o que a web (e depois o app) recebe e envia.

// CLAUDE.md, seção 3; docs/modulos.md, seção 5.
export type Perfil =
  | 'professor'
  | 'coordenacao'
  | 'equipe_pedagogica'
  | 'gestor'
  | 'cadastro'
  | 'admin';

export const PERFIS: Perfil[] = [
  'professor',
  'coordenacao',
  'equipe_pedagogica',
  'gestor',
  'cadastro',
  'admin',
];

export const ROTULO_PERFIL: Record<Perfil, string> = {
  professor: 'Professor',
  coordenacao: 'Coordenação escolar',
  equipe_pedagogica: 'Equipe pedagógica da SEMED',
  gestor: 'Gestão da SEMED',
  cadastro: 'Responsável pelos cadastros',
  admin: 'Administrador',
};

// --- Registro de módulos (crescimento horizontal: docs/modulos.md, seção 1) ---

export type CodigoModulo = 'fleo' | 'avaliacao' | 'indicador' | 'programa' | 'intervencao';

export interface ModuloAtivo {
  codigo: CodigoModulo;
  nome: string;
  /** Caminho base na web (ex.: '/fleo'). */
  caminho: string;
  /** Perfis que veem o módulo no menu. */
  perfis: Perfil[];
}

export interface Usuario {
  id: number;
  login: string;
  nome: string;
  perfil: Perfil;
  ativo: boolean;
  trocarSenha: boolean;
}

export interface LoginPedido {
  login: string;
  senha: string;
  manter?: boolean;
}

export interface LoginResposta {
  token: string;
  usuario: Usuario;
}

export interface Saude {
  api: 'ok';
  banco: 'ok' | 'indisponivel';
}

// --- Rede ---

export interface TurmaResumo {
  id: number;
  nome: string;
  etapa: string;
  anoLetivo: number;
  escola: string;
  estudantes: number;
  enviadas: number;
  validadas: number;
}

// --- FLEO ---

export type Eixo = 'Leitura' | 'Escrita' | 'Oralidade';
export const EIXOS: Eixo[] = ['Leitura', 'Escrita', 'Oralidade'];

export interface ItemInstrumento {
  id: string;
  eixo: Eixo;
  enunciado: string;
  /** Opções na ordem da escala (da menos à mais desenvolvida). */
  opcoes: string[];
}

export interface DefinicaoInstrumento {
  itens: ItemInstrumento[];
}

export interface Instrumento {
  id: number;
  codigo: string;
  versao: number;
  nome: string;
  ilustrativo: boolean;
  definicao: DefinicaoInstrumento;
}

export type SituacaoFicha = 'rascunho' | 'enviada' | 'devolvida' | 'validada';
export type Presenca = 'presente' | 'ausente' | 'nao_avaliado';
export type AcaoFicha = 'enviar' | 'validar' | 'devolver' | 'reabrir';

export const ROTULO_SITUACAO: Record<SituacaoFicha, string> = {
  rascunho: 'Rascunho',
  enviada: 'Aguardando conferência',
  devolvida: 'Ajuste solicitado',
  validada: 'Validada',
};

export const ROTULO_PRESENCA: Record<Presenca, string> = {
  presente: 'Estudante acompanhado',
  ausente: 'Ausente',
  nao_avaliado: 'Não avaliado',
};

export interface Ficha {
  id: number;
  estudante: string;
  turmaId: number;
  turma: string;
  escola: string;
  aplicacao: string;
  aplicacaoAberta: boolean;
  instrumento: Instrumento;
  situacao: SituacaoFicha;
  presenca: Presenca;
  respostas: Record<string, string>;
  observacao: string;
  orientacao: string | null;
  versao: number;
  atualizadoEm: string;
}

export interface SalvarFichaPedido {
  versao: number;
  presenca: Presenca;
  respostas: Record<string, string>;
  observacao: string;
}

export interface TransicaoPedido {
  versao: number;
  acao: AcaoFicha;
  motivo?: string;
}

export interface EventoHistorico {
  id: number;
  acao: string;
  autor: string | null;
  motivo: string | null;
  criadoEm: string;
}

export interface LinhaDistribuicao {
  eixo: Eixo;
  item: string;
  opcao: string;
  quantidade: number;
}

export interface Resumo {
  turmas: number;
  estudantes: number;
  enviadas: number;
  validadas: number;
  pendentes: number;
  distribuicao: LinhaDistribuicao[];
}
