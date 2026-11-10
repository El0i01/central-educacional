// Vitrine dos componentes do design system na documentação HTML.
// Roda depois do React 18 (UMD) e do bundle.js do design system (window.CentralUI).
(function () {
  var C = window.CentralUI;
  var h = window.React && window.React.createElement;
  if (!C || !h || !window.ReactDOM) return;

  function montar(id, elemento) {
    var alvo = document.getElementById(id);
    if (alvo) window.ReactDOM.createRoot(alvo).render(elemento);
  }

  var OPCOES = ['Ainda não observado', 'Em desenvolvimento', 'Observado'];

  montar('v-Botao', h(window.React.Fragment, null,
    h(C.Botao, { variante: 'primario', icone: 'seta' }, 'Enviar à coordenação'),
    h(C.Botao, null, 'Salvar rascunho'),
    h(C.Botao, { ocupado: true }, 'Salvando…'),
    h(C.Botao, { variante: 'discreto', href: '#design-system' }, 'Ver histórico'),
    h(C.Botao, { variante: 'perigo', icone: 'voltar' }, 'Devolver para ajuste')));

  montar('v-SeloSituacao', h(window.React.Fragment, null,
    ['rascunho', 'enviada', 'devolvida', 'validada'].map(function (s) {
      return h(C.SeloSituacao, { key: s, situacao: s });
    })));

  montar('v-SeloSincronia', h(window.React.Fragment, null,
    ['aparelho', 'aguardando', 'sincronizado'].map(function (s) {
      return h(C.SeloSincronia, { key: s, estado: s });
    })));

  montar('v-Campo', h('div', { className: 'v-pilha' },
    h(C.Campo, { id: 'v-presenca', rotulo: 'Situação do acompanhamento', ajuda: 'Ausente e não avaliado não recebem resultado de aprendizagem.' },
      h('select', { defaultValue: 'presente', name: 'presenca' },
        h('option', { value: 'presente' }, 'Estudante acompanhado'),
        h('option', { value: 'ausente' }, 'Ausente'),
        h('option', { value: 'nao_avaliado' }, 'Não avaliado'))),
    h(C.Campo, { id: 'v-orientacao', rotulo: 'Orientação para ajuste', erro: 'Informe a orientação para devolver a ficha.' },
      h('textarea', { rows: 2, name: 'orientacao' }))));

  function Escala() {
    var e = window.React.useState('Em desenvolvimento');
    return h(C.EscalaOpcoes, { nome: 'v-leitura', enunciado: 'Lê palavras de uso frequente', opcoes: OPCOES, valor: e[0], onChange: e[1] });
  }
  montar('v-EscalaOpcoes', h('div', { className: 'v-estreito' }, h(Escala)));

  montar('v-Aviso', h('div', { className: 'v-pilha' },
    h(C.Aviso, { tom: 'info' }, 'Ficha de exemplo para desenvolvimento. Os critérios oficiais entram depois da validação pela secretaria.'),
    h(C.Aviso, { tom: 'erro', titulo: 'Orientação da coordenação' }, 'Confira o registro de escrita: o estudante já escreve frases curtas.'),
    h(C.Aviso, { tom: 'atencao' }, 'O período de preenchimento termina em 3 dias.'),
    h(C.Aviso, { tom: 'sucesso' }, 'Ficha enviada à coordenação.')));

  montar('v-Progresso', h('div', { className: 'v-estreito' },
    h(C.Progresso, { valor: 4, total: 6, rotulo: 'Fichas validadas' })));

  montar('v-CartaoTurma', h('div', { className: 'v-cartoes' },
    h(C.CartaoTurma, { nome: '2º ano A', etapa: 'EF2 · matutino', escola: 'Escola Demonstrativa A', estudantes: 24, enviadas: 6, validadas: 15, href: '#design-system', nivelTitulo: 4 }),
    h(C.CartaoTurma, { nome: '1º ano B', etapa: 'EF1 · vespertino', escola: 'Escola Demonstrativa B', estudantes: 19, enviadas: 2, validadas: 3, href: '#design-system', nivelTitulo: 4 })));

  // Composição: a ficha no celular do professor, com os componentes juntos.
  function FichaCelular() {
    var r = window.React.useState({ l1: 'Observado', e1: 'Em desenvolvimento', o1: '' });
    var resp = r[0];
    function marcar(id) {
      return function (v) {
        var n = Object.assign({}, resp);
        n[id] = v;
        r[1](n);
      };
    }
    var faltam = ['l1', 'e1', 'o1'].filter(function (k) { return !resp[k]; }).length;
    return h('div', { className: 'v-celular' },
      h('div', { className: 'v-cel-topo' },
        h('span', { className: 'v-cel-voltar' }, '‹ 2º ano A'),
        h(C.SeloSincronia, { estado: 'aparelho' })),
      h('div', { className: 'v-cel-corpo' },
        h('p', { className: 'v-cel-sobre' }, 'FLEO diagnóstica 2026 · 1º bimestre'),
        h('h4', { className: 'v-cel-nome' }, 'Estudante 04'),
        h(C.SeloSituacao, { situacao: 'devolvida' }),
        h(C.Aviso, { tom: 'erro', titulo: 'Orientação da coordenação' }, 'Reveja a oralidade: na leitura em voz alta ele reconta a história.'),
        h(C.EscalaOpcoes, { nome: 'v-l1', enunciado: 'Leitura · Lê palavras de uso frequente', opcoes: OPCOES, valor: resp.l1, onChange: marcar('l1') }),
        h(C.EscalaOpcoes, { nome: 'v-e1', enunciado: 'Escrita · Escreve palavras ditadas', opcoes: OPCOES, valor: resp.e1, onChange: marcar('e1') }),
        h(C.EscalaOpcoes, { nome: 'v-o1', enunciado: 'Oralidade · Reconta uma história ouvida', opcoes: OPCOES, valor: resp.o1, onChange: marcar('o1') }),
        h(C.Campo, { id: 'v-obs', rotulo: 'Observação pedagógica', ajuda: 'Só o necessário ao acompanhamento.' },
          h('textarea', { rows: 2, name: 'observacao', placeholder: 'Ex.: lê com apoio de imagens…' }))),
      h('div', { className: 'v-cel-acoes' },
        h('p', { className: 'v-cel-falta' }, faltam === 1 ? 'Falta 1 item para reenviar.' : faltam ? 'Faltam ' + faltam + ' itens para reenviar.' : 'Tudo preenchido.'),
        h('div', { className: 'v-cel-botoes' },
          h(C.Botao, null, 'Salvar'),
          h(C.Botao, { variante: 'primario', disabled: faltam > 0 }, 'Reenviar'))));
  }
  montar('v-Composicao', h(FichaCelular));

  // Alternar o tema da vitrine (e da página) para ver os dois.
  var botao = document.getElementById('v-tema');
  if (botao) {
    botao.addEventListener('click', function () {
      var raiz = document.documentElement;
      var escuroAgora = raiz.getAttribute('data-theme')
        ? raiz.getAttribute('data-theme') === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      raiz.setAttribute('data-theme', escuroAgora ? 'light' : 'dark');
      botao.textContent = escuroAgora ? 'Ver tema escuro' : 'Ver tema claro';
    });
  }
})();
