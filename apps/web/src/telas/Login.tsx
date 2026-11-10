import { LoaderCircle, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { BotaoTema } from '../componentes/BotaoTema';
import { useSessao } from '../sessao';

export function Login() {
  const { entrar } = useSessao();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [manter, setManter] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setOcupado(true);
    try {
      await entrar(login, senha, manter);
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <BotaoTema className="absolute top-[max(12px,env(safe-area-inset-top))] right-3" />
      <section className="hidden flex-col justify-center gap-6 bg-semed-claro px-[11%] py-16 lg:flex">
        <img src="/semed.png" alt="Logo da SEMED de Itapuã do Oeste" width={96} height={96} className="rounded-xl" />
        <p className="font-mono text-xs tracking-widest text-semed uppercase">Educação municipal</p>
        <h1 className="max-w-[16ch] text-5xl leading-tight font-semibold text-semed-escuro">
          Cada registro ajuda a acompanhar uma aprendizagem.
        </h1>
        <p className="max-w-[44ch] text-lg text-tinta-suave">
          Escolas, professores e secretaria no mesmo acompanhamento da rede municipal de Itapuã do
          Oeste.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <form onSubmit={enviar} className="grid w-full max-w-sm gap-6" noValidate>
          <div className="flex items-center gap-3 lg:hidden">
            <img src="/semed.png" alt="" width={56} height={56} className="rounded-lg" />
            <div>
              <p className="font-display text-lg font-semibold">Central</p>
              <p className="text-sm text-tinta-suave">Educacional</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Entrar na Central</h2>
            <p className="mt-1 text-tinta-suave">Use o login e a senha fornecidos pela SEMED.</p>
          </div>

          <div className="ce-campo">
            <label className="ce-rotulo" htmlFor="login">
              Login
            </label>
            <input
              id="login"
              name="username"
              className="ce-controle"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>
          <div className="ce-campo">
            <label className="ce-rotulo" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              name="password"
              type="password"
              className="ce-controle"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-tinta">
            <input
              type="checkbox"
              className="size-5 accent-[var(--semed)]"
              checked={manter}
              onChange={(e) => setManter(e.target.checked)}
            />
            Manter conectado neste aparelho
          </label>

          {erro && (
            <div className="ce-aviso ce-aviso-erro" role="alert">
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="ce-botao ce-botao-primario ce-largo"
            disabled={ocupado || !login || !senha}
            aria-busy={ocupado || undefined}
          >
            {ocupado ? <LoaderCircle className="ce-girando" size={18} aria-hidden /> : <LogIn size={18} aria-hidden />}
            {ocupado ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
