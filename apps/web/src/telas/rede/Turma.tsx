// Turma (UC-R04, R05, R07, R08, R09): professores, estudantes e matrículas.

import {
  ROTULO_ETAPA,
  ROTULO_SITUACAO_MATRICULA,
  type PossivelDuplicado,
  type ProfessorTurma,
  type MatriculaTurma,
  type SituacaoMatricula,
  type TrajetoriaItem,
  type TurmaDetalhe,
  type TurmaLista,
} from '@central/tipos';
import { ArrowLeft, ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { chamar, ErroApi } from '../../api';
import { Aviso, Campo, Carregando, dataBr, Pagina, useDados } from '../../ui';

interface ProfessorOpcao {
  id: number;
  nome: string;
  login: string;
}

function Professores({ turma, aoMudar }: { turma: TurmaDetalhe; aoMudar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [lista, setLista] = useState<ProfessorTurma[]>(turma.professoresTurma);
  const [escolhido, setEscolhido] = useState<number | ''>('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const opcoes = useDados(
    () => (editando ? chamar<ProfessorOpcao[]>('/professores') : Promise.resolve([] as ProfessorOpcao[])),
    [editando],
  );

  function adicionar() {
    const p = opcoes.dados?.find((o) => o.id === escolhido);
    if (!p) return;
    setLista([...lista, { usuarioId: p.id, nome: p.nome, papel: lista.length ? 'apoio' : 'regente' }]);
    setEscolhido('');
  }

  async function salvar() {
    setOcupado(true);
    setErro('');
    try {
      await chamar(`/turmas/${turma.id}/professores`, {
        metodo: 'PUT',
        json: { professores: lista.map(({ usuarioId, papel }) => ({ usuarioId, papel })) },
      });
      setEditando(false);
      aoMudar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="ce-painel grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Professores</h2>
        {turma.pode.atribuirProfessores && !editando && (
          <button type="button" className="ce-botao ce-botao-secundario" onClick={() => { setLista(turma.professoresTurma); setEditando(true); }}>
            Alterar professores
          </button>
        )}
      </div>
      {!editando ? (
        turma.professoresTurma.length ? (
          <ul className="grid gap-1">
            {turma.professoresTurma.map((p) => (
              <li key={p.usuarioId}>{p.nome} <span className="text-tinta-suave">· {p.papel}</span></li>
            ))}
          </ul>
        ) : (
          <p className="text-tinta-suave">Nenhum professor atribuído.</p>
        )
      ) : (
        <div className="grid gap-3">
          {lista.map((p, i) => (
            <div key={p.usuarioId} className="flex flex-wrap items-center gap-2">
              <span className="min-w-48 flex-1 font-semibold">{p.nome}</span>
              <select aria-label={`Papel de ${p.nome}`} className="ce-controle w-36" value={p.papel}
                onChange={(e) => setLista(lista.map((x, j) => (j === i ? { ...x, papel: e.target.value as 'regente' | 'apoio' } : x)))}>
                <option value="regente">Regente</option>
                <option value="apoio">Apoio</option>
              </select>
              <button type="button" className="ce-botao ce-botao-discreto px-3" aria-label={`Tirar ${p.nome} da turma`}
                onClick={() => setLista(lista.filter((_, j) => j !== i))}>
                <Trash2 size={18} aria-hidden />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-2">
            <Campo id="add-professor" rotulo="Adicionar professor" className="min-w-64 flex-1">
              <select id="add-professor" className="ce-controle" value={escolhido} onChange={(e) => setEscolhido(Number(e.target.value) || '')}>
                <option value="">{opcoes.dados ? 'Escolha um professor' : 'Carregando…'}</option>
                {opcoes.dados?.filter((o) => !lista.some((p) => p.usuarioId === o.id)).map((o) => (
                  <option key={o.id} value={o.id}>{o.nome} ({o.login})</option>
                ))}
              </select>
            </Campo>
            <button type="button" className="ce-botao ce-botao-secundario" onClick={adicionar} disabled={!escolhido}>
              <Plus size={18} aria-hidden /> Adicionar
            </button>
          </div>
          {erro && <Aviso tom="erro">{erro}</Aviso>}
          <div className="flex gap-2">
            <button type="button" className="ce-botao ce-botao-primario" onClick={salvar} disabled={ocupado}>
              {ocupado ? 'Salvando…' : 'Salvar professores'}
            </button>
            <button type="button" className="ce-botao ce-botao-discreto" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Matricular({ turmaId, aoMatricular }: { turmaId: number; aoMatricular: () => void }) {
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [inep, setInep] = useState('');
  const [duplicados, setDuplicados] = useState<PossivelDuplicado[] | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(extra: { estudanteId?: number; confirmarNovo?: boolean } = {}) {
    setOcupado(true);
    setErro('');
    try {
      await chamar(`/turmas/${turmaId}/matriculas`, {
        json: extra.estudanteId
          ? { estudanteId: extra.estudanteId }
          : { nome, dataNascimento: nascimento || null, codigoInep: inep || null, confirmarNovo: extra.confirmarNovo },
      });
      setNome(''); setNascimento(''); setInep(''); setDuplicados(null);
      aoMatricular();
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === 'possivel_duplicado') setDuplicados(e.extra?.duplicados as PossivelDuplicado[]);
      else setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function submeter(e: FormEvent) {
    e.preventDefault();
    void enviar();
  }

  return (
    <form onSubmit={submeter} className="ce-painel grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
      <h2 className="text-lg font-medium sm:col-span-3">Matricular estudante</h2>
      <Campo id="mat-nome" rotulo="Nome completo">
        <input id="mat-nome" className="ce-controle" value={nome} onChange={(e) => { setNome(e.target.value); setDuplicados(null); }} required />
      </Campo>
      <Campo id="mat-nasc" rotulo="Data de nascimento">
        <input id="mat-nasc" type="date" className="ce-controle" value={nascimento} onChange={(e) => { setNascimento(e.target.value); setDuplicados(null); }} />
      </Campo>
      <Campo id="mat-inep" rotulo="ID INEP do estudante" ajuda="12 dígitos, se tiver.">
        <input id="mat-inep" className="ce-controle" inputMode="numeric" value={inep} onChange={(e) => setInep(e.target.value)} />
      </Campo>
      {duplicados && (
        <div className="sm:col-span-3">
          <Aviso tom="atencao" titulo="Já existe estudante com este nome e nascimento">
            <ul className="mt-2 grid gap-2">
              {duplicados.map((d) => (
                <li key={d.estudanteId} className="flex flex-wrap items-center gap-3">
                  <span>{d.nome} · {dataBr(d.dataNascimento)} · {d.turmaAtual ?? 'sem matrícula ativa'}</span>
                  <button type="button" className="ce-botao ce-botao-secundario" disabled={ocupado} onClick={() => void enviar({ estudanteId: d.estudanteId })}>
                    É a mesma criança: matricular
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="ce-botao ce-botao-discreto mt-2" disabled={ocupado} onClick={() => void enviar({ confirmarNovo: true })}>
              É outra criança: cadastrar nova
            </button>
          </Aviso>
        </div>
      )}
      {erro && <div className="sm:col-span-3"><Aviso tom="erro">{erro}</Aviso></div>}
      <div className="sm:col-span-3">
        <button type="submit" className="ce-botao ce-botao-primario" disabled={ocupado || !nome.trim() || !!duplicados}>
          {ocupado ? 'Matriculando…' : 'Matricular'}
        </button>
      </div>
    </form>
  );
}

/** UC-R07: transferir para outra turma da rede, no mesmo ano letivo. A matrícula de origem fica
 * como "transferida" e a trajetória mostra todas as matrículas do estudante. */
function Transferir({ turma, matricula, aoFechar, aoTransferir }: {
  turma: TurmaDetalhe;
  matricula: MatriculaTurma;
  aoFechar: () => void;
  aoTransferir: () => void;
}) {
  const turmas = useDados(() => chamar<TurmaLista[]>(`/turmas?ano=${turma.anoLetivo}`), [turma.anoLetivo]);
  const trajetoria = useDados(() => chamar<TrajetoriaItem[]>(`/estudantes/${matricula.estudanteId}/trajetoria`), [matricula.estudanteId]);
  const [destino, setDestino] = useState<number | ''>('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const opcoes = (turmas.dados ?? []).filter((x) => x.id !== turma.id);
  const porEscola = new Map<string, TurmaLista[]>();
  for (const x of opcoes) porEscola.set(x.escola, [...(porEscola.get(x.escola) ?? []), x]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!destino) return;
    setOcupado(true);
    setErro('');
    try {
      await chamar(`/matriculas/${matricula.id}/transferir`, { json: { turmaId: destino, motivo: motivo || null } });
      aoTransferir();
    } catch (e2) {
      setErro((e2 as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="ce-painel grid gap-4" aria-labelledby="transferir-titulo">
      <h2 id="transferir-titulo" className="text-lg font-medium">Transferir {matricula.nome}</h2>
      <p className="text-tinta-suave">
        A matrícula nesta turma fica registrada como transferida e o estudante passa para a turma escolhida, no ano letivo {turma.anoLetivo}.
        Para saída da rede, mude a situação na tabela para “Transferida”.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="transf-destino" rotulo="Turma de destino">
          <select id="transf-destino" className="ce-controle" required value={destino}
            onChange={(e) => setDestino(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{turmas.dados ? 'Escolha a turma…' : 'Carregando…'}</option>
            {[...porEscola].map(([escola, lista]) => (
              <optgroup key={escola} label={escola}>
                {lista.map((x) => <option key={x.id} value={x.id}>{x.nome} · {ROTULO_ETAPA[x.etapa]}</option>)}
              </optgroup>
            ))}
          </select>
        </Campo>
        <Campo id="transf-motivo" rotulo="Motivo (opcional)" ajuda="Vai para o histórico.">
          <input id="transf-motivo" className="ce-controle" value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: mudança de endereço…" />
        </Campo>
      </div>
      {trajetoria.dados && trajetoria.dados.length > 1 && (
        <div className="grid gap-2">
          <h3 className="font-medium">Trajetória na rede</h3>
          <ul className="grid gap-1 text-sm">
            {trajetoria.dados.map((x) => (
              <li key={x.matriculaId} className="ce-num">
                {x.anoLetivo} · {x.escola} · {x.turma} · {ROTULO_SITUACAO_MATRICULA[x.situacao]}
              </li>
            ))}
          </ul>
        </div>
      )}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="ce-botao ce-botao-primario" disabled={ocupado || !destino}>
          {ocupado ? 'Transferindo…' : 'Transferir'}
        </button>
        <button type="button" className="ce-botao ce-botao-discreto" onClick={aoFechar}>Cancelar</button>
      </div>
    </form>
  );
}

export function Turma() {
  const { id } = useParams();
  const turma = useDados(() => chamar<TurmaDetalhe>(`/turmas/${id}`), [id]);
  const [erroSituacao, setErroSituacao] = useState('');
  const [transferindo, setTransferindo] = useState<MatriculaTurma | null>(null);

  async function mudarSituacao(matriculaId: number, situacao: SituacaoMatricula) {
    setErroSituacao('');
    try {
      await chamar(`/matriculas/${matriculaId}`, { metodo: 'PATCH', json: { situacao } });
      await turma.recarregar();
    } catch (e) {
      setErroSituacao((e as Error).message);
    }
  }

  if (turma.erro) return <Aviso tom="erro">{turma.erro}</Aviso>;
  const t = turma.dados;
  if (!t) return <Carregando />;
  const ativas = t.matriculas?.filter((m) => m.situacao === 'ativa').length ?? t.estudantes;

  return (
    <Pagina
      rotulo={`${t.escola} · ${t.anoLetivo}`}
      titulo={t.nome}
      descricao={`${ROTULO_ETAPA[t.etapa]}${t.turno ? ` · ${t.turno}` : ''} · ${ativas} estudante${ativas === 1 ? '' : 's'} com matrícula ativa`}
      acoes={<Link to={`/rede?escola=${t.escolaId}`} className="ce-botao ce-botao-discreto"><ArrowLeft size={18} aria-hidden /> Turmas da escola</Link>}
    >
      <Professores turma={t} aoMudar={() => void turma.recarregar()} />

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Estudantes</h2>
        {t.matriculas === null ? (
          <Aviso tom="info">O seu perfil vê só os números da turma, sem nome de estudante.</Aviso>
        ) : t.matriculas.length === 0 ? (
          <p className="text-tinta-suave">Nenhum estudante matriculado.</p>
        ) : (
          <div className="ce-tabela-caixa">
            <table className="ce-tabela">
              <thead><tr><th>Estudante</th><th>Nascimento</th><th>ID INEP</th><th>Situação</th>{t.pode.matricular && <th><span className="sr-only">Ações</span></th>}</tr></thead>
              <tbody>
                {t.matriculas.map((m) => (
                  <tr key={m.id} className={m.situacao === 'ativa' ? '' : 'ce-linha-apagada'}>
                    <td className="font-semibold">{m.nome}</td>
                    <td className="ce-num">{dataBr(m.dataNascimento)}</td>
                    <td className="ce-num">{m.codigoInep ?? '—'}</td>
                    <td>
                      {t.pode.matricular ? (
                        <select aria-label={`Situação da matrícula de ${m.nome}`} className="ce-controle w-40 py-1"
                          value={m.situacao} onChange={(e) => void mudarSituacao(m.id, e.target.value as SituacaoMatricula)}>
                          {Object.entries(ROTULO_SITUACAO_MATRICULA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                        </select>
                      ) : (
                        ROTULO_SITUACAO_MATRICULA[m.situacao]
                      )}
                    </td>
                    {t.pode.matricular && (
                      <td>
                        {m.situacao === 'ativa' && (
                          <button type="button" className="ce-botao ce-botao-discreto py-1" onClick={() => setTransferindo(m)}
                            aria-label={`Transferir ${m.nome} para outra turma`}>
                            <ArrowRightLeft size={16} aria-hidden /> Transferir
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {erroSituacao && <Aviso tom="erro">{erroSituacao}</Aviso>}
      </section>

      {transferindo && (
        <Transferir
          key={transferindo.id}
          turma={t}
          matricula={transferindo}
          aoFechar={() => setTransferindo(null)}
          aoTransferir={() => {
            setTransferindo(null);
            void turma.recarregar();
          }}
        />
      )}

      {t.pode.matricular && <Matricular turmaId={t.id} aoMatricular={() => void turma.recarregar()} />}
    </Pagina>
  );
}
