// Importação de matrículas (UC-M01 a M04): enviar planilha, ver a prévia, publicar.

import { MODELO_MATRICULAS } from '@central/importacao';
import { ROTULO_ETAPA, ROTULO_SITUACAO_LOTE, type AnoLetivo, type LoteImportacao, type SituacaoLote } from '@central/tipos';
import { ArrowLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { chamar } from '../../api';
import { Aviso, Campo, Carregando, dataBr, dataHoraBr, Pagina, Selo, useDados } from '../../ui';

const TOM: Record<SituacaoLote, 'rascunho' | 'enviada' | 'devolvida' | 'validada'> = {
  com_inconsistencias: 'devolvida',
  pronto: 'enviada',
  publicado: 'validada',
  descartado: 'rascunho',
};

function baixarModelo() {
  // BOM no início: o Excel abre o CSV com acentos certos.
  const blob = new Blob(['\uFEFF' + MODELO_MATRICULAS], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'modelo-matriculas.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Importacoes() {
  const navegar = useNavigate();
  const lotes = useDados(() => chamar<LoteImportacao[]>('/importacoes'), []);
  const anos = useDados(() => chamar<{ anos: AnoLetivo[]; corrente: number }>('/anos-letivos'), []);
  const [ano, setAno] = useState<number | ''>('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    if (arquivo.size > 4_500_000) {
      setErro('Arquivo grande demais. Divida a planilha por escola.');
      return;
    }
    if (!/\.(csv|txt)$/i.test(arquivo.name)) {
      setErro('Envie a planilha salva como CSV (no Excel: Salvar como → CSV UTF-8).');
      return;
    }
    setOcupado(true);
    try {
      const bytes = await arquivo.arrayBuffer();
      // Planilha salva no Excel antigo vem em Windows-1252: se o UTF-8 falhar, lê assim.
      let conteudo: string;
      try {
        conteudo = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        conteudo = new TextDecoder('windows-1252').decode(bytes);
      }
      const lote = await chamar<LoteImportacao>('/importacoes', {
        json: { tipo: 'matriculas', arquivoNome: arquivo.name, conteudo, anoLetivo: ano || undefined },
      });
      navegar(`/importacao/${lote.id}`);
    } catch (falha) {
      setErro((falha as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Pagina
      rotulo="Importação"
      titulo="Importar matrículas"
      descricao="Envie a planilha de matrículas em CSV. A central mostra uma prévia com o que vai criar e o que precisa de correção; nada entra na rede antes de você publicar."
      acoes={
        <button type="button" className="ce-botao ce-botao-secundario" onClick={baixarModelo}>
          <Download size={18} aria-hidden /> Baixar modelo
        </button>
      }
    >
      <section className="ce-painel grid gap-4">
        <h2 className="text-lg font-medium">Nova importação</h2>
        <p className="text-tinta-suave">
          Colunas: <span className="font-mono text-sm">escola_inep (ou escola), turma, etapa, turno, estudante, data_nascimento, inep_estudante</span>.
          As escolas precisam estar cadastradas; turmas e estudantes novos são criados na publicação.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          {anos.dados && (
            <Campo id="imp-ano" rotulo="Ano letivo" className="w-40">
              <select id="imp-ano" className="ce-controle" value={ano || anos.dados.corrente} onChange={(e) => setAno(Number(e.target.value))}>
                {anos.dados.anos.map((a) => <option key={a.ano} value={a.ano}>{a.ano}</option>)}
              </select>
            </Campo>
          )}
          <label className={`ce-botao ce-botao-primario ${ocupado ? 'pointer-events-none opacity-60' : ''}`}>
            <Upload size={18} aria-hidden /> {ocupado ? 'Analisando…' : 'Escolher planilha CSV'}
            <input type="file" accept=".csv,.txt,text/csv" className="sr-only" onChange={(e) => void escolher(e)} disabled={ocupado} />
          </label>
        </div>
        {erro && <Aviso tom="erro">{erro}</Aviso>}
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Importações recentes</h2>
        {lotes.erro && <Aviso tom="erro">{lotes.erro}</Aviso>}
        {!lotes.dados ? (
          !lotes.erro && <Carregando />
        ) : lotes.dados.length === 0 ? (
          <p className="text-tinta-suave">Nenhuma importação ainda.</p>
        ) : (
          <div className="ce-tabela-caixa">
            <table className="ce-tabela">
              <thead><tr><th>Arquivo</th><th>Ano</th><th>Linhas</th><th>Situação</th><th>Enviado</th><th><span className="sr-only">Abrir</span></th></tr></thead>
              <tbody>
                {lotes.dados.map((l) => (
                  <tr key={l.id}>
                    <td className="font-semibold">{l.arquivoNome}</td>
                    <td className="ce-num">{l.anoLetivo}</td>
                    <td className="ce-num">{l.total}</td>
                    <td><Selo tom={TOM[l.situacao]}>{ROTULO_SITUACAO_LOTE[l.situacao]}</Selo></td>
                    <td className="text-sm">{dataHoraBr(l.criadoEm)} · {l.criadoPor}</td>
                    <td className="text-right">
                      <Link to={`/importacao/${l.id}`} className="ce-botao ce-botao-discreto">Abrir <ChevronRight size={16} aria-hidden /></Link>
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

type Filtro = 'todas' | 'problema' | 'nova' | 'ja_existe' | 'ignorada';

export function LoteImportacaoTela() {
  const { id } = useParams();
  const lote = useDados(() => chamar<LoteImportacao>(`/importacoes/${id}`), [id]);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);

  async function acao(fn: () => Promise<LoteImportacao>) {
    setOcupado(true);
    setErro('');
    try {
      const novo = await fn();
      if (novo.linhas) lote.setDados(novo);
      else await lote.recarregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  if (lote.erro) return <Aviso tom="erro">{lote.erro}</Aviso>;
  const l = lote.dados;
  if (!l || !l.linhas) return <Carregando />;
  const aberto = l.situacao === 'com_inconsistencias' || l.situacao === 'pronto';
  const linhas = l.linhas.filter((x) =>
    filtro === 'todas' ? true : filtro === 'ignorada' ? x.ignorar : !x.ignorar && x.situacao === filtro,
  );

  return (
    <Pagina
      rotulo={`Importação de matrículas · ${l.anoLetivo}`}
      titulo={l.arquivoNome}
      descricao={`Enviado por ${l.criadoPor} em ${dataHoraBr(l.criadoEm)}.`}
      acoes={<Link to="/importacao" className="ce-botao ce-botao-discreto"><ArrowLeft size={18} aria-hidden /> Importações</Link>}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Selo tom={TOM[l.situacao]}>{ROTULO_SITUACAO_LOTE[l.situacao]}</Selo>
        <span className="text-tinta-suave">
          {l.total} linhas · {l.novas} novas · {l.jaExistentes} já existentes · {l.comProblema} com problema · {l.ignoradas} ignoradas
        </span>
      </div>

      {l.mesmoArquivoPublicadoEm && aberto && (
        <Aviso tom="atencao">Este mesmo arquivo já foi publicado em {dataHoraBr(l.mesmoArquivoPublicadoEm)}. Publicar de novo não duplica nada.</Aviso>
      )}
      {l.situacao === 'com_inconsistencias' && (
        <Aviso tom="atencao">Há linhas com problema. Corrija a planilha e envie de novo, ou marque as linhas para ignorar.</Aviso>
      )}
      {l.situacao === 'publicado' && l.resumo && (
        <Aviso tom="sucesso" titulo={`Publicado em ${dataHoraBr(l.publicadoEm)}`}>
          {l.resumo.matriculasCriadas} matrículas, {l.resumo.turmasCriadas} turmas e {l.resumo.estudantesCriados} estudantes criados.
        </Aviso>
      )}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {aberto && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ce-botao ce-botao-primario" disabled={ocupado || l.situacao !== 'pronto'}
            onClick={() => void acao(() => chamar(`/importacoes/${l.id}/publicar`, { json: {} }))}>
            {ocupado ? 'Publicando…' : `Publicar ${l.novas} matrícula${l.novas === 1 ? '' : 's'}`}
          </button>
          {!confirmarDescarte ? (
            <button type="button" className="ce-botao ce-botao-perigo" disabled={ocupado} onClick={() => setConfirmarDescarte(true)}>
              Descartar importação
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span>Descartar? Nada desta planilha entra na rede.</span>
              <button type="button" className="ce-botao ce-botao-perigo" disabled={ocupado}
                onClick={() => void acao(() => chamar(`/importacoes/${l.id}/descartar`, { json: {} }))}>Sim, descartar</button>
              <button type="button" className="ce-botao ce-botao-discreto" onClick={() => setConfirmarDescarte(false)}>Não</button>
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar linhas">
        {(['todas', 'problema', 'nova', 'ja_existe', 'ignorada'] as Filtro[]).map((f) => (
          <button key={f} type="button" aria-pressed={filtro === f}
            className={`ce-botao ${filtro === f ? 'ce-botao-primario' : 'ce-botao-secundario'}`} onClick={() => setFiltro(f)}>
            {{ todas: 'Todas', problema: 'Com problema', nova: 'Novas', ja_existe: 'Já existentes', ignorada: 'Ignoradas' }[f]}
          </button>
        ))}
      </div>

      <div className="ce-tabela-caixa">
        <table className="ce-tabela">
          <thead><tr><th>Linha</th><th>Escola</th><th>Turma</th><th>Etapa</th><th>Estudante</th><th>Nascimento</th><th>Resultado</th>{aberto && <th>Ignorar</th>}</tr></thead>
          <tbody>
            {linhas.map((x) => (
              <tr key={x.numero} className={x.ignorar ? 'ce-linha-apagada' : ''}>
                <td className="ce-num">{x.numero}</td>
                <td className="text-sm">{x.dados.escolaInep ?? x.dados.escola ?? '—'}</td>
                <td>{x.dados.turma || '—'}</td>
                <td>{x.dados.etapa ? ROTULO_ETAPA[x.dados.etapa] : '—'}</td>
                <td className="font-semibold">{x.dados.estudante || '—'}</td>
                <td className="ce-num">{dataBr(x.dados.dataNascimento)}</td>
                <td className="min-w-64">
                  {x.situacao === 'problema' ? (
                    <ul className="grid gap-0.5 text-sm" style={{ color: 'var(--devolvida-tinta)' }}>
                      {x.problemas.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  ) : x.situacao === 'nova' ? <Selo tom="semed">Nova matrícula</Selo> : <Selo tom="rascunho">Já existe</Selo>}
                </td>
                {aberto && (
                  <td>
                    <input type="checkbox" className="size-5 accent-[var(--semed)]" aria-label={`Ignorar linha ${x.numero}`}
                      checked={x.ignorar} disabled={ocupado}
                      onChange={(e) => void acao(() => chamar(`/importacoes/${l.id}/linhas/${x.numero}`, { metodo: 'PATCH', json: { ignorar: e.target.checked } }))} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {linhas.length === 0 && <p className="p-4 text-tinta-suave">Nenhuma linha neste filtro.</p>}
      </div>
    </Pagina>
  );
}
