import type { ModuloAtivo } from '@central/tipos';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { chamar } from './api';
import { Casca } from './componentes/Casca';
import { useSessao } from './sessao';
import { Inicio } from './telas/Inicio';
import { Login } from './telas/Login';
import { TrocarSenha } from './telas/TrocarSenha';

function Carregando() {
  return (
    <div className="flex min-h-dvh items-center justify-center gap-2 text-tinta-suave" role="status">
      <LoaderCircle className="ce-girando" size={20} aria-hidden /> Carregando…
    </div>
  );
}

function EmConstrucao({ modulo }: { modulo: ModuloAtivo }) {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold text-semed-escuro">{modulo.nome}</h1>
      <div className="ce-aviso ce-aviso-info" role="status">
        As telas deste módulo entram na Fase 2. O módulo já está ligado e aparece só para os perfis
        autorizados.
      </div>
      <Link to="/" className="ce-botao ce-botao-secundario justify-self-start">
        Voltar ao início
      </Link>
    </div>
  );
}

export function App() {
  const { usuario, carregando } = useSessao();
  const [modulos, setModulos] = useState<ModuloAtivo[] | null>(null);

  useEffect(() => {
    if (!usuario || usuario.trocarSenha) {
      setModulos(null);
      return;
    }
    chamar<ModuloAtivo[]>('/modulos')
      .then(setModulos)
      .catch(() => setModulos([]));
  }, [usuario]);

  if (carregando) return <Carregando />;
  if (!usuario) return <Login />;
  if (usuario.trocarSenha) return <TrocarSenha />;
  if (!modulos) return <Carregando />;

  return (
    <Routes>
      <Route element={<Casca modulos={modulos} />}>
        <Route index element={<Inicio modulos={modulos} />} />
        {modulos.map((m) => (
          <Route key={m.codigo} path={`${m.caminho}/*`} element={<EmConstrucao modulo={m} />} />
        ))}
        <Route
          path="*"
          element={
            <div className="grid gap-4">
              <h1 className="text-2xl font-semibold">Página não encontrada</h1>
              <Link to="/" className="ce-botao ce-botao-secundario justify-self-start">
                Voltar ao início
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
