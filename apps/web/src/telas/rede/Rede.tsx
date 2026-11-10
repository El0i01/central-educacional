// Escolas e turmas (UC-R01, R03, R09). Cada perfil vê o seu escopo; cadastro cria e edita.

import { pode } from '@central/escopo';
import { ETAPAS, ROTULO_ETAPA, type AnoLetivo, type Escola, type Etapa, type TurmaLista, type Turno, type Zona } from '@central/tipos';
import { ChevronRight, Plus, School } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { chamar } from '../../api';
import { useSessao } from '../../sessao';
import { Aviso, Campo, Carregando, Pagina, useDados } from '../../ui';

const TURNOS: Turno[] = ['matutino', 'vespertino', 'noturno', 'integral'];

function NovaEscola({ aoCriar, aoCancelar }: { aoCriar: () => void; aoCancelar: () => void }) {
  const [nome, setNome] = useState('');
  const [inep, setInep] = useState('');
  const [zona, setZona] = useState<Zona>('urbana');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function salvar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      await chamar('/escolas', { json: { nome, inep: inep || null, zona } });
      aoCriar();
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <form onSubmit={salvar} className="ce-painel grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
      <h2 className="text-lg font-medium sm:col-span-3">Nova escola</h2>
      <Campo id="escola-nome" rotulo="Nome da escola">
        <input id="escola-nome" className="ce-controle" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Campo>
      <Campo id="escola-inep" rotulo="Código INEP" ajuda="8 dígitos, se tiver.">
        <input id="escola-inep" className="ce-controle" inputMode="numeric" value={inep} onChange={(e) => setInep(e.target.value)} />
      </Campo>
      <Campo id="escola-zona" rotulo="Zona">
        <select id="escola-zona" className="ce-controle" value={zona} onChange={(e) => setZona(e.target.value as Zona)}>
          <option value="urbana">Urbana</option>
          <option value="rural">Rural</option>
        </select>
      </Campo>
      {erro && <div className="sm:col-span-3"><Aviso tom="erro">{erro}</Aviso></div>}
      <div className="flex gap-2 sm:col-span-3">
        <button type="submit" className="ce-botao ce-botao-primario" disabled={ocupado || !nome.trim()}>
          {ocupado ? 'Salvando…' : 'Cadastrar escola'}
        </button>
        <button type="button" className="ce-botao ce-botao-discreto" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function NovaTurma({ escolas, escolaInicial, ano, aoCriar, aoCancelar }: {
  escolas: Escola[]; escolaInicial: number | null; ano: number; aoCriar: () => void; aoCancelar: () => void;
}) {
  const [escolaId, setEscolaId] = useState<number | ''>(escolaInicial ?? '');
  const [nome, setNome] = useState('');
  const [etapa, setEtapa] = useState<Etapa>('EF1');
  const [turno, setTurno] = useState<Turno | ''>('matutino');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function salvar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      await chamar('/turmas', { json: { escolaId, anoLetivo: ano, nome, etapa, turno: turno || null } });
      aoCriar();
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <form onSubmit={salvar} className="ce-painel grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <h2 className="text-lg font-medium sm:col-span-2 lg:col-span-4">Nova turma em {ano}</h2>
      <Campo id="turma-escola" rotulo="Escola">
        <select id="turma-escola" className="ce-controle" value={escolaId} onChange={(e) => setEscolaId(Number(e.target.value) || '')} required>
          <option value="">Escolha a escola</option>
          {escolas.filter((x) => x.ativa).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </Campo>
      <Campo id="turma-nome" rotulo="Nome da turma">
        <input id="turma-nome" className="ce-controle" placeholder="Ex.: 2º ano A…" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Campo>
      <Campo id="turma-etapa" rotulo="Etapa">
        <select id="turma-etapa" className="ce-controle" value={etapa} onChange={(e) => setEtapa(e.target.value as Etapa)}>
          {ETAPAS.map((x) => <option key={x} value={x}>{ROTULO_ETAPA[x]}</option>)}
        </select>
      </Campo>
      <Campo id="turma-turno" rotulo="Turno">
        <select id="turma-turno" className="ce-controle" value={turno} onChange={(e) => setTurno(e.target.value as Turno | '')}>
          {TURNOS.map((x) => <option key={x} value={x}>{x[0]!.toUpperCase() + x.slice(1)}</option>)}
          <option value="">Não informado</option>
        </select>
      </Campo>
      {erro && <div className="sm:col-span-2 lg:col-span-4"><Aviso tom="erro">{erro}</Aviso></div>}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <button type="submit" className="ce-botao ce-botao-primario" disabled={ocupado || !escolaId || !nome.trim()}>
          {ocupado ? 'Salvando…' : 'Criar turma'}
        </button>
        <button type="button" className="ce-botao ce-botao-discreto" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export function Rede() {
  const { usuario } = useSessao();
  const [busca, setBusca] = useSearchParams();
  const escolaFiltro = Number(busca.get('escola')) || null;
  const [formulario, setFormulario] = useState<'escola' | 'turma' | null>(null);
  const anos = useDados(() => chamar<{ anos: AnoLetivo[]; corrente: number }>('/anos-letivos'), []);
  const ano = Number(busca.get('ano')) || anos.dados?.corrente || null;
  const escolas = useDados(() => (ano ? chamar<Escola[]>(`/escolas?ano=${ano}`) : Promise.resolve(null)), [ano]);
  const turmas = useDados(
    () => (ano ? chamar<TurmaLista[]>(`/turmas?ano=${ano}${escolaFiltro ? `&escola=${escolaFiltro}` : ''}`) : Promise.resolve(null)),
    [ano, escolaFiltro],
  );
  if (!usuario) return null;
  const gere = pode(usuario.perfil, 'rede.gerir');
  const ehProfessor = usuario.perfil === 'professor';

  function mudar(chave: string, valor: string | null) {
    const n = new URLSearchParams(busca);
    if (valor) n.set(chave, valor);
    else n.delete(chave);
    setBusca(n, { replace: true });
  }

  const erro = anos.erro || escolas.erro || turmas.erro;
  return (
    <Pagina
      rotulo="Rede escolar"
      titulo={ehProfessor ? 'Minhas turmas' : 'Escolas e turmas'}
      descricao={ehProfessor ? 'Turmas em que você está como professor.' : 'Escolas e turmas que o seu perfil acompanha.'}
      acoes={gere && (
        <>
          <button type="button" className="ce-botao ce-botao-secundario" onClick={() => setFormulario('escola')}>
            <Plus size={18} aria-hidden /> Nova escola
          </button>
          <button type="button" className="ce-botao ce-botao-primario" onClick={() => setFormulario('turma')}>
            <Plus size={18} aria-hidden /> Nova turma
          </button>
        </>
      )}
    >
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {anos.dados && anos.dados.anos.length === 0 && (
        <Aviso tom="atencao">Nenhum ano letivo aberto ainda. O responsável pelos cadastros precisa abrir o ano.</Aviso>
      )}

      {formulario === 'escola' && (
        <NovaEscola aoCancelar={() => setFormulario(null)} aoCriar={() => { setFormulario(null); void escolas.recarregar(); }} />
      )}
      {formulario === 'turma' && escolas.dados && ano && (
        <NovaTurma
          escolas={escolas.dados} escolaInicial={escolaFiltro} ano={ano}
          aoCancelar={() => setFormulario(null)}
          aoCriar={() => { setFormulario(null); void turmas.recarregar(); void escolas.recarregar(); }}
        />
      )}

      <div className="flex flex-wrap gap-4">
        {anos.dados && anos.dados.anos.length > 1 && (
          <Campo id="filtro-ano" rotulo="Ano letivo" className="w-40">
            <select id="filtro-ano" className="ce-controle" value={ano ?? ''} onChange={(e) => mudar('ano', e.target.value)}>
              {anos.dados.anos.map((a) => <option key={a.ano} value={a.ano}>{a.ano}</option>)}
            </select>
          </Campo>
        )}
        {!ehProfessor && escolas.dados && escolas.dados.length > 1 && (
          <Campo id="filtro-escola" rotulo="Escola" className="min-w-64">
            <select id="filtro-escola" className="ce-controle" value={escolaFiltro ?? ''} onChange={(e) => mudar('escola', e.target.value || null)}>
              <option value="">Todas as escolas</option>
              {escolas.dados.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
        )}
      </div>

      {!ehProfessor && escolas.dados && !escolaFiltro && (
        <section className="grid gap-3">
          <h2 className="text-lg font-medium">Escolas</h2>
          {escolas.dados.length === 0 ? (
            <p className="text-tinta-suave">Nenhuma escola no seu acesso.{gere && ' Cadastre a primeira em "Nova escola".'}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {escolas.dados.map((x) => (
                <button key={x.id} type="button" onClick={() => mudar('escola', String(x.id))}
                  className="ce-cartao text-left transition-colors hover:border-semed">
                  <div className="ce-cartao-topo">
                    <span className="ce-cartao-icone"><School size={20} aria-hidden /></span>
                    <span className="ce-codigo">{x.inep ? `INEP ${x.inep}` : 'sem INEP'} · {x.zona}</span>
                  </div>
                  <h3 className="ce-cartao-titulo">{x.nome}{!x.ativa && ' (inativa)'}</h3>
                  <dl className="ce-cartao-numeros">
                    <div><dt>Turmas</dt><dd className="ce-num">{x.turmas}</dd></div>
                    <div><dt>Matrículas</dt><dd className="ce-num">{x.matriculasAtivas}</dd></div>
                  </dl>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">
          {escolaFiltro ? `Turmas · ${escolas.dados?.find((x) => x.id === escolaFiltro)?.nome ?? ''}` : 'Turmas'} {ano && `em ${ano}`}
        </h2>
        {!turmas.dados ? (
          !turmas.erro && <Carregando />
        ) : turmas.dados.length === 0 ? (
          <p className="text-tinta-suave">Nenhuma turma{ehProfessor ? ' atribuída a você ainda. Fale com a coordenação.' : ' neste filtro.'}</p>
        ) : (
          <div className="ce-tabela-caixa">
            <table className="ce-tabela">
              <thead>
                <tr><th>Turma</th><th>Etapa</th><th>Turno</th>{!escolaFiltro && <th>Escola</th>}<th>Estudantes</th><th>Professores</th><th><span className="sr-only">Abrir</span></th></tr>
              </thead>
              <tbody>
                {turmas.dados.map((t) => (
                  <tr key={t.id}>
                    <td className="font-semibold">{t.nome}</td>
                    <td>{ROTULO_ETAPA[t.etapa]}</td>
                    <td className="capitalize">{t.turno ?? '—'}</td>
                    {!escolaFiltro && <td>{t.escola}</td>}
                    <td className="ce-num">{t.estudantes}</td>
                    <td>{t.professores.length ? t.professores.join(', ') : <span className="text-tinta-suave">sem professor</span>}</td>
                    <td className="text-right">
                      <Link to={`/rede/turmas/${t.id}`} className="ce-botao ce-botao-discreto" aria-label={`Abrir ${t.nome}`}>
                        Abrir <ChevronRight size={16} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Pagina>
  );
}
