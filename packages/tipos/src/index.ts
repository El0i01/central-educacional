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

// --- Plataforma: gestão de usuários (M01, UC-A04 a A06) ---

export interface UsuarioGestao {
  id: number;
  login: string;
  nome: string;
  perfil: Perfil;
  ativo: boolean;
  /** Senha provisória ainda não trocada. */
  trocarSenha: boolean;
  bloqueado: boolean;
  /** Escolas vinculadas (coordenação, equipe pedagógica). */
  escolas: number[];
}

export interface ListaUsuarios {
  usuarios: UsuarioGestao[];
  /** Perfis que quem está logado pode criar ou atribuir. */
  perfisAtribuiveis: Perfil[];
}

export interface CriarUsuarioPedido {
  login: string;
  nome: string;
  perfil: Perfil;
  escolas?: number[];
}

export interface EditarUsuarioPedido {
  nome?: string;
  perfil?: Perfil;
  ativo?: boolean;
  escolas?: number[];
}

/** A senha provisória aparece uma única vez, nesta resposta. */
export interface SenhaProvisoriaResposta {
  usuario: UsuarioGestao;
  senhaProvisoria: string;
  expiraEm: string;
}

// --- Plataforma: rede escolar (M02, UC-R01 a R09) ---

export type Zona = 'urbana' | 'rural';
export type Turno = 'matutino' | 'vespertino' | 'noturno' | 'integral';
export type SituacaoMatricula = 'ativa' | 'transferida' | 'abandono' | 'concluida';

export const ETAPAS = ['EI4', 'EI5', 'EF1', 'EF2', 'EF3', 'EF4', 'EF5', 'EF6', 'EF7', 'EF8', 'EF9'] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ROTULO_ETAPA: Record<Etapa, string> = {
  EI4: 'Pré I (4 anos)',
  EI5: 'Pré II (5 anos)',
  EF1: '1º ano',
  EF2: '2º ano',
  EF3: '3º ano',
  EF4: '4º ano',
  EF5: '5º ano',
  EF6: '6º ano',
  EF7: '7º ano',
  EF8: '8º ano',
  EF9: '9º ano',
};

export const ROTULO_SITUACAO_MATRICULA: Record<SituacaoMatricula, string> = {
  ativa: 'Ativa',
  transferida: 'Transferida',
  abandono: 'Abandono',
  concluida: 'Concluída',
};

export interface Escola {
  id: number;
  inep: string | null;
  nome: string;
  zona: Zona;
  ativa: boolean;
  turmas: number;
  matriculasAtivas: number;
}

export interface AnoLetivo {
  ano: number;
  inicio: string;
  fim: string;
}

export interface TurmaLista {
  id: number;
  escolaId: number;
  escola: string;
  anoLetivo: number;
  nome: string;
  etapa: Etapa;
  turno: Turno | null;
  estudantes: number;
  professores: string[];
}

export interface ProfessorTurma {
  usuarioId: number;
  nome: string;
  papel: 'regente' | 'apoio';
}

export interface MatriculaTurma {
  id: number;
  estudanteId: number;
  nome: string;
  dataNascimento: string | null;
  codigoInep: string | null;
  situacao: SituacaoMatricula;
}

export interface TurmaDetalhe extends TurmaLista {
  professoresTurma: ProfessorTurma[];
  /** null quando o perfil não pode ver nome de estudante (gestor). */
  matriculas: MatriculaTurma[] | null;
  /** O que quem está vendo pode fazer nesta turma. */
  pode: { editar: boolean; atribuirProfessores: boolean; matricular: boolean };
}

export interface TransferirPedido {
  /** Turma de destino, no mesmo ano letivo (outra escola ou a mesma). */
  turmaId: number;
  motivo?: string | null;
}

/** Uma matrícula na trajetória do estudante pela rede (UC-R07). */
export interface TrajetoriaItem {
  matriculaId: number;
  anoLetivo: number;
  escola: string;
  turma: string;
  etapa: Etapa;
  situacao: SituacaoMatricula;
}

export interface MatricularPedido {
  /** Estudante já cadastrado na rede, ou os dados de um novo. */
  estudanteId?: number;
  nome?: string;
  dataNascimento?: string | null;
  codigoInep?: string | null;
  /** Confirma que é outra pessoa, mesmo com nome e nascimento iguais a um cadastro existente. */
  confirmarNovo?: boolean;
}

export interface PossivelDuplicado {
  estudanteId: number;
  nome: string;
  dataNascimento: string | null;
  turmaAtual: string | null;
}

// --- Plataforma: importação (M09, UC-M01 a M05) ---

export type SituacaoLote = 'com_inconsistencias' | 'pronto' | 'publicado' | 'descartado' | 'desfeito';

export const ROTULO_SITUACAO_LOTE: Record<SituacaoLote, string> = {
  com_inconsistencias: 'Com inconsistências',
  pronto: 'Pronto para publicar',
  publicado: 'Publicado',
  descartado: 'Descartado',
  desfeito: 'Desfeito',
};

export interface LinhaImportacao {
  numero: number;
  dados: {
    escolaInep?: string | null;
    escola?: string | null;
    turma?: string;
    etapa?: Etapa;
    turno?: Turno | null;
    estudante?: string;
    dataNascimento?: string | null;
    inepEstudante?: string | null;
  };
  /** nova: vai criar a matrícula · ja_existe: nada a fazer · problema: precisa corrigir ou ignorar. */
  situacao: 'nova' | 'ja_existe' | 'problema';
  problemas: string[];
  ignorar: boolean;
}

export interface LoteImportacao {
  id: number;
  tipo: 'matriculas';
  arquivoNome: string;
  anoLetivo: number;
  situacao: SituacaoLote;
  total: number;
  novas: number;
  jaExistentes: number;
  comProblema: number;
  ignoradas: number;
  /** Outro lote já publicado com o mesmo arquivo. */
  mesmoArquivoPublicadoEm: string | null;
  resumo: { matriculasCriadas: number; turmasCriadas: number; estudantesCriados: number } | null;
  criadoPor: string;
  criadoEm: string;
  publicadoEm: string | null;
  desfeitoEm: string | null;
  desfeitoMotivo: string | null;
  /** Só a última publicação pode ser desfeita (e só por quem importa). */
  podeDesfazer: boolean;
  linhas?: LinhaImportacao[];
}

export interface NovaImportacaoPedido {
  tipo: 'matriculas';
  arquivoNome: string;
  conteudo: string;
  anoLetivo?: number;
}

// --- Plataforma: configuração e histórico de acessos (UC-A07, A08) ---

export interface ModuloConfig extends ModuloAtivo {
  ativo: boolean;
}

export type TipoRegistroAcesso = 'entradas' | 'nominal' | 'alteracoes';

export interface RegistroAcesso {
  id: number;
  quando: string;
  /** null = o sistema (ex.: bloqueio automático). */
  usuario: string | null;
  login: string | null;
  /** entradas e alterações: 'acesso', 'rede'...; nominal: o contexto ('rede.turma'). */
  modulo: string;
  acao: string;
  entidade: string | null;
  entidadeId: number | null;
  motivo: string | null;
  /** nominal: quantos estudantes tiveram o nome exibido naquela abertura de tela. */
  estudantes: number | null;
}

export interface ListaRegistrosAcesso {
  itens: RegistroAcesso[];
  total: number;
  pagina: number;
  porPagina: number;
}
