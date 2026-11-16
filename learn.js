// Learn page: operator cards, move diagrams and charts. Everything is drawn with plain SVG.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);

  // Where each llrp_fast operator comes from. "Our extension" means no direct counterpart in the cited papers.
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


  // Family colours and leading-term candidate-count models per operator.
  // Assumptions: routes of average length 10, so K = n/10 routes; m = 5 depots, p = 3 open.
  const FAMILY = {
    customer: { color: '#1f5f8b', label: 'customer moves' },
    route:    { color: '#c2410c', label: 'route-pair moves' },
    depot:    { color: '#15803d', label: 'depot moves' },
  };
  const MODEL = {
    relocate: { fam: 'customer', f: (n) => n * n,            formula: 'n(n-1)' },
    oropt2:   { fam: 'customer', f: (n) => n * n,            formula: '~ n^2' },
    oropt3:   { fam: 'customer', f: (n) => n * n,            formula: '~ n^2' },
    swap11:   { fam: 'customer', f: (n) => n * n / 2,        formula: 'n(n-1)/2' },
    swap21:   { fam: 'customer', f: (n) => n * n,            formula: '~ n^2' },
    swap22:   { fam: 'customer', f: (n) => n * n / 2,        formula: '~ n^2/2' },
    swap31:   { fam: 'customer', f: (n) => n * n,            formula: '~ n^2' },
    swap32:   { fam: 'customer', f: (n) => n * n,            formula: '~ n^2' },
    '2opt':   { fam: 'route',    f: (n) => 5 * n,            formula: 'K * L^2/2 = 5n' },
    '2opt*':  { fam: 'route',    f: (n) => n * n / 2,        formula: '~ n^2/2' },
    swapstar: { fam: 'route',    f: (n) => n * n / 2,        formula: '~ n^2/2' },
    dexch:    { fam: 'depot',    f: (n) => n * n / 200,      formula: 'K^2/2 = n^2/200' },
    rdepot:   { fam: 'depot',    f: (n) => n / 5,            formula: 'K(p-1) = n/5' },
    ds:       { fam: 'depot',    f: (n) => n / 5,            formula: 'K(m-p) = n/5' },
  };

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

  // ---------- operator cards ----------
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
        cap.innerHTML = '';
        cap.append(document.createTextNode('Candidates per scan: '));
        const f = document.createElement('code');
        f.textContent = MODEL[op.id].formula;
        cap.append(f);
        card.append(chart, cap);
      }
      box.append(card);
    }
  }

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
      b.textContent = op.text;
      tr.append(a, b);
      body.append(tr);
    }
  }

  // ---------- SVG helpers ----------
  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k of Object.keys(attrs || {})) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // Flow of the descent loop
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
    // Loop back from "Apply" to "Next operator"
    svg.append(el('path', { d: 'M 432 90 L 432 102 L 8 102 L 8 90', fill: 'none', class: 'arrow', 'marker-end': 'url(#arr)' }));
    svg.append(el('text', { x: 220, y: 118, 'text-anchor': 'middle', class: 'lbl small' }, 'after a move, rescan from the first operator; stop when no operator improves'));
  }

  // Route layout used by the move diagrams
  function panel(routes, moved, ox, title) {
    const g = el('g', {});
    g.append(el('text', { x: ox + 130, y: 18, 'text-anchor': 'middle', class: 'lbl bold' }, title));
    const dep = { x: ox + 24, y: 100 };
    g.append(el('rect', { x: dep.x - 14, y: dep.y - 14, width: 28, height: 28, class: 'depot' }));
    g.append(el('text', { x: dep.x, y: dep.y + 4, 'text-anchor': 'middle', class: 'lbl small' }, 'D'));
    routes.forEach((route, r) => {
      const row = r === 0 ? 50 : 150;
      const pts = [[dep.x, dep.y]];
      route.forEach((label, i) => {
        const x = ox + 64 + 44 * i;
        pts.push([x, row]);
      });
      pts.push([dep.x, dep.y]);
      g.append(el('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: r === 0 ? 'route' : 'route2', fill: 'none' }));
      route.forEach((label, i) => {
        const x = ox + 64 + 44 * i;
        const isMoved = moved.includes(label);
        g.append(el('circle', { cx: x, cy: row, r: 12, class: isMoved ? 'node hl' : 'node' }));
        g.append(el('text', { x: x, y: row + 4, 'text-anchor': 'middle', class: 'lbl small' }, label));
      });
    });
    return g;
  }

  function diagram(name, before, after, moved, caption) {
    const wrap = document.createElement('figure');
    wrap.className = 'fig';
    const svg = el('svg', { viewBox: '0 0 640 200', role: 'img', 'aria-label': caption });
    svg.append(panel(before, moved, 0, 'Before'));
    svg.append(panel(after, moved, 320, 'After'));
    svg.append(el('line', { x1: 312, y1: 20, x2: 312, y2: 180, class: 'divider' }));
    wrap.append(svg);
    const fc = document.createElement('figcaption');
    fc.textContent = name + ': ' + caption;
    wrap.append(fc);
    return wrap;
  }

  function renderDiagrams() {
    const box = $('diagrams');
    box.textContent = '';
    // Relocate: customer b moves from route 1 to route 2, between x and y
    box.append(diagram('Relocate',
      [['a', 'b', 'c'], ['x', 'y']],
      [['a', 'c'], ['x', 'b', 'y']],
      ['b'],
      'customer b leaves route 1 and is inserted into route 2.'));
    // Swap: b and y exchange positions across routes
    box.append(diagram('Swap',
      [['a', 'b', 'c'], ['x', 'y']],
      [['a', 'y', 'c'], ['x', 'b']],
      ['b', 'y'],
      'customers b and y exchange their positions.'));
    // 2-opt*: tails after b (route 1) and after y (route 2) are exchanged
    box.append(diagram('2-opt*',
      [['a', 'b', 'c', 'd'], ['x', 'y', 'z']],
      [['a', 'b', 'z'], ['x', 'y', 'c', 'd']],
      ['c', 'z'],
      'the route tails after b and after y are exchanged.'));
  }

  // ---------- charts ----------
  function axisChart(svgId, opts) {
    const svg = $(svgId);
    svg.textContent = '';
    const W = 400, H = 300, L = 72, R = 14, T = 40, B = 46;
    const pw = W - L - R, ph = H - T - B;
    const x = (v) => L + ((v - opts.xmin) / (opts.xmax - opts.xmin)) * pw;
    const y = (v) => T + ph - (v / opts.ymax) * ph;
    // grid and y ticks
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
    const yl = el('text', { x: 14, y: T + ph / 2, 'text-anchor': 'middle', class: 'lbl', transform: 'rotate(-90 14 ' + (T + ph / 2) + ')' }, opts.ylabel);
    svg.append(yl);
    // series
    opts.series.forEach((s, idx) => {
      const pts = [];
      for (let v = opts.xmin; v <= opts.xmax; v += 1) pts.push(x(v) + ',' + y(s.f(v)));
      svg.append(el('polyline', { points: pts.join(' '), fill: 'none', class: 'series s' + idx }));
      // legend
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

  function drawPresets(counts) {
    const svg = $('chart-presets');
    svg.textContent = '';
    const W = 400, H = 260, L = 118, R = 26, T = 14, B = 14;
    const pw = W - L - R;
    const max = Math.max(...counts.map((c) => c.n));
    counts.forEach((c, i) => {
      const y = T + i * ((H - T - B) / counts.length);
      const bh = 26;
      const w = (c.n / max) * pw;
      svg.append(el('text', { x: L - 8, y: y + 18, 'text-anchor': 'end', class: 'lbl small' }, c.name));
      svg.append(el('rect', { x: L, y: y + 2, width: w, height: bh, class: 'bar' }));
      svg.append(el('text', { x: L + w + 6, y: y + 19, class: 'lbl small' }, String(c.n)));
    });
    svg.append(el('line', { x1: L, y1: T, x2: L, y2: H - B, class: 'axis' }));
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
      // Named preset sizes; light and hgamp are only known by size (see the inventory note).
      drawPresets([
        { name: 'baseline_route', n: ops.presets.baseline_route.length },
        { name: 'common5', n: ops.presets.common5.length },
        { name: 'llrp5', n: ops.presets.llrp5.length },
        { name: 'light', n: 5 },
        { name: 'hgamp', n: 15 },
      ]);
    } catch (e) {
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = 'Could not load data/operators.json. Open this page through a web server.';
      $('op-cards').append(p);
    }
  }

  init();
})();
