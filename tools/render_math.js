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
