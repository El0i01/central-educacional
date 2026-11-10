// Peças comuns das telas da plataforma. Viram componentes de @central/ui na tarefa 0.6.

import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

export function Pagina(props: {
  rotulo?: string;
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {props.rotulo && (
            <p className="font-mono text-xs tracking-widest text-tinta-suave uppercase">{props.rotulo}</p>
          )}
          <h1 className="mt-1 text-2xl font-semibold text-semed-escuro sm:text-3xl">{props.titulo}</h1>
          {props.descricao && <p className="mt-1 max-w-[72ch] text-tinta-suave">{props.descricao}</p>}
        </div>
        {props.acoes && <div className="flex flex-wrap gap-2">{props.acoes}</div>}
      </div>
      {props.children}
    </div>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-tinta-suave" role="status">
      <LoaderCircle className="ce-girando" size={18} aria-hidden /> {texto}
    </div>
  );
}

export function Aviso({ tom = 'info', titulo, children }: { tom?: 'info' | 'atencao' | 'erro' | 'sucesso'; titulo?: string; children: ReactNode }) {
  return (
    <div className={`ce-aviso ce-aviso-${tom}`} role={tom === 'erro' ? 'alert' : 'status'}>
      <div className="ce-aviso-corpo">
        {titulo && <strong>{titulo}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Campo(props: { id: string; rotulo: string; ajuda?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`ce-campo ${props.className ?? ''}`}>
      <label className="ce-rotulo" htmlFor={props.id}>
        {props.rotulo}
      </label>
      {props.children}
      {props.ajuda && <p className="ce-ajuda">{props.ajuda}</p>}
    </div>
  );
}

/** Carrega dados da API; `recarregar` busca de novo depois de uma ação. */
export function useDados<T>(buscar: () => Promise<T>, deps: unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState('');
  const carregar = useCallback(buscar, deps);
  const recarregar = useCallback(async () => {
    setErro('');
    try {
      setDados(await carregar());
    } catch (e) {
      setErro((e as Error).message);
    }
  }, [carregar]);
  useEffect(() => {
    setDados(null);
    void recarregar();
  }, [recarregar]);
  return { dados, erro, recarregar, setDados };
}

/** "2018-05-10" → "10/05/2018", sem passar por fuso horário. */
export function dataBr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export function dataHoraBr(iso: string | null | undefined): string {
  return iso ? DATA_HORA.format(new Date(iso)) : '—';
}

export function Selo({ tom, children }: { tom: 'rascunho' | 'enviada' | 'devolvida' | 'validada' | 'semed'; children: ReactNode }) {
  return <span className={`ce-selo ce-selo-${tom}`}>{children}</span>;
}
