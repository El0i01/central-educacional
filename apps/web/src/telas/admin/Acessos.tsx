// UC-A07: histórico de acessos (entradas, dado nominal de estudante, alterações). Só leitura.
// Filtros ficam na URL, para poder mandar o link de uma consulta.

import type { ListaRegistrosAcesso, RegistroAcesso, TipoRegistroAcesso } from '@central/tipos';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chamar } from '../../api';
import { Aviso, Campo, Carregando, dataHoraBr, Pagina, useDados } from '../../ui';

const ABAS: { tipo: TipoRegistroAcesso; nome: string; descricao: string }[] = [
  { tipo: 'entradas', nome: 'Entradas', descricao: 'Logins na central e bloqueios por senha errada.' },
  {
    tipo: 'nominal',
    nome: 'Dado de estudante',
    descricao: 'Quem abriu nomes de estudantes fora das próprias turmas (LGPD). Os nomes não aparecem aqui, só quantos eram.',
  },
  { tipo: 'alteracoes', nome: 'Alterações', descricao: 'Toda mudança registrada: cadastros, situações, importações, configuração.' },
];

const ROTULO_ACAO: Record<string, string> = {
  login: 'Entrou',
  bloqueio: 'Bloqueado por tentativas',
  criacao: 'Criou',
  edicao: 'Editou',
  situacao: 'Mudou a situação',
  matricula: 'Matriculou',
  exclusao: 'Excluiu',
  transferencia_saida: 'Transferência (saída)',
  transferencia_entrada: 'Transferência (entrada)',
  publicacao: 'Publicou',
  descarte: 'Descartou',
  professores: 'Mudou professores',
  senha_provisoria: 'Gerou senha provisória',
  troca_senha: 'Trocou a senha',
  desfeito: 'Desfez',
  modulo_ligado: 'Ligou módulo',
  modulo_desligado: 'Desligou módulo',
  'abriu nomes': 'Abriu nomes',
};

function descreverAlvo(r: RegistroAcesso): string {
  if (r.estudantes !== null) return `${r.estudantes} estudante${r.estudantes === 1 ? '' : 's'}`;
  if (!r.entidade) return '—';
  return r.entidadeId ? `${r.entidade} nº ${r.entidadeId}` : r.entidade;
}

export function Acessos() {
  const [busca, setBusca] = useSearchParams();
  const tipo = (ABAS.find((a) => a.tipo === busca.get('tipo'))?.tipo ?? 'entradas') as TipoRegistroAcesso;
  const consulta = busca.toString();
  const lista = useDados(() => chamar<ListaRegistrosAcesso>(`/acessos?${consulta}`), [consulta]);
  const [usuario, setUsuario] = useState(busca.get('usuario') ?? '');
  const [de, setDe] = useState(busca.get('de') ?? '');
  const [ate, setAte] = useState(busca.get('ate') ?? '');

  function mudar(valores: Record<string, string>) {
    const nova = new URLSearchParams(busca);
    for (const [k, v] of Object.entries(valores)) {
      if (v) nova.set(k, v);
      else nova.delete(k);
    }
    if (!('pagina' in valores)) nova.delete('pagina');
    setBusca(nova);
  }

  function filtrar(e: FormEvent) {
    e.preventDefault();
    mudar({ usuario, de, ate });
  }

  const aba = ABAS.find((a) => a.tipo === tipo)!;
  const d = lista.dados;
  const paginas = d ? Math.max(1, Math.ceil(d.total / d.porPagina)) : 1;

  return (
    <Pagina rotulo="Configuração" titulo="Histórico de acessos" descricao={aba.descricao}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de registro">
        {ABAS.map((a) => (
          <button key={a.tipo} type="button" aria-pressed={a.tipo === tipo}
            className={`ce-botao ${a.tipo === tipo ? 'ce-botao-primario' : 'ce-botao-secundario'}`}
            onClick={() => mudar({ tipo: a.tipo })}>
            {a.nome}
          </button>
        ))}
      </div>

      <form onSubmit={filtrar} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <Campo id="ac-usuario" rotulo="Usuário">
          <input id="ac-usuario" className="ce-controle" value={usuario} spellCheck={false} autoComplete="off"
            onChange={(e) => setUsuario(e.target.value)} placeholder="Nome ou login…" />
        </Campo>
        <Campo id="ac-de" rotulo="De">
          <input id="ac-de" type="date" className="ce-controle" value={de} onChange={(e) => setDe(e.target.value)} />
        </Campo>
        <Campo id="ac-ate" rotulo="Até">
          <input id="ac-ate" type="date" className="ce-controle" value={ate} onChange={(e) => setAte(e.target.value)} />
        </Campo>
        <button type="submit" className="ce-botao ce-botao-secundario">Filtrar</button>
      </form>

      {lista.erro && <Aviso tom="erro">{lista.erro}</Aviso>}
      {!d && !lista.erro && <Carregando />}
      {d && d.itens.length === 0 && <p className="text-tinta-suave">Nenhum registro com esses filtros.</p>}
      {d && d.itens.length > 0 && (
        <>
          <div className="ce-tabela-caixa">
            <table className="ce-tabela">
              <thead>
                <tr><th>Quando</th><th>Usuário</th><th>Onde</th><th>O quê</th><th>Alvo</th><th>Motivo</th></tr>
              </thead>
              <tbody>
                {d.itens.map((r) => (
                  <tr key={`${r.id}-${r.quando}`}>
                    <td className="ce-num whitespace-nowrap">{dataHoraBr(r.quando)}</td>
                    <td>
                      {r.usuario ?? 'Sistema'}
                      {r.login && <span className="block font-mono text-xs text-tinta-suave" translate="no">{r.login}</span>}
                    </td>
                    <td className="font-mono text-sm" translate="no">{r.modulo}</td>
                    <td>{ROTULO_ACAO[r.acao] ?? r.acao}</td>
                    <td className="ce-num">{descreverAlvo(r)}</td>
                    <td className="max-w-64 break-words">{r.motivo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="flex flex-wrap items-center gap-3" aria-label="Páginas">
            <button type="button" className="ce-botao ce-botao-discreto" disabled={d.pagina <= 1}
              onClick={() => mudar({ pagina: String(d.pagina - 1) })}>Anterior</button>
            <span className="ce-num text-tinta-suave">
              Página {d.pagina} de {paginas} · {d.total} registro{d.total === 1 ? '' : 's'}
            </span>
            <button type="button" className="ce-botao ce-botao-discreto" disabled={d.pagina >= paginas}
              onClick={() => mudar({ pagina: String(d.pagina + 1) })}>Próxima</button>
          </nav>
        </>
      )}
    </Pagina>
  );
}
