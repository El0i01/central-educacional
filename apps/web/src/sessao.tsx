import type { LoginResposta, Usuario } from '@central/tipos';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { chamar, gravarToken, lerToken, quandoDeslogar } from './api';

interface Sessao {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (login: string, senha: string, manter: boolean) => Promise<void>;
  trocarSenha: (senhaAtual: string, senhaNova: string) => Promise<void>;
  sair: () => void;
}

const Contexto = createContext<Sessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const sair = useCallback(() => {
    gravarToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    quandoDeslogar(() => setUsuario(null));
    if (!lerToken()) {
      setCarregando(false);
      return;
    }
    chamar<Usuario>('/eu')
      .then(setUsuario)
      .catch(() => gravarToken(null))
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (login: string, senha: string, manter: boolean) => {
    const r = await chamar<LoginResposta>('/auth/login', { json: { login, senha, manter } });
    gravarToken(r.token, manter);
    setUsuario(r.usuario);
  }, []);

  const trocarSenha = useCallback(async (senhaAtual: string, senhaNova: string) => {
    setUsuario(await chamar<Usuario>('/eu/senha', { json: { senhaAtual, senhaNova } }));
  }, []);

  return (
    <Contexto.Provider value={{ usuario, carregando, entrar, trocarSenha, sair }}>
      {children}
    </Contexto.Provider>
  );
}

export function useSessao(): Sessao {
  const s = useContext(Contexto);
  if (!s) throw new Error('useSessao fora do ProvedorSessao');
  return s;
}
