import { ROTULO_PERFIL, type ModuloAtivo } from '@central/tipos';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSessao } from '../sessao';

/** Painel inicial (UC-L01). Na Fase 0 mostra a sessão e os módulos ligados para este perfil. */
export function Inicio({ modulos }: { modulos: ModuloAtivo[] }) {
  const { usuario } = useSessao();
  if (!usuario) return null;
  const primeiroNome = usuario.nome.split(' ')[0];

  return (
    <div className="grid gap-8">
      <div>
        <p className="font-mono text-xs tracking-widest text-tinta-suave uppercase">Rede municipal de ensino</p>
        <h1 className="mt-2 text-3xl font-semibold text-semed-escuro">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-tinta-suave">
          Você entrou como <strong className="text-tinta">{ROTULO_PERFIL[usuario.perfil]}</strong>.
        </p>
      </div>

      <div className="ce-aviso ce-aviso-info" role="status">
        Ambiente de desenvolvimento, Fase 0. Somente dados fictícios.
      </div>

      <section className="grid gap-4">
        <h2 className="text-lg font-medium">Seus módulos</h2>
        {modulos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modulos.map((m) => (
              <Link
                key={m.codigo}
                to={m.caminho}
                className="ce-cartao no-underline transition-colors hover:border-semed"
              >
                <span className="ce-cartao-icone">
                  <ClipboardList size={20} aria-hidden />
                </span>
                <h3 className="ce-cartao-titulo">{m.nome}</h3>
                <span className="flex items-center gap-1 font-semibold text-semed">
                  Abrir <ChevronRight size={16} aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-linha bg-superficie p-6 text-tinta-suave">
            {usuario.perfil === 'admin'
              ? 'O administrador cuida de usuários e configuração, sem dados pedagógicos. As telas de usuários entram na Fase 1.'
              : 'Nenhum módulo ligado para o seu perfil. Fale com a SEMED.'}
          </div>
        )}
      </section>
    </div>
  );
}
