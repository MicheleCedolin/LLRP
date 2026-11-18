// Pre-renders the LaTeX in learn.html with KaTeX (no runtime JS needed; CSS and fonts are in vendor/katex).
// usage: npm i katex@0.16.11 (anywhere), then: NODE_PATH=<node_modules> node tools/render_math.js
// Fills every <!--tex:ID--> ... <!--/tex:ID--> block in learn.html from the BLOCKS table below.
const fs = require('fs'), path = require('path');
const katex = require('katex');
const M = t => katex.renderToString(t, { throwOnError: true, displayMode: false });
const D = t => katex.renderToString(t, { throwOnError: true, displayMode: true });

const BLOCKS = {
  objective: () => `<div class="math-box">${D(String.raw`\min\;\sum_{j\in J} T_j`)}</div>`,
  objnote: () => `where ${M('T_j')} is the arrival time of customer ${M('j')}, measured from the start of its depot's route.`,
  notation: () => `
    <dl class="notation">
      <div><dt>${M('I')}</dt><dd>candidate depots</dd></div>
      <div><dt>${M('J')}</dt><dd>customers; ${M('V=I\\cup J')}</dd></div>
      <div><dt>${M('c_{uv}')}</dt><dd>travel time between nodes ${M('u,v\\in V')}</dd></div>
      <div><dt>${M('q_j')}</dt><dd>demand of customer ${M('j\\in J')}</dd></div>
      <div><dt>${M('Q')}</dt><dd>vehicle capacity</dd></div>
      <div><dt>${M('p')}</dt><dd>maximum number of open depots</dd></div>
      <div><dt>${M('N_v')}</dt><dd>fleet size (maximum number of routes)</dd></div>
    </dl>
    <p><strong>Routes and arrival times.</strong> A solution is a set ${M('R')} of routes. A route is ${M('r=(d_r,\\,j^r_1,\\dots,j^r_{k_r})')} with depot ${M('d_r\\in I')}, customers ${M('j^r_s\\in J')} and ${M('k_r\\ge 1')}. Writing ${M('j^r_0:=d_r')}, the arrival time of the ${M('s')}-th customer is the sum of the arcs travelled so far; the arc back to the depot is not included.</p>
    <div class="math-box">${D(String.raw`T_{j^r_s}\;=\;\sum_{u=1}^{s} c_{\,j^r_{u-1}\,j^r_u}`)}</div>
    <p><strong>Model.</strong> With ${M('J_r=\\{j^r_1,\\dots,j^r_{k_r}\\}')}:</p>
    <div class="math-box">${D(String.raw`\min\;\sum_{r\in R}\sum_{s=1}^{k_r} T_{j^r_s}\;=\;\sum_{r\in R}\sum_{s=1}^{k_r}(k_r-s+1)\,c_{\,j^r_{s-1}\,j^r_s}`)}${D(String.raw`\begin{aligned}
      &\{J_r\}_{r\in R}\ \text{is a partition of } J && \text{(each customer is visited once)}\\
      &\textstyle\sum_{j\in J_r} q_j \le Q \quad \forall\, r\in R && \text{(vehicle capacity)}\\
      &\bigl|\{d_r : r\in R\}\bigr| \le p && \text{(open depots)}\\
      &|R| \le N_v && \text{(fleet size)}
    \end{aligned}`)}</div>
    <p class="muted">The factor ${M('k_r-s+1')} counts the customers whose arrival time includes the arc into position ${M('s')}. Both ${M('p')} and ${M('N_v')} are upper bounds. Because travel times satisfy the triangle inequality and the return leg is free, splitting a route never increases latency, so an optimal solution uses ${M('\\min\\{N_v,\\,|J|\\}')} routes (Osorio-Mora et al., 2023).</p>`,
  milp: () => `
    <p>A compact arc-based mixed-integer model is given below (network-flow idea of Moshref-Javadi and Lee, 2016, with one set of arc variables, no vehicle index and an explicit fleet bound). Arrival times and loads are propagated along the chosen arcs with big-M constraints.</p>
    <dl class="notation">
      <div><dt>${M('x_{uv}')}</dt><dd>${M('1')} if customer ${M('v\\in J')} is visited right after node ${M('u\\in V')} (a depot if ${M('u\\in I')}), else ${M('0')}</dd></div>
      <div><dt>${M('y_i')}</dt><dd>${M('1')} if depot ${M('i\\in I')} is open, else ${M('0')}</dd></div>
      <div><dt>${M('t_j')}</dt><dd>arrival time at customer ${M('j')}, ${M('t_j\\ge 0')}</dd></div>
      <div><dt>${M('l_j')}</dt><dd>load carried up to and including ${M('j')}, ${M('q_j\\le l_j\\le Q')}</dd></div>
    </dl>
    <div class="math-box">${D(String.raw`\begin{aligned}
      \min\;& \sum_{j\in J} t_j \\[4pt]
      \text{s.t.}\;& \sum_{u\in V\setminus\{j\}} x_{uj} = 1 && \forall j\in J && (1)\\
      & \sum_{k\in J\setminus\{j\}} x_{jk} \le 1 && \forall j\in J && (2)\\
      & x_{ij} \le y_i && \forall i\in I,\ j\in J && (3)\\
      & \sum_{i\in I} y_i \le p && && (4)\\
      & \sum_{i\in I}\sum_{j\in J} x_{ij} \le N_v && && (5)\\
      & t_j \ge c_{ij} - M\,(1-x_{ij}) && \forall i\in I,\ j\in J && (6)\\
      & t_k \ge t_j + c_{jk} - M\,(1-x_{jk}) && \forall j,k\in J,\ j\ne k && (7)\\
      & l_k \ge l_j + q_k - Q\,(1-x_{jk}) && \forall j,k\in J,\ j\ne k && (8)
    \end{aligned}`)}</div>
    <p class="muted">(1) each customer has exactly one predecessor; (2) at most one successor, and there is no arc back to a depot, so routes are open; (3)&ndash;(5) open depots and fleet size; (6)&ndash;(7) arrival times, which also exclude cycles among customers; (8) vehicle capacity. A valid big-M is ${M('M=\\sum_{j\\in J}\\max_{u\\in V\\setminus\\{j\\}} c_{uj}')}. At an optimum ${M('t_j')} equals the arrival time of ${M('j')}, because the objective pushes every ${M('t_j')} down to its lower bound.</p>`,
};

const file = path.join(__dirname, '..', 'learn.html');
let html = fs.readFileSync(file, 'utf8');
for (const [id, fn] of Object.entries(BLOCKS)) {
  const re = new RegExp(`(<!--tex:${id}-->)[\\s\\S]*?(<!--/tex:${id}-->)`);
  if (!re.test(html)) throw new Error('missing marker ' + id);
  html = html.replace(re, (_, a, b) => `${a}${fn()}${b}`);
}
fs.writeFileSync(file, html);
console.log('rendered', Object.keys(BLOCKS).join(', '));
