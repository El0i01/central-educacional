/* @ds-bundle: {"format":4,"namespace":"CentralUI","components":[{"name":"Botao"},{"name":"SeloSituacao"},{"name":"SeloSincronia"},{"name":"Campo"},{"name":"EscalaOpcoes"},{"name":"Aviso"},{"name":"CartaoTurma"},{"name":"Progresso"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(' ');
  }

  // Ícones no traço da família Lucide (24x24, traço 2), desenhados aqui para as prévias.
  var TRACOS = {
    lapis: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
    relogio: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
    voltar: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
    visto: ['M20 6 9 17l-5-5'],
    celular: ['M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z', 'M12 18h.01'],
    nuvemRiscada: ['m2 2 20 20', 'M5.8 8.7A5 5 0 0 0 7 18h10a4 4 0 0 0 1.8-.4', 'M21.5 14.5A4 4 0 0 0 17.5 10h-.8A7 7 0 0 0 9 5.2'],
    nuvemVisto: ['M17.5 19H8a6 6 0 1 1 5.7-8h1.8a4.5 4.5 0 0 1 2 8.5', 'm9 14 2 2 4-4'],
    info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 16v-4', 'M12 8h.01'],
    alerta: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z', 'M12 9v4', 'M12 17h.01'],
    turma: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
    seta: ['m9 18 6-6-6-6'],
    carregando: ['M21 12a9 9 0 1 1-6.2-8.6'],
  };

  function Icone(props) {
    var tracos = TRACOS[props.nome] || [];
    return h(
      'svg',
      {
        className: cx('ce-icone', props.className),
        width: props.tamanho || 16,
        height: props.tamanho || 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      },
      tracos.map(function (d, i) {
        return h('path', { key: i, d: d });
      }),
    );
  }

  // Com href vira link (navegação: Ctrl+clique e botão do meio funcionam); sem href, botão (ação).
  function Botao(p) {
    var variante = p.variante || 'secundario';
    var classe = cx('ce-botao', 'ce-botao-' + variante, p.largo && 'ce-largo', p.className);
    var icone = p.ocupado
      ? h(Icone, { nome: 'carregando', tamanho: 18, className: 'ce-girando' })
      : p.icone
        ? h(Icone, { nome: p.icone, tamanho: 18 })
        : null;
    if (p.href) {
      return h('a', { href: p.href, className: classe, onClick: p.onClick }, icone, p.children);
    }
    return h(
      'button',
      {
        type: p.type || 'button',
        className: classe,
        disabled: p.disabled || p.ocupado,
        onClick: p.onClick,
        'aria-busy': p.ocupado ? 'true' : undefined,
      },
      icone,
      p.children,
    );
  }

  var SITUACOES = {
    rascunho: { texto: 'Rascunho', icone: 'lapis' },
    enviada: { texto: 'Aguardando conferência', icone: 'relogio' },
    devolvida: { texto: 'Ajuste solicitado', icone: 'voltar' },
    validada: { texto: 'Validada', icone: 'visto' },
  };

  function SeloSituacao(p) {
    var s = SITUACOES[p.situacao] || SITUACOES.rascunho;
    return h(
      'span',
      { className: cx('ce-selo', 'ce-selo-' + (p.situacao || 'rascunho'), p.className) },
      h(Icone, { nome: s.icone, tamanho: 14 }),
      s.texto,
    );
  }

  var SINCRONIA = {
    aparelho: { texto: 'Salvo no aparelho', icone: 'celular', tom: 'rascunho' },
    aguardando: { texto: 'Aguardando conexão', icone: 'nuvemRiscada', tom: 'enviada' },
    sincronizado: { texto: 'Sincronizado', icone: 'nuvemVisto', tom: 'semed' },
  };

  function SeloSincronia(p) {
    var s = SINCRONIA[p.estado] || SINCRONIA.aparelho;
    return h(
      'span',
      { className: cx('ce-selo', 'ce-selo-' + s.tom, p.className), role: 'status' },
      h(Icone, { nome: s.icone, tamanho: 14 }),
      s.texto,
    );
  }

  function Campo(p) {
    var id = p.id;
    var ajudaId = id + '-ajuda';
    var filho = React.isValidElement(p.children)
      ? React.cloneElement(p.children, {
          id: id,
          className: cx('ce-controle', p.children.props.className),
          'aria-invalid': p.erro ? 'true' : undefined,
          'aria-describedby': p.erro || p.ajuda ? ajudaId : undefined,
        })
      : p.children;
    return h(
      'div',
      { className: cx('ce-campo', p.erro && 'ce-campo-erro', p.className) },
      h('label', { className: 'ce-rotulo', htmlFor: id }, p.rotulo),
      filho,
      p.erro || p.ajuda
        ? h('p', { id: ajudaId, className: p.erro ? 'ce-erro' : 'ce-ajuda' }, p.erro || p.ajuda)
        : null,
    );
  }

  function EscalaOpcoes(p) {
    return h(
      'fieldset',
      { className: cx('ce-escala', p.className), disabled: p.disabled },
      h('legend', { className: 'ce-escala-enunciado' }, p.enunciado),
      h(
        'div',
        { className: 'ce-escala-opcoes' },
        p.opcoes.map(function (op, i) {
          var marcado = p.valor === op;
          return h(
            'label',
            { key: op, className: cx('ce-opcao', marcado && 'ce-opcao-marcada') },
            h('input', {
              type: 'radio',
              name: p.nome,
              value: op,
              checked: marcado,
              onChange: function () {
                if (p.onChange) p.onChange(op);
              },
            }),
            h('span', { className: 'ce-opcao-passo', 'aria-hidden': 'true' }, i + 1),
            h('span', null, op),
            marcado ? h(Icone, { nome: 'visto', tamanho: 18, className: 'ce-opcao-visto' }) : null,
          );
        }),
      ),
    );
  }

  var AVISOS = { info: 'info', atencao: 'alerta', erro: 'alerta', sucesso: 'visto' };

  function Aviso(p) {
    var tom = p.tom || 'info';
    return h(
      'div',
      {
        className: cx('ce-aviso', 'ce-aviso-' + tom, p.className),
        role: tom === 'erro' ? 'alert' : 'status',
      },
      h(Icone, { nome: AVISOS[tom], tamanho: 18 }),
      h(
        'div',
        { className: 'ce-aviso-corpo' },
        p.titulo ? h('strong', null, p.titulo) : null,
        p.children ? h('div', null, p.children) : null,
      ),
    );
  }

  function Progresso(p) {
    var total = Math.max(0, p.total || 0);
    var feito = Math.min(total, Math.max(0, p.valor || 0));
    var pct = total ? Math.round((feito / total) * 100) : 0;
    return h(
      'div',
      { className: cx('ce-progresso', p.className) },
      p.rotulo
        ? h(
            'div',
            { className: 'ce-progresso-rotulo' },
            h('span', null, p.rotulo),
            h('span', { className: 'ce-num' }, feito + ' de ' + total),
          )
        : null,
      h(
        'div',
        {
          className: 'ce-progresso-trilho',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': total,
          'aria-valuenow': feito,
          'aria-label': p.rotulo || 'Andamento',
        },
        h('i', { style: { width: pct + '%' } }),
      ),
    );
  }

  function CartaoTurma(p) {
    return h(
      'article',
      { className: cx('ce-cartao', p.className) },
      h(
        'div',
        { className: 'ce-cartao-topo' },
        h('span', { className: 'ce-cartao-icone' }, h(Icone, { nome: 'turma', tamanho: 20 })),
        h('span', { className: 'ce-codigo' }, p.etapa),
      ),
      h('h' + (p.nivelTitulo || 3), { className: 'ce-cartao-titulo' }, p.nome),
      h('p', { className: 'ce-cartao-escola' }, p.escola),
      h(
        'dl',
        { className: 'ce-cartao-numeros' },
        h('div', null, h('dt', null, 'Estudantes'), h('dd', { className: 'ce-num' }, p.estudantes)),
        h('div', null, h('dt', null, 'Enviadas'), h('dd', { className: 'ce-num' }, p.enviadas)),
        h('div', null, h('dt', null, 'Validadas'), h('dd', { className: 'ce-num' }, p.validadas)),
      ),
      h(Progresso, { valor: p.validadas, total: p.estudantes, rotulo: 'Fichas validadas' }),
      p.href || p.onAbrir
        ? h(Botao, { variante: 'primario', largo: true, href: p.href, onClick: p.onAbrir }, 'Abrir turma')
        : null,
    );
  }

  window.CentralUI = window.CentralUI || {};
  Object.assign(window.CentralUI, {
    Botao: Botao,
    SeloSituacao: SeloSituacao,
    SeloSincronia: SeloSincronia,
    Campo: Campo,
    EscalaOpcoes: EscalaOpcoes,
    Aviso: Aviso,
    CartaoTurma: CartaoTurma,
    Progresso: Progresso,
  });
})();
