// Usuários (UC-A04, A05, A06): contas, perfis, escolas vinculadas e senha provisória.

import {
  ROTULO_PERFIL,
  type Escola,
  type ListaUsuarios,
  type Perfil,
  type SenhaProvisoriaResposta,
  type UsuarioGestao,
} from '@central/tipos';
import { Copy, KeyRound, Pencil, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { chamar } from '../../api';
import { useSessao } from '../../sessao';
import { Aviso, Campo, Carregando, dataHoraBr, Pagina, Selo, useDados } from '../../ui';

const COM_ESCOLA: Perfil[] = ['coordenacao', 'equipe_pedagogica'];

function SenhaMostrada({ r, aoFechar }: { r: SenhaProvisoriaResposta; aoFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(r.senhaProvisoria);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <Aviso tom="sucesso" titulo={`Senha provisória de ${r.usuario.nome}`}>
      <p>
        Login <strong className="font-mono">{r.usuario.login}</strong> · senha{' '}
        <strong className="font-mono text-lg tracking-wider select-all">{r.senhaProvisoria}</strong>
      </p>
      <p className="mt-1">
        Entregue pessoalmente. Ela aparece só agora, vale até {dataHoraBr(r.expiraEm)} e será trocada no primeiro acesso.
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" className="ce-botao ce-botao-secundario" onClick={() => void copiar()}>
          <Copy size={18} aria-hidden /> {copiado ? 'Copiada' : 'Copiar senha'}
        </button>
        <button type="button" className="ce-botao ce-botao-discreto" onClick={aoFechar}>Já anotei</button>
      </div>
    </Aviso>
  );
}

function FormUsuario(props: {
  usuario?: UsuarioGestao;
  perfis: Perfil[];
  escolas: Escola[];
  aoSalvar: (r?: SenhaProvisoriaResposta) => void;
  aoCancelar: () => void;
}) {
  const u = props.usuario;
  const [login, setLogin] = useState(u?.login ?? '');
  const [nome, setNome] = useState(u?.nome ?? '');
  const [perfil, setPerfil] = useState<Perfil>(u?.perfil ?? props.perfis[0] ?? 'professor');
  const [escolas, setEscolas] = useState<number[]>(u?.escolas ?? []);
  const [ativo, setAtivo] = useState(u?.ativo ?? true);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      if (u) {
        await chamar(`/usuarios/${u.id}`, { metodo: 'PATCH', json: { nome, perfil, ativo, escolas } });
        props.aoSalvar();
      } else {
        props.aoSalvar(await chamar<SenhaProvisoriaResposta>('/usuarios', { json: { login, nome, perfil, escolas } }));
      }
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const perfisDoSelect = u && !props.perfis.includes(u.perfil) ? [u.perfil, ...props.perfis] : props.perfis;
  return (
    <form onSubmit={salvar} className="ce-painel grid gap-4 sm:grid-cols-3">
      <h2 className="text-lg font-medium sm:col-span-3">{u ? `Editar ${u.nome}` : 'Novo usuário'}</h2>
      <Campo id="u-nome" rotulo="Nome completo">
        <input id="u-nome" className="ce-controle" autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Campo>
      <Campo id="u-login" rotulo="Login" ajuda={u ? 'O login não muda.' : 'Ex.: ana.silva (minúsculas, sem espaço).'}>
        <input id="u-login" className="ce-controle" autoComplete="off" spellCheck={false} autoCapitalize="none"
          value={login} onChange={(e) => setLogin(e.target.value)} disabled={!!u} required />
      </Campo>
      <Campo id="u-perfil" rotulo="Perfil">
        <select id="u-perfil" className="ce-controle" value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
          {perfisDoSelect.map((p) => <option key={p} value={p}>{ROTULO_PERFIL[p]}</option>)}
        </select>
      </Campo>
      {COM_ESCOLA.includes(perfil) && (
        <fieldset className="grid gap-2 sm:col-span-3">
          <legend className="ce-rotulo mb-1">
            Escolas vinculadas{perfil === 'equipe_pedagogica' && ' (nenhuma marcada = rede inteira)'}
          </legend>
          <div className="flex flex-wrap gap-2">
            {props.escolas.map((x) => (
              <label key={x.id} className={`ce-opcao min-h-11 ${escolas.includes(x.id) ? 'ce-opcao-marcada' : ''}`}>
                <input type="checkbox" checked={escolas.includes(x.id)}
                  onChange={(e) => setEscolas(e.target.checked ? [...escolas, x.id] : escolas.filter((y) => y !== x.id))} />
                {x.nome}
              </label>
            ))}
            {props.escolas.length === 0 && <p className="text-tinta-suave">Nenhuma escola cadastrada ainda.</p>}
          </div>
        </fieldset>
      )}
      {u && (
        <label className="flex min-h-11 items-center gap-3 sm:col-span-3">
          <input type="checkbox" className="size-5 accent-[var(--semed)]" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Conta ativa (desmarque para bloquear o acesso sem apagar o histórico)
        </label>
      )}
      {erro && <div className="sm:col-span-3"><Aviso tom="erro">{erro}</Aviso></div>}
      <div className="flex gap-2 sm:col-span-3">
        <button type="submit" className="ce-botao ce-botao-primario" disabled={ocupado || !nome.trim() || (!u && !login.trim())}>
          {ocupado ? 'Salvando…' : u ? 'Salvar alterações' : 'Criar usuário'}
        </button>
        <button type="button" className="ce-botao ce-botao-discreto" onClick={props.aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export function Usuarios() {
  const { usuario: eu } = useSessao();
  const lista = useDados(() => chamar<ListaUsuarios>('/usuarios'), []);
  // Só id e nome: o admin não enxerga a rede, mas vincula coordenadores a escolas.
  const escolas = useDados(() => chamar<Escola[]>('/escolas/opcoes'), []);
  const [form, setForm] = useState<'novo' | UsuarioGestao | null>(null);
  const [senha, setSenha] = useState<SenhaProvisoriaResposta | null>(null);
  const [erro, setErro] = useState('');
  const nomeEscola = (id: number) => escolas.dados?.find((x) => x.id === id)?.nome ?? `#${id}`;

  async function gerarSenha(u: UsuarioGestao) {
    setErro('');
    try {
      setSenha(await chamar<SenhaProvisoriaResposta>(`/usuarios/${u.id}/senha-provisoria`, { json: {} }));
      void lista.recarregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  if (lista.erro) return <Aviso tom="erro">{lista.erro}</Aviso>;
  if (!lista.dados) return <Carregando />;
  const { usuarios, perfisAtribuiveis } = lista.dados;

  return (
    <Pagina
      rotulo="Acesso"
      titulo="Usuários"
      descricao="Contas da central, perfis e escolas vinculadas. Senhas são entregues como provisórias e trocadas no primeiro acesso."
      acoes={perfisAtribuiveis.length > 0 && (
        <button type="button" className="ce-botao ce-botao-primario" onClick={() => { setSenha(null); setForm('novo'); }}>
          <Plus size={18} aria-hidden /> Novo usuário
        </button>
      )}
    >
      {senha && <SenhaMostrada r={senha} aoFechar={() => setSenha(null)} />}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {form && (
        <FormUsuario
          key={form === 'novo' ? 'novo' : form.id}
          usuario={form === 'novo' ? undefined : form}
          perfis={perfisAtribuiveis}
          escolas={escolas.dados ?? []}
          aoCancelar={() => setForm(null)}
          aoSalvar={(r) => { setForm(null); if (r) setSenha(r); void lista.recarregar(); }}
        />
      )}
      <div className="ce-tabela-caixa">
        <table className="ce-tabela">
          <thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Escolas</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr></thead>
          <tbody>
            {usuarios.map((u) => {
              const gerivel = perfisAtribuiveis.includes(u.perfil) && u.id !== eu?.id;
              return (
                <tr key={u.id} className={u.ativo ? '' : 'ce-linha-apagada'}>
                  <td className="font-semibold">{u.nome}</td>
                  <td className="font-mono text-sm">{u.login}</td>
                  <td>{ROTULO_PERFIL[u.perfil]}</td>
                  <td className="text-sm">{u.escolas.length ? u.escolas.map(nomeEscola).join(', ') : '—'}</td>
                  <td>
                    {!u.ativo ? <Selo tom="rascunho">Inativa</Selo>
                      : u.bloqueado ? <Selo tom="devolvida">Bloqueada</Selo>
                      : u.trocarSenha ? <Selo tom="enviada">Senha provisória</Selo>
                      : <Selo tom="validada">Ativa</Selo>}
                  </td>
                  <td>
                    {gerivel && (
                      <div className="flex justify-end gap-1">
                        <button type="button" className="ce-botao ce-botao-discreto px-3" onClick={() => { setSenha(null); setForm(u); }} aria-label={`Editar ${u.nome}`} title="Editar">
                          <Pencil size={18} aria-hidden />
                        </button>
                        <button type="button" className="ce-botao ce-botao-discreto px-3" onClick={() => void gerarSenha(u)} aria-label={`Gerar senha provisória para ${u.nome}`} title="Gerar senha provisória">
                          <KeyRound size={18} aria-hidden />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Pagina>
  );
}
