import type { ReactNode, ReactElement } from 'react';

export interface BotaoProps {
  /** primario: uma vez por tela (Enviar, Validar). perigo: Devolver, Reabrir. */
  variante?: 'primario' | 'secundario' | 'discreto' | 'perigo';
  icone?: 'visto' | 'voltar' | 'relogio' | 'lapis' | 'seta';
  largo?: boolean;
  /** Com href o Botao vira link: use para navegação (Abrir turma). Sem href, é ação. */
  href?: string;
  /** Mostra o giro no lugar do ícone e desabilita; mantenha o texto. */
  ocupado?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

export interface SeloSituacaoProps {
  situacao: 'rascunho' | 'enviada' | 'devolvida' | 'validada';
  className?: string;
}

export interface SeloSincroniaProps {
  /** aparelho: só no celular · aguardando: na fila · sincronizado: chegou ao servidor. */
  estado: 'aparelho' | 'aguardando' | 'sincronizado';
  className?: string;
}

export interface CampoProps {
  id: string;
  rotulo: string;
  ajuda?: string;
  erro?: string;
  /** Um único input, select ou textarea; recebe id, classe e aria. */
  children: ReactElement;
  className?: string;
}

export interface EscalaOpcoesProps {
  nome: string;
  enunciado: string;
  /** Na ordem da escala do instrumento, da menos à mais desenvolvida. */
  opcoes: string[];
  valor?: string;
  onChange?: (opcao: string) => void;
  disabled?: boolean;
  className?: string;
}

export interface AvisoProps {
  tom?: 'info' | 'atencao' | 'erro' | 'sucesso';
  titulo?: string;
  children?: ReactNode;
  className?: string;
}

export interface ProgressoProps {
  valor: number;
  total: number;
  rotulo?: string;
  className?: string;
}

export interface CartaoTurmaProps {
  nome: string;
  etapa: string;
  escola: string;
  estudantes: number;
  enviadas: number;
  validadas: number;
  /** Link da turma (preferível a onAbrir: é navegação). */
  href?: string;
  onAbrir?: () => void;
  /** Nível do título (padrão 3) para manter a hierarquia da página. */
  nivelTitulo?: 2 | 3 | 4;
  className?: string;
}

export declare function Botao(props: BotaoProps): ReactElement;
export declare function SeloSituacao(props: SeloSituacaoProps): ReactElement;
export declare function SeloSincronia(props: SeloSincroniaProps): ReactElement;
export declare function Campo(props: CampoProps): ReactElement;
export declare function EscalaOpcoes(props: EscalaOpcoesProps): ReactElement;
export declare function Aviso(props: AvisoProps): ReactElement;
export declare function Progresso(props: ProgressoProps): ReactElement;
export declare function CartaoTurma(props: CartaoTurmaProps): ReactElement;
