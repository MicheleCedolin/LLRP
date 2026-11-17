// LLRP Solver web front end. Runs entirely in the browser: solver jobs go to worker.js (WebAssembly).
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  // Operator presets taken from the cited LLRP papers (see Learn page, section 7).
  const LIT_PRESETS = [
    { key: 'om2023',  label: 'Osorio-Mora 2023',  ops: ['relocate', 'swap11', '2opt', '2opt*', 'dexch', 'rdepot', 'ds'] },
    { key: 'om2023a', label: 'Osorio-Mora 2023a', ops: ['relocate', 'swap11', '2opt', '2opt*'] },
    { key: 'mjl2016', label: 'Moshref-Javadi 2016', ops: ['relocate', 'swap11', '2opt', '2opt*'] },
    { key: 'ng2022',  label: 'Nucamendi-Guillen 2022', ops: ['relocate', 'swap11', '2opt'] },
    { key: 'zou2024', label: 'Zou 2024', ops: ['relocate', 'swap11', 'swap21', 'swap22', '2opt', '2opt*', 'swapstar'] },
  ];

  const S = {
    instances: [],
    llrp: null,          // methods.json: llrp_fast entry
    methods: [],         // methods.json: metaheuristics
    llrpOps: [],         // operators.json: llrp_ops
    metaOps: [],         // operators.json: meta_named
    presets: {},         // operators.json: presets
    inst: null,          // selected instance record
    algo: 'llrp_fast',
    fields: [],          // parameter inputs for the current algorithm
    budget: null,        // budget field (metaheuristics only)
    opChecks: [],       // llrp_fast operator checkboxes
    metaChecks: [],     // metaheuristic operator checkboxes
    worker: null,
    pending: null,
    running: false,
    cancelled: false,
    results: [],
    logs: [],
  };

  // ---------- small helpers ----------
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const k of Object.keys(attrs || {})) {
      const v = attrs[k];
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k in n) n[k] = v;
      else n.setAttribute(k, v);
    }
    for (const c of kids) if (c != null) n.append(c);
    return n;
  }
  function fmtSec(s) {
    if (!isFinite(s)) return '-';
    if (s < 60) return s.toFixed(1) + ' s';
    if (s < 3600) return (s / 60).toFixed(1) + ' min';
    return (s / 3600).toFixed(2) + ' h';
  }
  function intIn(v, lo, hi) {
    const x = Number(v);
    return (Number.isInteger(x) && x >= lo && x <= hi) ? x : null;
  }
  function numIn(v, lo, hi) {
    const x = Number(v);
    return (isFinite(x) && x >= lo && x <= hi) ? x : null;
  }
  function status(text, bad) {
    const s = $('status');
    s.textContent = text;
    s.classList.toggle('error', !!bad);
  }
  function parseCost(out) {
    const m = /^(?:final_cost|bestz)\s+(\S+)/m.exec(out);
    return m ? parseFloat(m[1]) : NaN;
  }
  function lastLine(out) {
    const lines = (out || '').trim().split('\n');
    const s = lines[lines.length - 1] || '';
    return s.length > 120 ? s.slice(0, 117) + '...' : s;
  }
  function methodById(id) {
    return S.methods.find((m) => m.id === id);
  }
  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- instance handling ----------
  function parseInstance(text) {
    const lines = text.split(/\r?\n/).map((s) => s.trim());
    if (!/^LLRP_INSTANCE\b/.test(lines[0] || '')) return { error: 'The first line must be "LLRP_INSTANCE 1".' };
    const head = {};
    let i = 1;
    for (; i < lines.length; i++) {
      const t = lines[i];
      if (!t) continue;
      if (t === 'depots') break;
      const sp = t.split(/\s+/);
      if (sp.length < 2) return { error: 'Malformed header line: "' + t + '".' };
      head[sp[0]] = sp.slice(1).join(' ');
    }
    if (i >= lines.length) return { error: 'Missing "depots" section.' };
    const n = parseInt(head.n, 10), m = parseInt(head.m, 10), Q = parseFloat(head.Q);
    if (!(n > 0) || !(m > 0) || !(Q > 0)) return { error: 'The header must give positive n, m and Q.' };
    let depots = 0, customers = 0, section = 'depots';
    const geoDep = [], geoCus = [];
    for (i = i + 1; i < lines.length; i++) {
      const t = lines[i];
      if (!t) continue;
      if (t === 'customers') { section = 'customers'; continue; }
      const v = t.split(/\s+/);
      const need = section === 'depots' ? 2 : 3;
      if (v.length < need || v.slice(0, need).some((x) => !isFinite(Number(x)))) {
        return { error: 'Bad ' + section + ' line: "' + t + '".' };
      }
      if (section === 'depots') { depots++; geoDep.push([Number(v[0]), Number(v[1])]); }
      else { customers++; geoCus.push([Number(v[0]), Number(v[1]), Number(v[2])]); }
    }
    if (depots !== m) return { error: 'Expected ' + m + ' depot lines, found ' + depots + '.' };
    if (customers !== n) return { error: 'Expected ' + n + ' customer lines, found ' + customers + '.' };
    const bks = parseFloat(head.bks);
    return {
      rec: {
        name: head.name || 'Uploaded instance', family: 'uploaded', n, m, Q,
        Nv: head.Nv ? Number(head.Nv) : undefined,
        Ng: head.Ng ? Number(head.Ng) : undefined,
        bks: isFinite(bks) ? bks : NaN, text,
        geo: { depots: geoDep, customers: geoCus },
      },
    };
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  function sv(tag, attrs, text) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k of Object.keys(attrs || {})) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  // Instance map in the style of the CLRP lab: customers as dots, candidate depots as squares.
  function drawInstMap(rec) {
    const box = $('inst-map');
    box.textContent = '';
    const geo = rec && rec.geo;
    if (!geo || !geo.customers.length) return;
    const W = 480, H = 300, P = 14;
    const pts = geo.customers.concat(geo.depots.map((d) => [d[0], d[1]]));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sc = Math.min((W - 2 * P) / ((x1 - x0) || 1), (H - 2 * P) / ((y1 - y0) || 1));
    const ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
    const X = (v) => ox + (v - x0) * sc, Y = (v) => H - oy - (v - y0) * sc;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', rec.n + ' customers and ' + rec.m + ' candidate depots');
    svg.append(sv('rect', { x: 0, y: 0, width: W, height: H, rx: 6, class: 'map-bg' }));
    geo.customers.forEach((c, i) => {
      const dot = sv('circle', { cx: X(c[0]).toFixed(1), cy: Y(c[1]).toFixed(1), r: rec.n > 120 ? 2.2 : 3, class: 'map-cust' });
      dot.append(sv('title', {}, 'customer ' + (i + 1) + ', demand ' + c[2]));
      svg.append(dot);
    });
    geo.depots.forEach((d, i) => {
      const sq = sv('rect', { x: (X(d[0]) - 5).toFixed(1), y: (Y(d[1]) - 5).toFixed(1), width: 10, height: 10, class: 'map-depot' });
      sq.append(sv('title', {}, 'candidate depot ' + (i + 1)));
      svg.append(sq);
    });
    box.append(svg);
  }

  // Routes of the best run, from the solver's routes file (name,algo,seed,route,depot,customers,arrivals,length,load,latency,distance).
  const ROUTE_PAL = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#7A5195', '#8C8C1F'];
  // Two formats: llrp_fast writes a CSV file; llrp_native prints one "rt_route" line per route.
  function parseRoutes(text, geo) {
    return (text || '').split(/\r?\n/).filter(Boolean).map((line) => {
      if (line.indexOf('rt_route ') === 0) {
        const t = line.split(/\s+/);
        const depot = Number(t[2]);
        const s = t.indexOf('seq'), l = t.indexOf('latency');
        const cust = t.slice(s + 1, l).map(Number);
        const load = geo ? cust.reduce((a, c) => a + geo.customers[c][2], 0) : NaN;
        return { rid: 0, depot, cust, n: cust.length, load, latency: Number(t[l + 1]), dist: NaN };
      }
      const f = line.split(',');
      if (f.length < 11) return null;
      return {
        rid: Number(f[3]), depot: Number(f[4]),
        cust: f[5].split('->').map((x) => Number(x.trim())),
        n: Number(f[7]), load: Number(f[8]), latency: Number(f[9]), dist: Number(f[10]),
      };
    }).filter(Boolean).map((r, i) => Object.assign(r, { rid: r.rid || i + 1 }));
  }

  function drawRouteMap(results) {
    const box = $('route-map');
    const tbl = $('route-table');
    box.textContent = '';
    tbl.textContent = '';
    const geo = S.inst && S.inst.geo;
    const ok = results.filter((r) => r.ok && isFinite(r.cost) && r.routes);
    if (!ok.length || !geo) {
      box.append(el('p', { class: 'muted', text: 'No routes were returned by the solver for this run.' }));
      return;
    }
    const best = ok.reduce((a, b) => (b.cost < a.cost ? b : a));
    const routes = parseRoutes(best.routes, geo);
    if (!routes.length) return;
    const W = 480, H = 300, P = 14;
    const pts = geo.customers.map((c) => [c[0], c[1]]).concat(geo.depots);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sc = Math.min((W - 2 * P) / ((x1 - x0) || 1), (H - 2 * P) / ((y1 - y0) || 1));
    const ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
    const X = (v) => ox + (v - x0) * sc, Y = (v) => H - oy - (v - y0) * sc;
    const color = {};
    routes.forEach((r) => { if (!(r.depot in color)) color[r.depot] = ROUTE_PAL[Object.keys(color).length % ROUTE_PAL.length]; });
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Routes of the best run, seed ' + best.seed);
    svg.append(sv('rect', { x: 0, y: 0, width: W, height: H, rx: 6, class: 'map-bg' }));
    for (const r of routes) {
      const d = geo.depots[r.depot];
      const path = [d].concat(r.cust.map((c) => geo.customers[c])).concat([d]);
      const p = sv('path', {
        d: path.map((q, i) => (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(''),
        fill: 'none', stroke: color[r.depot], 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'stroke-opacity': 0.9,
      });
      p.append(sv('title', {}, 'route ' + r.rid + ' from depot ' + (r.depot + 1) + ': ' + r.n + ' customers, load ' + r.load + ', latency ' + r.latency));
      svg.append(p);
    }
    geo.customers.forEach((c, i) => {
      const dot = sv('circle', { cx: X(c[0]).toFixed(1), cy: Y(c[1]).toFixed(1), r: geo.customers.length > 120 ? 2.2 : 3, class: 'map-cust' });
      dot.append(sv('title', {}, 'customer ' + (i + 1) + ', demand ' + c[2]));
      svg.append(dot);
    });
    geo.depots.forEach((d, i) => {
      const open = i in color;
      const sz = open ? 12 : 9;
      const sq = sv('rect', { x: (X(d[0]) - sz / 2).toFixed(1), y: (Y(d[1]) - sz / 2).toFixed(1), width: sz, height: sz,
        fill: open ? color[i] : 'none', stroke: open ? '#10252E' : '#7F9199', 'stroke-width': open ? 2 : 1.5,
        'stroke-dasharray': open ? '' : '3 2' });
      sq.append(sv('title', {}, 'depot ' + (i + 1) + (open ? ' (open)' : ' (closed)')));
      svg.append(sq);
      if (open) svg.append(sv('text', { x: (X(d[0]) + 9).toFixed(1), y: (Y(d[1]) - 8).toFixed(1), class: 'map-lbl' }, String(i + 1)));
    });
    box.append(svg, el('p', { class: 'muted', text: 'Seed ' + best.seed + ' (lowest cost of ' + ok.length + ' successful run(s)). Filled squares are open depots, dashed squares are closed candidates.' }));
    const head = el('tr', {}, ...['Route', 'Depot', 'Customers', 'Load', 'Latency', 'Length'].map((t) => el('th', { text: t })));
    const rows = routes.map((r) => el('tr', {},
      el('td', { text: String(r.rid) }), el('td', { text: String(r.depot + 1) }),
      el('td', { text: r.cust.map((c) => c + 1).join(' ') }), el('td', { text: String(r.load) }),
      el('td', { text: String(r.latency) }), el('td', { text: isFinite(r.dist) ? String(r.dist) : '-' })));
    const totalLat = routes.reduce((a, r) => a + r.latency, 0);
    tbl.append(el('div', { class: 'scroll' }, el('table', {}, el('thead', {}, head), el('tbody', {}, ...rows))),
      el('p', { class: 'muted', text: 'Sum of route latencies ' + totalLat.toFixed(2) + ' (solver cost ' + best.cost.toFixed(4) + '). Customer numbers are 1-based, as in the instance file.' }));
  }

  // Gap of each run to the best known solution; one dot per seed, median as a bar.
  function drawGapStrip(results) {
    const box = $('gap-strip');
    box.textContent = '';
    const g = results.filter((r) => r.ok && isFinite(r.gap)).map((r) => ({ seed: r.seed, v: r.gap }));
    if (g.length < 2) return;
    const W = 480, H = 80, L = 16, R = 16;
    const lo = Math.min(0, ...g.map((x) => x.v)), hi = Math.max(0.01, ...g.map((x) => x.v));
    const X = (v) => L + ((v - lo) / ((hi - lo) || 1)) * (W - L - R);
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Gap of each run to the best known solution');
    svg.append(sv('line', { x1: L, x2: W - R, y1: 46, y2: 46, class: 'map-axis' }));
    if (lo <= 0) svg.append(sv('line', { x1: X(0), x2: X(0), y1: 16, y2: 60, class: 'map-ref' }), sv('text', { x: X(0) + 4, y: 14, class: 'map-lbl' }, 'BKS'));
    g.forEach((p, i) => {
      const dot = sv('circle', { cx: X(p.v).toFixed(1), cy: 46 - ((i % 3) - 1) * 7, r: 4, class: 'map-dot' });
      dot.append(sv('title', {}, 'seed ' + p.seed + ': ' + p.v.toFixed(3) + ' %'));
      svg.append(dot);
    });
    const vals = g.map((x) => x.v).sort((a, b) => a - b);
    const med = vals.length % 2 ? vals[(vals.length - 1) / 2] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2;
    svg.append(sv('line', { x1: X(med), x2: X(med), y1: 30, y2: 62, class: 'map-med' }), sv('text', { x: X(med), y: 76, 'text-anchor': 'middle', class: 'map-lbl' }, 'median ' + med.toFixed(2) + ' %'));
    box.append(svg);
  }

  function renderFacts(rec) {
    const dl = $('inst-facts');
    dl.textContent = '';
    const items = [
      ['Name', rec.name], ['Family', rec.family], ['Customers (n)', rec.n], ['Depots (m)', rec.m],
      ['Capacity (Q)', rec.Q], ['Vehicles (Nv)', rec.Nv], ['Groups (Ng)', rec.Ng],
      ['Best known solution', isFinite(rec.bks) ? Number(rec.bks).toFixed(2) : 'not given'],
    ];
    for (const [k, v] of items) {
      if (v === undefined || v === null || v === '') continue;
      dl.append(el('dt', { text: k }), el('dd', { text: String(v) }));
    }
  }

  function selectInstanceRec(rec) {
    S.inst = rec;
    if (!rec.geo && rec.text) { const p = parseInstance(rec.text); if (p.rec) rec.geo = p.rec.geo; }
    renderFacts(rec);
    drawInstMap(rec);
    updateEstimate();
  }

  function fillInstances() {
    const sel = $('inst-select');
    sel.textContent = '';
    const groups = {};
    S.instances.forEach((r, idx) => {
      const fam = r.family.charAt(0).toUpperCase() + r.family.slice(1);
      if (!groups[fam]) {
        groups[fam] = el('optgroup', { label: fam });
        sel.append(groups[fam]);
      }
      groups[fam].append(el('option', { value: String(idx), text: r.name + '  (n=' + r.n + ', m=' + r.m + ')' }));
    });
  }

  // ---------- algorithm selection ----------
  function fillAlgorithms() {
    const sel = $('algo-select');
    sel.textContent = '';
    sel.append(el('optgroup', { label: 'Hybrid (C++ core)' },
      el('option', { value: 'llrp_fast', text: S.llrp.label })));
    const groups = {};
    for (const m of S.methods) {
      if (!groups[m.category]) {
        groups[m.category] = el('optgroup', { label: m.category });
        sel.append(groups[m.category]);
      }
      groups[m.category].append(el('option', { value: m.id, text: m.label }));
    }
  }

  function addNumField(box, spec) {
    const attrs = { type: 'number', step: spec.type === 'i' ? '1' : 'any', value: String(spec.default) };
    if (spec.min != null) attrs.min = String(spec.min);
    if (spec.max != null) attrs.max = String(spec.max);
    const input = el('input', attrs);
    box.append(el('label', { class: 'field' },
      el('span', { text: spec.label }), el('code', { text: spec.flag }), input));
    const f = { kind: 'num', flag: spec.flag, spec, input };
    S.fields.push(f);
    return f;
  }

  function addChoiceField(box, c) {
    const select = el('select', {});
    for (const v of c.values) select.append(el('option', { value: v, text: v, selected: v === c.default }));
    box.append(el('label', { class: 'field' },
      el('span', { text: c.label }), el('code', { text: c.flag }), select));
    S.fields.push({ kind: 'choice', flag: c.flag, input: select });
  }

  function buildParamsUI(m, isLLRP) {
    const box = $('algo-params');
    box.textContent = '';
    S.fields = [];
    S.budget = null;
    if (!isLLRP) {
      S.budget = addNumField(box, {
        flag: m.budget.flag, label: m.budget.label + ' (budget)', type: 'i',
        min: 1, max: null, default: Math.round(m.budget.default),
      });
    }
    if (isLLRP) for (const c of m.choices) addChoiceField(box, c);
    for (const p of m.params) addNumField(box, p);
    if (!isLLRP && !m.params.length) box.append(el('p', { class: 'muted', text: 'No tunable parameters; the budget is the only setting.' }));
    box.append(el('button', {
      type: 'button', class: 'btn ghost', text: 'Restore defaults',
      onclick: () => { buildParamsUI(m, isLLRP); updateEstimate(); },
    }));
  }

  function selectAlgo(id) {
    S.algo = id;
    $('algo-select').value = id;
    const isLLRP = id === 'llrp_fast';
    const m = isLLRP ? S.llrp : methodById(id);
    $('algo-desc').textContent = m.description;
    $('ls-llrp').hidden = !isLLRP;
    $('ls-meta').hidden = isLLRP;
    $('time-field').hidden = !isLLRP;
    buildParamsUI(m, isLLRP);
    updateEstimate();
  }

  // ---------- local search operators ----------
  function updateOpsCount() {
    const n = S.opChecks.filter((c) => c.input.checked).length;
    $('ops-count').textContent = n + ' of ' + S.opChecks.length + ' selected';
  }

  function fillLLRPOps() {
    const grid = $('ops-grid');
    grid.textContent = '';
    S.opChecks = S.llrpOps.map((op) => {
      const input = el('input', { type: 'checkbox', checked: true });
      grid.append(el('label', { class: 'op' }, input,
        el('span', { class: 'op-name', text: op.id }),
        el('span', { class: 'op-group', text: op.group }),
        el('small', { text: op.text })));
      return { id: op.id, input };
    });
    // Preset buttons, inserted before the count label
    const actions = document.querySelector('#ls-llrp .chips-actions');
    const countEl = $('ops-count');
    for (const p of LIT_PRESETS) {
      actions.insertBefore(el('button', { type: 'button', class: 'btn ghost', 'data-ops': p.key, title: 'Operators described in ' + p.label, text: p.label }), countEl);
    }
    grid.addEventListener('change', updateOpsCount);
    updateOpsCount();
  }

  function setLLRPOps(ids) {
    for (const c of S.opChecks) c.input.checked = ids.includes(c.id);
    updateOpsCount();
  }

  function fillMetaOps() {
    const grid = $('meta-ops');
    grid.textContent = '';
    S.metaChecks = S.metaOps.map((op) => {
      const input = el('input', { type: 'checkbox', checked: false });
      input.addEventListener('change', () => { $('preset-select').value = 'custom'; });
      grid.append(el('label', { class: 'op' }, input,
        el('span', { class: 'op-name', text: op.id }),
        el('small', { text: op.text })));
      return { id: op.id, input };
    });
  }

  function fillPresets() {
    const sel = $('preset-select');
    sel.textContent = '';
    for (const name of Object.keys(S.presets)) sel.append(el('option', { value: name, text: name }));
    sel.append(el('option', { value: 'custom', text: 'custom (checked operators)' }));
    sel.value = 'baseline_route';
    applyPreset('baseline_route');
  }

  function applyPreset(name) {
    if (name === 'custom') return;
    const list = S.presets[name] || [];
    for (const c of S.metaChecks) c.input.checked = list.includes(c.id);
  }

  // ---------- estimate ----------
  function updateEstimate() {
    if (!S.inst) return;
    const seeds = intIn($('seeds').value, 1, 20) || 1;
    let per, note;
    if (S.algo === 'llrp_fast') {
      per = Number($('time-limit').value);
      note = 'Time limited: each run stops at the limit, so the estimate is the limit itself.';
    } else {
      const m = methodById(S.algo);
      const n = S.inst.n;
      const base = m.time.t50 * Math.pow(n / 50, m.time.alpha);
      const b = S.budget ? Number(S.budget.input.value) : m.budget.default;
      per = base * (b / m.budget.default);
      note = 'Model: t50 * (n/50)^alpha * (budget / default budget). Other parameter changes are not modelled.';
    }
    const total = per * seeds;
    $('estimate').textContent = fmtSec(per) + ' per run, ' + fmtSec(total) + ' total';
    $('estimate-note').textContent = note + (total > 600 ? ' Long run: keep this tab open until it finishes.' : '') + ' Estimates are roughly +/- 50%.';
  }

  // ---------- run plan ----------
  function collectFields() {
    const args = [];
    for (const f of S.fields) {
      if (f.kind === 'choice') { args.push(f.flag, f.input.value); continue; }
      const s = f.spec;
      const raw = f.input.value.trim();
      const v = Number(raw);
      if (raw === '' || !isFinite(v)) return { error: s.label + ': enter a number.' };
      if (s.type === 'i' && !Number.isInteger(v)) return { error: s.label + ': must be an integer.' };
      if (s.min != null && v < s.min) return { error: s.label + ': must be at least ' + s.min + '.' };
      if (s.max != null && v > s.max) return { error: s.label + ': must be at most ' + s.max + '.' };
      args.push(f.flag, String(v));
    }
    return { args };
  }

  function buildPlan() {
    if (!S.inst) return { error: 'Choose an instance first.' };
    const seeds = intIn($('seeds').value, 1, 20);
    if (seeds === null) return { error: 'Number of seeds must be an integer from 1 to 20.' };
    const first = intIn($('first-seed').value, 0, 2147483647);
    if (first === null) return { error: 'First seed must be a non-negative integer.' };
    const fields = collectFields();
    if (fields.error) return { error: fields.error };
    const seedList = [];
    for (let i = 0; i < seeds; i++) seedList.push(first + i);

    if (S.algo === 'llrp_fast') {
      const ops = S.opChecks.filter((c) => c.input.checked).map((c) => c.id);
      if (!ops.length) return { error: 'Select at least one local search operator.' };
      const T = numIn($('time-limit').value, 1, 3600);
      if (T === null) return { error: 'Time limit must be between 1 and 3600 seconds.' };
      return {
        solver: 'llrp_fast', seeds: seedList,
        argsFor: (seed) => ['--ops', ops.join(','), '--time', String(T), '--seed', String(seed)].concat(fields.args),
      };
    }

    const names = S.metaChecks.filter((c) => c.input.checked).map((c) => c.id);
    const presetSel = $('preset-select').value;
    if (presetSel === 'custom' && !names.length) return { error: 'Select at least one local search operator.' };
    const preset = presetSel === 'custom' ? names.join(',') : presetSel;
    const descent = $('descent-select').value;
    return {
      solver: 'llrp_native', seeds: seedList,
      argsFor: (seed) => ['--algo', 'meta', '--meta', S.algo, '--method', descent, '--preset', preset, '--seed', String(seed)].concat(fields.args),
    };
  }

  // ---------- worker ----------
  function callWorker(solver, instanceText, args) {
    return new Promise((resolve) => {
      S.pending = resolve;
      const w = S.worker;
      w.onmessage = (e) => { S.pending = null; resolve(e.data); };
      w.onerror = (e) => {
        S.pending = null;
        resolve({ rc: -1, output: '[error] ' + (e.message || 'worker failed'), seconds: 0 });
      };
      w.postMessage({ id: Date.now(), solver, instanceText, args });
    });
  }

  function scoreReply(reply, seed) {
    const out = reply.output || '';
    const cost = parseCost(out);
    const feas = /^feasible\s+(\d)/m.exec(out);
    let st = 'ok';
    if (!isFinite(cost)) st = 'error: ' + lastLine(out);
    else if (feas && feas[1] === '0') st = 'infeasible';
    const bks = S.inst.bks;
    const gap = (isFinite(bks) && bks > 0 && isFinite(cost)) ? 100 * (cost - bks) / bks : NaN;
    const rtLines = out.split(/\r?\n/).filter((x) => x.indexOf('rt_route ') === 0).join('\n');
    return { seed, cost, gap, wall: reply.seconds || 0, status: st, ok: st === 'ok', routes: reply.routes || rtLines };
  }

  function renderResults() {
    const tb = $('results');
    tb.textContent = '';
    drawGapStrip(S.results);
    if (!S.results.length) {
      tb.append(el('tr', {}, el('td', { colspan: '5', class: 'muted', text: 'No runs yet.' })));
      return;
    }
    for (const r of S.results) {
      tb.append(el('tr', {},
        el('td', { text: String(r.seed) }),
        el('td', { text: isFinite(r.cost) ? r.cost.toFixed(4) : '-' }),
        el('td', { text: isFinite(r.gap) ? r.gap.toFixed(3) + ' %' : '-' }),
        el('td', { text: r.wall.toFixed(2) + ' s' }),
        el('td', { text: r.status, class: r.ok ? '' : 'bad' })));
    }
  }

  function summary() {
    const ok = S.results.filter((r) => r.ok && isFinite(r.cost));
    if (!ok.length) return '';
    const costs = ok.map((r) => r.cost);
    const best = Math.min(...costs);
    const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
    const sd = costs.length > 1 ? Math.sqrt(costs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (costs.length - 1)) : 0;
    let s = 'Best ' + best.toFixed(4);
    if (isFinite(S.inst.bks)) s += ' (gap ' + (100 * (best - S.inst.bks) / S.inst.bks).toFixed(3) + ' %)';
    s += ', mean ' + mean.toFixed(4) + ' +/- ' + sd.toFixed(4) + ' over ' + ok.length + ' run(s).';
    return s;
  }

  function setBusy(busy) {
    $('run-btn').disabled = busy;
    $('cancel-btn').disabled = !busy;
  }

  function setProgress(done, total) {
    $('bar').style.width = (total ? (100 * done / total) : 0) + '%';
  }

  async function run() {
    if (S.running) return;
    const plan = buildPlan();
    if (plan.error) { status(plan.error, true); return; }
    S.running = true;
    S.cancelled = false;
    S.results = [];
    const instLine = '# LLRP web solver log\n# instance: ' + S.inst.name + ' (n=' + S.inst.n + ', m=' + S.inst.m +
      ', BKS=' + (isFinite(S.inst.bks) ? S.inst.bks : 'not given') + ')\n# solver: ' + plan.solver +
      '\n# algorithm: ' + (S.algo === 'llrp_fast' ? 'llrp_fast' : S.algo) + '\n';
    S.logs = [instLine];
    setBusy(true);
    renderResults();
    $('log').hidden = true;
    setProgress(0, plan.seeds.length);
    S.worker = new Worker('worker.js');

    const total = plan.seeds.length;
    for (let k = 0; k < total; k++) {
      if (S.cancelled) break;
      const seed = plan.seeds[k];
      let args = plan.argsFor(seed);
      if (plan.solver === 'llrp_fast') args = args.concat(['--out', '/r', '--out-level', '1']);
      status('Running seed ' + seed + ' (' + (k + 1) + ' of ' + total + ')...');
      const reply = await callWorker(plan.solver, S.inst.text, args);
      if (S.cancelled) break;
      const rec = scoreReply(reply, seed);
      S.results.push(rec);
      S.logs.push('=== seed ' + seed + ' ===\n$ ' + plan.solver + ' --instance <instance> ' + args.join(' ') + '\n' + (reply.output || '') + '\n');
      renderResults();
      setProgress(k + 1, total);
    }

    if (S.worker) S.worker.terminate();
    S.worker = null;
    S.pending = null;
    S.running = false;
    setBusy(false);
    if (S.cancelled) {
      status('Cancelled after ' + S.results.length + ' run(s). ' + summary(), false);
    } else {
      status('Finished: ' + S.results.length + ' run(s). ' + summary(), false);
    }
    drawRouteMap(S.results);
    const has = S.results.length > 0;
    $('csv-btn').disabled = !has;
    $('log-btn').disabled = !has;
    const logEl = $('log');
    logEl.textContent = S.logs.join('\n');
    logEl.hidden = !has;
  }

  function cancel() {
    if (!S.running) return;
    S.cancelled = true;
    if (S.worker) { S.worker.terminate(); S.worker = null; }
    if (S.pending) {
      const r = S.pending;
      S.pending = null;
      r({ rc: -1, output: '[cancelled]', seconds: 0 });
    }
    status('Cancelling...');
  }

  function exportCSV() {
    const inst = S.inst.name;
    const head = 'instance,algorithm,seed,cost,gap_percent,wall_seconds,status';
    const rows = S.results.map((r) => [
      inst, S.algo, r.seed,
      isFinite(r.cost) ? r.cost : '',
      isFinite(r.gap) ? r.gap.toFixed(6) : '',
      r.wall.toFixed(3),
      '"' + r.status.replace(/"/g, '""') + '"',
    ].join(','));
    download('llrp_results_' + inst.replace(/[^A-Za-z0-9_-]+/g, '_') + '.csv', [head].concat(rows).join('\n') + '\n', 'text/csv');
  }

  // ---------- events ----------
  function bindEvents() {
    $('inst-select').addEventListener('change', (e) => {
      $('inst-file').value = '';
      setMsg('');
      selectInstanceRec(S.instances[Number(e.target.value)]);
    });

    $('inst-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > MAX_UPLOAD_BYTES) { setMsg('File is larger than 5 MB.', true); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const r = parseInstance(String(reader.result));
        if (r.error) { setMsg(r.error, true); return; }
        const rec = Object.assign({ file: file.name }, r.rec);
        selectInstanceRec(rec);
        setMsg('Loaded ' + file.name + ': ' + rec.n + ' customers, ' + rec.m + ' depots.', false);
      };
      reader.onerror = () => setMsg('Could not read the file.', true);
      reader.readAsText(file);
    });

    $('algo-select').addEventListener('change', (e) => selectAlgo(e.target.value));

    $('ls-llrp').addEventListener('click', (e) => {
      const key = e.target && e.target.getAttribute && e.target.getAttribute('data-ops');
      if (!key) return;
      if (key === 'all') setLLRPOps(S.opChecks.map((c) => c.id));
      else if (key === 'none') setLLRPOps([]);
      else {
        const p = LIT_PRESETS.find((x) => x.key === key);
        if (p) setLLRPOps(p.ops);
      }
    });

    $('preset-select').addEventListener('change', (e) => applyPreset(e.target.value));

    $('run-btn').addEventListener('click', run);
    $('cancel-btn').addEventListener('click', cancel);
    $('csv-btn').addEventListener('click', exportCSV);
    $('log-btn').addEventListener('click', () => download('llrp_solver_log.txt', S.logs.join('\n'), 'text/plain'));

    document.addEventListener('input', updateEstimate);
    document.addEventListener('change', updateEstimate);
  }

  function setMsg(text, bad) {
    const m = $('inst-msg');
    m.textContent = text;
    m.classList.toggle('error', !!bad);
  }

  // ---------- init ----------
  async function loadJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(path + ' (HTTP ' + r.status + ')');
    return r.json();
  }

  async function init() {
    try {
      const [inst, methods, ops] = await Promise.all([
        loadJSON('data/instances.json'), loadJSON('data/methods.json'), loadJSON('data/operators.json'),
      ]);
      S.instances = inst;
      S.llrp = methods.llrp_fast;
      S.methods = methods.methods;
      S.llrpOps = ops.llrp_ops;
      S.metaOps = ops.meta_named;
      S.presets = ops.presets;
    } catch (e) {
      status('Could not load the data files: ' + e.message + '. Open this page through a web server, not from a local file.', true);
      return;
    }
    fillInstances();
    fillAlgorithms();
    fillLLRPOps();
    fillMetaOps();
    fillPresets();
    bindEvents();
    $('inst-select').value = '0';
    selectInstanceRec(S.instances[0]);
    selectAlgo('llrp_fast');
    status('Ready.');
  }

  init();
})();
