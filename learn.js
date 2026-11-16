// Learn page: operator cards, move diagrams, literature matrix and charts. Plain SVG, no libraries.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);

  // Where each llrp_fast operator comes from.
  const REF = {
    relocate: 'Insertion: Osorio-Mora et al. (2023), Sec. 3.3; Vincent et al. (2010) for the CLRP.',
    oropt2: 'Our block extension of insertion (not in the cited papers).',
    oropt3: 'Our block extension of insertion (not in the cited papers).',
    swap11: 'Swap: Osorio-Mora et al. (2023), Sec. 3.3. Block sizes are our extension.',
    swap21: 'Block swap: our extension of swap.',
    swap22: 'Block swap: our extension of swap.',
    swap31: 'Block swap: our extension of swap.',
    swap32: 'Block swap: our extension of swap.',
    '2opt': '2-opt: Osorio-Mora et al. (2023), Sec. 3.3; classical TSP move, Lin and Kernighan (1973).',
    '2opt*': 'Inter-route 2-opt crossing: Osorio-Mora et al. (2023), Sec. 3.3.',
    swapstar: 'Swap*: best reinsertion of two customers across routes (Vidal et al.; citation to be checked).',
    dexch: 'Closest to RouteSwap, Osorio-Mora et al. (2023), Algorithm 3.',
    rdepot: 'Closest to RouteRelocation, Osorio-Mora et al. (2023), Algorithm 3.',
    ds: 'Closest to DepotOpenClose, Osorio-Mora et al. (2023), Algorithm 3.',
  };

  // Colour families and leading-term candidate counts.
  // Assumptions: routes of average length 10, so K = n/10 routes; m = 5 depots, p = 3 open.
  const FAMILY = {
    customer: { color: '#1f5f8b', label: 'customer moves' },
    route:    { color: '#c2410c', label: 'route-pair moves' },
    depot:    { color: '#15803d', label: 'depot moves' },
  };
  const MODEL = {
    relocate: { fam: 'customer', f: (n) => n * n,       formula: 'n(n-1)' },
    oropt2:   { fam: 'customer', f: (n) => n * n,       formula: '~ n^2' },
    oropt3:   { fam: 'customer', f: (n) => n * n,       formula: '~ n^2' },
    swap11:   { fam: 'customer', f: (n) => n * n / 2,   formula: 'n(n-1)/2' },
    swap21:   { fam: 'customer', f: (n) => n * n,       formula: '~ n^2' },
    swap22:   { fam: 'customer', f: (n) => n * n / 2,   formula: '~ n^2/2' },
    swap31:   { fam: 'customer', f: (n) => n * n,       formula: '~ n^2' },
    swap32:   { fam: 'customer', f: (n) => n * n,       formula: '~ n^2' },
    '2opt':   { fam: 'route',    f: (n) => 5 * n,       formula: 'K * L^2/2 = 5n' },
    '2opt*':  { fam: 'route',    f: (n) => n * n / 2,   formula: '~ n^2/2' },
    swapstar: { fam: 'route',    f: (n) => n * n / 2,   formula: '~ n^2/2' },
    dexch:    { fam: 'depot',    f: (n) => n * n / 200, formula: 'K^2/2 = n^2/200' },
    rdepot:   { fam: 'depot',    f: (n) => n / 5,       formula: 'K(p-1) = n/5' },
    ds:       { fam: 'depot',    f: (n) => n / 5,       formula: 'K(m-p) = n/5' },
  };

  // Which llrp_fast operators each cited paper describes (see Section 7 of the page).
  const LIT_COLS = [
    { key: 'om2023',  label: 'Osorio-Mora 2023',  ops: ['relocate', 'swap11', '2opt', '2opt*', 'dexch', 'rdepot', 'ds'] },
    { key: 'om2023a', label: 'Osorio-Mora 2023a', ops: ['relocate', 'swap11', '2opt', '2opt*'] },
    { key: 'mjl2016', label: 'Moshref-Javadi 2016', ops: ['relocate', 'swap11', '2opt', '2opt*'] },
    { key: 'ng2022',  label: 'Nucamendi-Guillén 2022', ops: ['relocate', 'swap11', '2opt'] },
  ];

  // ---------- SVG helpers ----------
  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k of Object.keys(attrs || {})) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- operator cards and mini charts ----------
  function miniChart(op) {
    const m = MODEL[op.id];
    if (!m) return null;
    const fam = FAMILY[m.fam];
    const W = 240, H = 130, L = 36, R = 8, T = 10, B = 22;
    const pw = W - L - R, ph = H - T - B;
    const xmin = 10, xmax = 200;
    const ymax = Math.max(...Array.from({ length: 191 }, (_, i) => m.f(xmin + i)));
    const stepUnit = Math.pow(10, Math.floor(Math.log10(ymax)));
    const niceMax = Math.ceil(ymax / stepUnit) * stepUnit;
    const x = (v) => L + ((v - xmin) / (xmax - xmin)) * pw;
    const y = (v) => T + ph - (v / niceMax) * ph;
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': op.id + ' candidate moves versus n' });
    svg.append(el('line', { x1: L, y1: T + ph, x2: W - R, y2: T + ph, class: 'axis' }));
    svg.append(el('line', { x1: L, y1: T, x2: L, y2: T + ph, class: 'axis' }));
    svg.append(el('text', { x: L - 4, y: T + 4, 'text-anchor': 'end', class: 'lbl tiny' }, niceMax >= 1000 ? (niceMax / 1000) + 'k' : String(niceMax)));
    svg.append(el('text', { x: L - 4, y: T + ph + 3, 'text-anchor': 'end', class: 'lbl tiny' }, '0'));
    svg.append(el('text', { x: L, y: H - 6, 'text-anchor': 'middle', class: 'lbl tiny' }, '10'));
    svg.append(el('text', { x: W - R, y: H - 6, 'text-anchor': 'end', class: 'lbl tiny' }, '200'));
    svg.append(el('text', { x: (L + W - R) / 2, y: H - 6, 'text-anchor': 'middle', class: 'lbl tiny' }, 'customers n'));
    const pts = [];
    for (let v = xmin; v <= xmax; v += 2) pts.push(x(v).toFixed(1) + ',' + y(m.f(v)).toFixed(1));
    const area = 'M' + x(xmin) + ',' + (T + ph) + ' L' + pts.join(' L') + ' L' + x(xmax) + ',' + (T + ph) + ' Z';
    svg.append(el('path', { d: area, fill: fam.color, 'fill-opacity': 0.14 }));
    svg.append(el('polyline', { points: pts.join(' '), fill: 'none', stroke: fam.color, 'stroke-width': 2.4 }));
    return svg;
  }

  function renderCards(ops) {
    const box = $('op-cards');
    box.textContent = '';
    for (const op of ops) {
      const card = document.createElement('article');
      card.className = 'op-card';
      const fm = MODEL[op.id];
      if (fm) card.style.borderTop = '4px solid ' + FAMILY[fm.fam].color;
      const h = document.createElement('h3');
      const code = document.createElement('code');
      code.textContent = op.id;
      h.append(code);
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = op.group;
      h.append(' ', tag);
      const p = document.createElement('p');
      p.textContent = op.text;
      const r = document.createElement('p');
      r.className = 'ref';
      r.textContent = REF[op.id] || '';
      card.append(h, p, r);
      const chart = miniChart(op);
      if (chart) {
        const cap = document.createElement('p');
        cap.className = 'mini-cap';
        cap.append(document.createTextNode('Candidates per scan: '));
        const f = document.createElement('code');
        f.textContent = fm.formula;
        cap.append(f);
        card.append(chart, cap);
      }
      box.append(card);
    }
  }

  // ---------- named neighbourhoods ----------
  function renderNamed(named) {
    const body = $('named-body');
    body.textContent = '';
    for (const op of named) {
      const tr = document.createElement('tr');
      const a = document.createElement('td');
      const code = document.createElement('code');
      code.textContent = op.id;
      a.append(code);
      const b = document.createElement('td');
      b.textContent = op.text.replace(/\s*\(llrp5 family\)/, '');
      tr.append(a, b);
      body.append(tr);
    }
  }

  // ---------- literature matrix ----------
  function renderMatrix(ops) {
    const t = $('lit-matrix');
    t.textContent = '';
    const head = document.createElement('tr');
    for (const txt of ['Operator', 'Family'].concat(LIT_COLS.map((c) => c.label), ['Zou 2024'])) {
      const th = document.createElement('th');
      th.textContent = txt;
      head.append(th);
    }
    const thead = document.createElement('thead');
    thead.append(head);
    t.append(thead);
    const body = document.createElement('tbody');
    for (const op of ops) {
      const fm = MODEL[op.id];
      const tr = document.createElement('tr');
      const c0 = document.createElement('td');
      const code = document.createElement('code');
      code.textContent = op.id;
      c0.append(code);
      tr.append(c0);
      const c1 = document.createElement('td');
      if (fm) {
        const sw = document.createElement('span');
        sw.className = 'swatch';
        sw.style.setProperty('--c', FAMILY[fm.fam].color);
        c1.append(sw, document.createTextNode(FAMILY[fm.fam].label));
      } else {
        c1.textContent = 'our extension';
      }
      tr.append(c1);
      for (const col of LIT_COLS) {
        const c = document.createElement('td');
        c.className = 'tick';
        const yes = col.ops.includes(op.id);
        c.textContent = yes ? '✓' : '—';
        c.setAttribute('aria-label', yes ? 'yes' : 'no');
        if (yes) c.classList.add('yes');
        tr.append(c);
      }
      const z = document.createElement('td');
      z.className = 'tick pending';
      z.textContent = '?';
      z.setAttribute('aria-label', 'to be transcribed');
      tr.append(z);
      body.append(tr);
    }
    t.append(body);
  }

  // ---------- flow figure ----------
  function drawFlow() {
    const svg = $('fig-flow');
    const labels = [
      ['Next', 'operator'],
      ['Scan', 'neighbourhood'],
      ['Improving', 'move?'],
      ['Apply best', '(or first) move'],
      ['Local', 'optimum'],
    ];
    const W = 100, H = 44, Y = 30, GAP = 26;
    const defs = el('defs', {});
    const m = el('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
    m.append(el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrow-head' }));
    defs.append(m);
    svg.append(defs);
    labels.forEach((lab, i) => {
      const x = 8 + i * (W + GAP);
      svg.append(el('rect', { x, y: Y, width: W, height: H, rx: 8, class: 'node-box' }));
      svg.append(el('text', { x: x + W / 2, y: Y + 19, 'text-anchor': 'middle', class: 'lbl small' }, lab[0]));
      svg.append(el('text', { x: x + W / 2, y: Y + 34, 'text-anchor': 'middle', class: 'lbl small' }, lab[1]));
      if (i < labels.length - 1) {
        svg.append(el('line', { x1: x + W, y1: Y + H / 2, x2: x + W + GAP, y2: Y + H / 2, class: 'arrow', 'marker-end': 'url(#arr)' }));
      }
    });
    svg.append(el('path', { d: 'M 432 90 L 432 102 L 8 102 L 8 90', fill: 'none', class: 'arrow', 'marker-end': 'url(#arr)' }));
    svg.append(el('text', { x: 220, y: 118, 'text-anchor': 'middle', class: 'lbl small' }, 'after a move, rescan from the first operator; stop when no operator improves'));
  }

  // ---------- move diagrams ----------
  // Routes: {d: depot index (0 = D1 top, 1 = D2 bottom), n: customer labels}. Route 0 is blue, route 1 orange.
  const PW = 230; // width of one panel
  function panel(routes, moved, ox, title) {
    const g = el('g', {});
    g.append(el('text', { x: ox + PW / 2, y: 18, 'text-anchor': 'middle', class: 'lbl bold' }, title));
    const depots = [{ x: ox + 20, y: 58, lab: 'D1' }, { x: ox + 20, y: 150, lab: 'D2' }];
    depots.forEach((dp) => {
      g.append(el('rect', { x: dp.x - 15, y: dp.y - 13, width: 30, height: 26, rx: 6, class: 'depot' }));
      g.append(el('text', { x: dp.x, y: dp.y + 4, 'text-anchor': 'middle', class: 'lbl depot-lbl' }, dp.lab));
    });
    routes.forEach((rt, r) => {
      const dp = depots[rt.d];
      // two routes from the same depot are drawn on separate rows so their customers do not overlap
      const shared = routes.filter((q) => q.d === rt.d).length > 1;
      const row = dp.y + (shared ? (r === 0 ? -20 : 20) : 0);
      const pts = [[dp.x + 15, row]];
      rt.n.forEach((lab, i) => pts.push([ox + 60 + 34 * i, row]));
      pts.push([dp.x + 15, row]);
      g.append(el('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'rt r' + r, fill: 'none' }));
      rt.n.forEach((lab, i) => {
        const cx = ox + 60 + 34 * i;
        const hl = moved.includes(lab);
        g.append(el('circle', { cx, cy: row, r: 12, class: hl ? 'node hl' : 'node r' + r }));
        g.append(el('text', { x: cx, y: row + 4, 'text-anchor': 'middle', class: hl ? 'lbl hltxt' : 'lbl small' }, lab));
      });
    });
    return g;
  }

  const DIAG = [
    { op: 'relocate', name: 'Relocate', text: 'customer b leaves route 1 and is inserted into route 2.',
      before: [{ d: 0, n: ['a', 'b', 'c'] }, { d: 1, n: ['x', 'y'] }],
      after:  [{ d: 0, n: ['a', 'c'] }, { d: 1, n: ['x', 'b', 'y'] }], moved: ['b'] },
    { op: 'oropt2', name: 'Or-opt 2', text: 'the block (b, c) moves into route 2.',
      before: [{ d: 0, n: ['a', 'b', 'c', 'd'] }, { d: 1, n: ['x', 'y'] }],
      after:  [{ d: 0, n: ['a', 'd'] }, { d: 1, n: ['x', 'b', 'c', 'y'] }], moved: ['b', 'c'] },
    { op: 'swap11', name: 'Swap', text: 'customers b and y exchange positions across routes.',
      before: [{ d: 0, n: ['a', 'b', 'c'] }, { d: 1, n: ['x', 'y'] }],
      after:  [{ d: 0, n: ['a', 'y', 'c'] }, { d: 1, n: ['x', 'b'] }], moved: ['b', 'y'] },
    { op: 'swap21', name: 'Block swap 2-1', text: 'the block (b, c) exchanges with customer z.',
      before: [{ d: 0, n: ['a', 'b', 'c'] }, { d: 1, n: ['x', 'y', 'z'] }],
      after:  [{ d: 0, n: ['a', 'z'] }, { d: 1, n: ['x', 'y', 'b', 'c'] }], moved: ['b', 'c', 'z'] },
    { op: '2opt', name: '2-opt (intra-route)', text: 'the segment b to d is reversed inside route 1.',
      before: [{ d: 0, n: ['a', 'b', 'c', 'd', 'e'] }, { d: 1, n: ['x', 'y'] }],
      after:  [{ d: 0, n: ['a', 'd', 'c', 'b', 'e'] }, { d: 1, n: ['x', 'y'] }], moved: ['b', 'c', 'd'] },
    { op: '2opt*', name: '2-opt* (tail exchange)', text: 'the route tails after b and after y are exchanged.',
      before: [{ d: 0, n: ['a', 'b', 'c', 'd'] }, { d: 1, n: ['x', 'y', 'z'] }],
      after:  [{ d: 0, n: ['a', 'b', 'z'] }, { d: 1, n: ['x', 'y', 'c', 'd'] }], moved: ['c', 'd', 'z'] },
    { op: 'swapstar', name: 'Swap*', text: 'b and y are each reinserted at their best position in the other route.',
      before: [{ d: 0, n: ['a', 'b', 'c'] }, { d: 1, n: ['x', 'y', 'z'] }],
      after:  [{ d: 0, n: ['y', 'a', 'c'] }, { d: 1, n: ['x', 'z', 'b'] }], moved: ['b', 'y'] },
    { op: 'dexch', name: 'Depot exchange', text: 'the two routes swap their starting depots.',
      before: [{ d: 0, n: ['a', 'b', 'c'] }, { d: 1, n: ['x', 'y'] }],
      after:  [{ d: 1, n: ['a', 'b', 'c'] }, { d: 0, n: ['x', 'y'] }], moved: [] },
    { op: 'rdepot', name: 'Route depot move', text: 'route 2 is moved from depot D1 to depot D2.',
      before: [{ d: 0, n: ['a', 'b', 'c'] }, { d: 0, n: ['x', 'y'] }],
      after:  [{ d: 0, n: ['a', 'b', 'c'] }, { d: 1, n: ['x', 'y'] }], moved: ['x', 'y'] },
  ];

  function renderDiagrams() {
    const box = $('diagrams');
    box.textContent = '';
    for (const d of DIAG) {
      const fam = FAMILY[MODEL[d.op].fam];
      const wrap = document.createElement('figure');
      wrap.className = 'fig diag';
      wrap.style.borderTop = '4px solid ' + fam.color;
      const svg = el('svg', { viewBox: '0 0 ' + (2 * PW) + ' 200', role: 'img', 'aria-label': d.name + ': ' + d.text });
      svg.append(panel(d.before, d.moved, 0, 'Before'));
      svg.append(panel(d.after, d.moved, PW, 'After'));
      svg.append(el('line', { x1: PW, y1: 14, x2: PW, y2: 186, class: 'divider' }));
      wrap.append(svg);
      const fc = document.createElement('figcaption');
      const b = document.createElement('strong');
      b.textContent = d.name + ' (' + d.op + '): ';
      fc.append(b, document.createTextNode(d.text));
      wrap.append(fc);
      box.append(wrap);
    }
  }

  // ---------- candidate chart ----------
  function axisChart(svgId, opts) {
    const svg = $(svgId);
    svg.textContent = '';
    const W = 400, H = 300, L = 72, R = 14, T = 40, B = 46;
    const pw = W - L - R, ph = H - T - B;
    const x = (v) => L + ((v - opts.xmin) / (opts.xmax - opts.xmin)) * pw;
    const y = (v) => T + ph - (v / opts.ymax) * ph;
    for (let k = 0; k <= 4; k++) {
      const v = (opts.ymax * k) / 4;
      svg.append(el('line', { x1: L, y1: y(v), x2: W - R, y2: y(v), class: 'grid' }));
      svg.append(el('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'lbl small' }, opts.yfmt(v)));
    }
    for (let v = opts.xmin; v <= opts.xmax; v += opts.xstep) {
      svg.append(el('text', { x: x(v), y: H - B + 16, 'text-anchor': 'middle', class: 'lbl small' }, String(v)));
    }
    svg.append(el('line', { x1: L, y1: T + ph, x2: W - R, y2: T + ph, class: 'axis' }));
    svg.append(el('line', { x1: L, y1: T, x2: L, y2: T + ph, class: 'axis' }));
    svg.append(el('text', { x: W / 2, y: H - 4, 'text-anchor': 'middle', class: 'lbl' }, opts.xlabel));
    svg.append(el('text', { x: 16, y: T + ph / 2, 'text-anchor': 'middle', class: 'lbl small', transform: 'rotate(-90 16 ' + (T + ph / 2) + ')' }, opts.ylabel));
    opts.series.forEach((s, idx) => {
      const pts = [];
      for (let v = opts.xmin; v <= opts.xmax; v += 1) pts.push(x(v) + ',' + y(s.f(v)));
      svg.append(el('polyline', { points: pts.join(' '), fill: 'none', class: 'series s' + idx }));
      const lx = L + idx * 170, ly = 14;
      svg.append(el('line', { x1: lx, y1: ly, x2: lx + 18, y2: ly, class: 'series s' + idx }));
      svg.append(el('text', { x: lx + 24, y: ly + 4, class: 'lbl small' }, s.name));
    });
  }

  function drawCandidates() {
    axisChart('chart-candidates', {
      xmin: 10, xmax: 200, xstep: 50, ymax: 40000,
      xlabel: 'customers n',
      ylabel: 'candidates per scan',
      yfmt: (v) => Math.round(v / 1000) + 'k',
      series: [
        { name: 'relocate n(n-1)', f: (n) => n * (n - 1) },
        { name: 'swap n(n-1)/2', f: (n) => (n * (n - 1)) / 2 },
      ],
    });
  }

  // ---------- init ----------
  async function init() {
    drawFlow();
    renderDiagrams();
    drawCandidates();
    try {
      const ops = await (await fetch('data/operators.json')).json();
      renderCards(ops.llrp_ops);
      renderNamed(ops.meta_named);
      renderMatrix(ops.llrp_ops);
    } catch (e) {
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = 'Could not load data/operators.json. Open this page through a web server.';
      $('op-cards').append(p);
    }
  }

  init();
})();
