import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Tema = 'claro' | 'escuro';
const CHAVE = 'central.tema';

/** Tema em uso: a escolha guardada ou, sem escolha, o do aparelho. */
function temaAtual(): Tema {
  const marcado = document.documentElement.dataset.tema;
  if (marcado === 'claro' || marcado === 'escuro') return marcado;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

/** Aplica no <html> (o tema.gerado.css lê data-tema) e acerta a cor da barra do navegador. */
export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema;
  const fundo = getComputedStyle(document.documentElement).getPropertyValue('--fundo').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', fundo);
    m.removeAttribute('media');
  });
}

/**
 * Alterna entre claro e escuro e lembra a escolha neste aparelho (só conveniência: se o navegador
 * não guardar, volta a seguir o tema do aparelho).
 */
export function BotaoTema({ className = '' }: { className?: string }) {
  const [tema, setTema] = useState<Tema>(temaAtual);

  // Sem escolha guardada, acompanha a troca de tema do aparelho.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    const mudar = () => {
      if (!document.documentElement.dataset.tema) setTema(consulta.matches ? 'escuro' : 'claro');
    };
    consulta.addEventListener('change', mudar);
    return () => consulta.removeEventListener('change', mudar);
  }, []);

  function alternar() {
    const novo: Tema = tema === 'escuro' ? 'claro' : 'escuro';
    aplicarTema(novo);
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      // Sem armazenamento: vale até recarregar.
    }
    setTema(novo);
  }

  const proximo = tema === 'escuro' ? 'claro' : 'escuro';
  return (
    <button
      type="button"
      className={`ce-botao ce-botao-discreto px-3 ${className}`}
      onClick={alternar}
      aria-label={`Usar tema ${proximo}`}
      title={`Usar tema ${proximo}`}
    >
      {tema === 'escuro' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
