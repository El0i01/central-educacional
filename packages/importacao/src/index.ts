// M09 Importação: leitura de CSV e validação das linhas, como funções puras (UC-M01, M02).
// O que depende do banco (escola existe? estudante já matriculado?) a API confere depois.

import { ETAPAS, type Etapa, type Turno } from '@central/tipos';

export interface Csv {
  cabecalho: string[];
  linhas: string[][];
}

/** Lê CSV de planilha: separador ; , ou tab (o que aparecer mais no cabeçalho), aspas, BOM, CRLF. */
export function lerCsv(texto: string): Csv {
  const t = texto.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const primeira = t.slice(0, t.indexOf('\n') === -1 ? undefined : t.indexOf('\n'));
  const candidatos = [';', ',', '\t'];
  const sep = candidatos.reduce((a, b) => (primeira.split(b).length > primeira.split(a).length ? b : a));

  const registros: string[][] = [];
  let campo = '';
  let registro: string[] = [];
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"' && campo === '') aspas = true;
    else if (c === sep) {
      registro.push(campo);
      campo = '';
    } else if (c === '\n') {
      registro.push(campo);
      registros.push(registro);
      registro = [];
      campo = '';
    } else campo += c;
  }
  if (campo !== '' || registro.length > 0) {
    registro.push(campo);
    registros.push(registro);
  }
  const uteis = registros.filter((r) => r.some((c) => c.trim() !== ''));
  const [cabecalho = [], ...linhas] = uteis;
  return { cabecalho: cabecalho.map((c) => c.trim()), linhas };
}

export function semAcento(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Layout da planilha de matrículas ---

/** Coluna canônica → nomes aceitos no cabeçalho (comparados sem acento e sem maiúsculas). */
const COLUNAS = {
  escolaInep: ['escola_inep', 'inep_escola', 'inep da escola', 'codigo inep escola', 'inep'],
  escola: ['escola', 'nome da escola', 'unidade escolar'],
  turma: ['turma', 'nome da turma'],
  etapa: ['etapa', 'ano', 'serie', 'ano/serie', 'ano escolar'],
  turno: ['turno'],
  estudante: ['estudante', 'aluno', 'nome do estudante', 'nome do aluno', 'nome'],
  dataNascimento: ['data_nascimento', 'nascimento', 'data de nascimento', 'dt nascimento'],
  inepEstudante: ['inep_estudante', 'id inep', 'codigo inep do aluno', 'id inep do aluno', 'inep do estudante'],
} as const;

export type Coluna = keyof typeof COLUNAS;

/** Modelo de planilha para baixar na tela (cabeçalho + uma linha de exemplo fictícia). */
export const MODELO_MATRICULAS =
  'escola_inep;escola;turma;etapa;turno;estudante;data_nascimento;inep_estudante\n' +
  '11000001;Escola Demonstrativa A;2º ano A;2º ano;matutino;Estudante 01;10/05/2018;\n';

export interface LinhaMatricula {
  escolaInep: string | null;
  escola: string | null;
  turma: string;
  etapa: Etapa;
  turno: Turno | null;
  estudante: string;
  dataNascimento: string | null; // AAAA-MM-DD
  inepEstudante: string | null;
}

export interface LinhaAnalisada {
  /** Número da linha na planilha (cabeçalho = 1). */
  numero: number;
  dados: Partial<LinhaMatricula>;
  problemas: string[];
}

/** Mapeia o cabeçalho para as colunas canônicas. Falta coluna obrigatória → erro com o que falta. */
export function mapearCabecalho(cabecalho: string[]): { mapa: Partial<Record<Coluna, number>>; faltando: string[] } {
  const normal = cabecalho.map(semAcento);
  const mapa: Partial<Record<Coluna, number>> = {};
  for (const [coluna, nomes] of Object.entries(COLUNAS) as [Coluna, readonly string[]][]) {
    const i = normal.findIndex((n) => nomes.includes(n));
    if (i >= 0) mapa[coluna] = i;
  }
  const faltando: string[] = [];
  if (mapa.escolaInep === undefined && mapa.escola === undefined) faltando.push('escola_inep ou escola');
  for (const c of ['turma', 'etapa', 'estudante'] as const) if (mapa[c] === undefined) faltando.push(c);
  return { mapa, faltando };
}

/** Aceita "EF2", "2º ano", "2 ano", "2", "Pré I", "pre 2"... */
export function lerEtapa(v: string): Etapa | null {
  const t = semAcento(v).replace(/[º°ª.]/g, '');
  if ((ETAPAS as readonly string[]).includes(t.toUpperCase())) return t.toUpperCase() as Etapa;
  const pre = /^(pre|pre-escola|infantil)\s*(i{1,2}|1|2|4 anos|5 anos)$/.exec(t);
  if (pre) return ['i', '1', '4 anos'].includes(pre[2]!) ? 'EI4' : 'EI5';
  const ano = /^([1-9])\s*(ano|serie)?$/.exec(t);
  if (ano) return `EF${ano[1]}` as Etapa;
  return null;
}

export function lerTurno(v: string): Turno | null | 'invalido' {
  const t = semAcento(v);
  if (!t) return null;
  const mapa: Record<string, Turno> = {
    matutino: 'matutino', manha: 'matutino', m: 'matutino',
    vespertino: 'vespertino', tarde: 'vespertino', v: 'vespertino', t: 'vespertino',
    noturno: 'noturno', noite: 'noturno', n: 'noturno',
    integral: 'integral', i: 'integral',
  };
  return mapa[t] ?? 'invalido';
}

/** Aceita 10/05/2018, 10-05-2018 e 2018-05-10. Devolve AAAA-MM-DD ou null se inválida. */
export function lerData(v: string): string | null | 'invalida' {
  const t = v.trim();
  if (!t) return null;
  let a: number, m: number, d: number;
  let r = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  if (r) [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t))) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else return 'invalida';
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return 'invalida';
  if (a < 1990 || data.getTime() > Date.now()) return 'invalida';
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function digitos(v: string): string {
  return v.replace(/\D/g, '');
}

/** Valida cada linha sozinha e marca linhas repetidas (mesmo estudante na mesma turma e escola). */
export function analisarMatriculas(csv: Csv): { faltando: string[]; linhas: LinhaAnalisada[] } {
  const { mapa, faltando } = mapearCabecalho(csv.cabecalho);
  if (faltando.length > 0) return { faltando, linhas: [] };
  const valor = (r: string[], c: Coluna) => (mapa[c] === undefined ? '' : (r[mapa[c]!] ?? '').trim());

  const vistos = new Map<string, number>();
  const linhas = csv.linhas.map((r, i): LinhaAnalisada => {
    const numero = i + 2;
    const problemas: string[] = [];
    const dados: Partial<LinhaMatricula> = {};

    const inep = digitos(valor(r, 'escolaInep'));
    dados.escolaInep = inep || null;
    dados.escola = valor(r, 'escola') || null;
    if (inep && inep.length !== 8) problemas.push('INEP da escola precisa ter 8 dígitos.');
    if (!inep && !dados.escola) problemas.push('Informe o INEP ou o nome da escola.');

    dados.turma = valor(r, 'turma');
    if (!dados.turma) problemas.push('Turma em branco.');

    const etapaTexto = valor(r, 'etapa');
    const etapa = lerEtapa(etapaTexto);
    if (etapa) dados.etapa = etapa;
    else problemas.push(etapaTexto ? `Etapa "${etapaTexto}" não reconhecida.` : 'Etapa em branco.');

    const turno = lerTurno(valor(r, 'turno'));
    if (turno === 'invalido') problemas.push(`Turno "${valor(r, 'turno')}" não reconhecido.`);
    else dados.turno = turno;

    dados.estudante = valor(r, 'estudante').replace(/\s+/g, ' ');
    if (!dados.estudante) problemas.push('Nome do estudante em branco.');

    const nasc = lerData(valor(r, 'dataNascimento'));
    if (nasc === 'invalida') problemas.push(`Data de nascimento "${valor(r, 'dataNascimento')}" inválida.`);
    else dados.dataNascimento = nasc;

    const inepEst = digitos(valor(r, 'inepEstudante'));
    if (inepEst && inepEst.length !== 12) problemas.push('ID INEP do estudante precisa ter 12 dígitos.');
    dados.inepEstudante = inepEst || null;

    const chave = [inep || semAcento(dados.escola ?? ''), semAcento(dados.turma ?? ''), inepEst || `${semAcento(dados.estudante)}|${dados.dataNascimento ?? ''}`].join('#');
    const anterior = vistos.get(chave);
    if (anterior) problemas.push(`Repete a linha ${anterior}.`);
    else vistos.set(chave, numero);

    return { numero, dados, problemas };
  });
  return { faltando, linhas };
}
