// UC-A08: ligar e desligar módulos da central. Vale no próximo pedido, sem reiniciar nada.
// Desligar não apaga dado: o módulo some do menu e a API dele responde "desligado".

import { ROTULO_PERFIL, type ModuloConfig } from '@central/tipos';
import { Power, PowerOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { chamar } from '../../api';
import { Aviso, Campo, Carregando, Pagina, Selo, useDados } from '../../ui';

function CartaoModulo({ m, aoMudar }: { m: ModuloConfig; aoMudar: () => void }) {
  const [desligando, setDesligando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function mudar(ativo: boolean) {
    setOcupado(true);
    setErro('');
    try {
      await chamar(`/config/modulos/${m.codigo}`, { metodo: 'PUT', json: { ativo, motivo: motivo || null } });
      setDesligando(false);
      setMotivo('');
      aoMudar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function desligar(e: FormEvent) {
    e.preventDefault();
    void mudar(false);
  }

  return (
    <section className="ce-painel grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{m.nome}</h2>
        {m.ativo ? (
          <Selo tom="validada"><Power size={14} aria-hidden /> Ligado</Selo>
        ) : (
          <Selo tom="rascunho"><PowerOff size={14} aria-hidden /> Desligado</Selo>
        )}
      </div>
      <p className="text-sm text-tinta-suave">
        Endereço <span className="font-mono" translate="no">{m.caminho}</span> · aparece para{' '}
        {m.perfis.map((p) => ROTULO_PERFIL[p]).join(', ')}.
      </p>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {m.ativo && !desligando && (
        <button type="button" className="ce-botao ce-botao-secundario justify-self-start" onClick={() => setDesligando(true)}>
          Desligar módulo
        </button>
      )}
      {m.ativo && desligando && (
        <form onSubmit={desligar} className="grid gap-3">
          <Aviso tom="atencao">
            O módulo some do menu de todos na hora e a API dele para de responder. Nenhum dado é apagado: ao religar, tudo volta como estava.
          </Aviso>
          <Campo id={`motivo-${m.codigo}`} rotulo="Motivo" ajuda="Vai para o histórico.">
            <input id={`motivo-${m.codigo}`} className="ce-controle" required value={motivo}
              onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: manutenção do instrumento…" />
          </Campo>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="ce-botao ce-botao-perigo" disabled={ocupado || !motivo.trim()}>
              {ocupado ? 'Desligando…' : `Desligar ${m.nome}`}
            </button>
            <button type="button" className="ce-botao ce-botao-discreto" onClick={() => setDesligando(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {!m.ativo && (
        <button type="button" className="ce-botao ce-botao-primario justify-self-start" disabled={ocupado} onClick={() => void mudar(true)}>
          {ocupado ? 'Ligando…' : `Ligar ${m.nome}`}
        </button>
      )}
    </section>
  );
}

export function Modulos() {
  const lista = useDados(() => chamar<ModuloConfig[]>('/config/modulos'), []);

  return (
    <Pagina
      rotulo="Configuração"
      titulo="Módulos"
      descricao="A plataforma (acesso, rede e importação) fica sempre ligada. Os módulos encaixados nela podem ser ligados e desligados aqui."
    >
      {lista.erro && <Aviso tom="erro">{lista.erro}</Aviso>}
      {!lista.dados && !lista.erro && <Carregando />}
      {lista.dados && (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.dados.map((m) => (
            <CartaoModulo key={m.codigo} m={m} aoMudar={() => void lista.recarregar()} />
          ))}
        </div>
      )}
    </Pagina>
  );
}
