import { useState, type FormEvent } from 'react';
import { useSessao } from '../sessao';

/** Senha provisória: até trocar, a API só libera /eu e /eu/senha (UC-A02). */
export function TrocarSenha() {
  const { usuario, trocarSenha, sair } = useSessao();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (nova !== confirma) {
      setErro('A confirmação não é igual à senha nova.');
      return;
    }
    setOcupado(true);
    try {
      await trocarSenha(atual, nova);
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <form onSubmit={enviar} className="grid w-full max-w-sm gap-5">
        <div>
          <h1 className="text-2xl font-semibold">Crie sua senha</h1>
          <p className="mt-1 text-tinta-suave">
            {usuario?.nome}, sua senha atual é provisória. Escolha uma nova com pelo menos 10
            caracteres.
          </p>
        </div>
        {[
          ['atual', 'Senha provisória', atual, setAtual, 'current-password'],
          ['nova', 'Senha nova', nova, setNova, 'new-password'],
          ['confirma', 'Repita a senha nova', confirma, setConfirma, 'new-password'],
        ].map(([id, rotulo, valor, mudar, auto]) => (
          <div className="ce-campo" key={id as string}>
            <label className="ce-rotulo" htmlFor={id as string}>
              {rotulo as string}
            </label>
            <input
              id={id as string}
              type="password"
              className="ce-controle"
              autoComplete={auto as string}
              value={valor as string}
              onChange={(e) => (mudar as (v: string) => void)(e.target.value)}
            />
          </div>
        ))}
        {erro && (
          <div className="ce-aviso ce-aviso-erro" role="alert">
            {erro}
          </div>
        )}
        <button type="submit" className="ce-botao ce-botao-primario ce-largo" disabled={ocupado}>
          {ocupado ? 'Salvando…' : 'Salvar senha nova'}
        </button>
        <button type="button" className="ce-botao ce-botao-discreto" onClick={sair}>
          Sair
        </button>
      </form>
    </main>
  );
}
