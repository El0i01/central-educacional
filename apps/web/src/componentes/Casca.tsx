import { pode } from '@central/escopo';
import { ROTULO_PERFIL, type ModuloAtivo, type Usuario } from '@central/tipos';
import { ClipboardList, House, LogOut, School, Upload, Users, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSessao } from '../sessao';
import { BotaoTema } from './BotaoTema';

// Ícone de cada módulo no menu. Módulo novo ganha o seu aqui.
const ICONES: Record<string, LucideIcon> = { fleo: ClipboardList };

/** Itens da plataforma (sempre ligada), conforme o perfil. */
function itensPlataforma(u: Usuario): { caminho: string; nome: string; Icone: LucideIcon }[] {
  const itens: { caminho: string; nome: string; Icone: LucideIcon }[] = [];
  if (u.perfil !== 'admin') {
    itens.push({ caminho: '/rede', nome: u.perfil === 'professor' ? 'Minhas turmas' : 'Escolas e turmas', Icone: School });
  }
  if (pode(u.perfil, 'usuarios.ver')) itens.push({ caminho: '/usuarios', nome: 'Usuários', Icone: Users });
  if (pode(u.perfil, 'importacao.matriculas')) itens.push({ caminho: '/importacao', nome: 'Importação', Icone: Upload });
  return itens;
}

/**
 * Casca da central: menu lateral (web) ou barra inferior (celular) montados pelos módulos ligados
 * e permitidos ao perfil (GET /api/modulos). Nada de módulo fixo no código da casca.
 */
export function Casca({ modulos }: { modulos: ModuloAtivo[] }) {
  const { usuario, sair } = useSessao();
  const itens = [
    { caminho: '/', nome: 'Início', Icone: House },
    ...(usuario ? itensPlataforma(usuario) : []),
    ...modulos.map((m) => ({ caminho: m.caminho, nome: m.nome, Icone: ICONES[m.codigo] ?? ClipboardList })),
  ];
  const iniciais = (usuario?.nome ?? '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

  const classeItem = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium ${
      isActive ? 'bg-semed-claro text-semed' : 'text-tinta-suave hover:bg-superficie-2 hover:text-tinta'
    }`;

  return (
    <div className="min-h-dvh lg:pl-[var(--menu-lateral)]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-superficie focus:p-2">
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-[var(--menu-lateral)] flex-col gap-6 border-r border-linha bg-superficie px-4 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <img src="/semed.png" alt="SEMED Itapuã do Oeste" width={56} height={56} className="rounded-lg" />
          <div>
            <p className="font-display text-lg leading-tight font-semibold">Central</p>
            <p className="text-sm text-tinta-suave">Educacional</p>
          </div>
        </div>
        <nav aria-label="Menu principal" className="grid gap-1">
          {itens.map(({ caminho, nome, Icone }) => (
            <NavLink key={caminho} to={caminho} end={caminho === '/'} className={classeItem}>
              <Icone size={19} aria-hidden />
              {nome}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-linha px-2 pt-4">
          <span className="grid size-9 place-items-center rounded-full bg-semed-claro font-mono text-xs text-semed" aria-hidden>
            {iniciais}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{usuario?.nome}</p>
            <p className="truncate text-xs text-tinta-suave">{usuario && ROTULO_PERFIL[usuario.perfil]}</p>
          </div>
          <BotaoTema />
          <button type="button" className="ce-botao ce-botao-discreto px-3" onClick={sair} aria-label="Sair da central">
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-linha bg-superficie px-4 py-2 lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/semed.png" alt="" width={36} height={36} className="rounded-md" />
          <span className="font-display font-semibold">Central Educacional</span>
        </div>
        <div className="flex items-center gap-1">
          <BotaoTema />
          <button type="button" className="ce-botao ce-botao-discreto px-3" onClick={sair} aria-label="Sair da central">
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-[1200px] px-4 pt-6 pb-28 lg:px-10 lg:pt-10 lg:pb-12">
        <Outlet />
      </main>

      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-10 grid border-t border-linha bg-superficie pb-[env(safe-area-inset-bottom)] shadow-[var(--sombra-flutuante)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}
      >
        {itens.map(({ caminho, nome, Icone }) => (
          <NavLink
            key={caminho}
            to={caminho}
            end={caminho === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${isActive ? 'text-semed' : 'text-tinta-suave'}`
            }
          >
            <Icone size={20} aria-hidden />
            {nome}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
