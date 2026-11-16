// One solver run in a fresh WebAssembly instance.
// usage: LLRP_WEB=<dir with wasm/ and data/> node run_task.js <fast|native> <instance_name> <solver args...>
// prints one JSON line: {rc, cost, feasible, sec}
const fs = require('fs'), path = require('path');
const WEB = (process.env.LLRP_WEB || path.join(__dirname, '..', 'web')).replace(/\/?$/, '/');
const [solver, name, ...args] = process.argv.slice(2);
const inst = JSON.parse(fs.readFileSync(WEB + 'data/instances.json', 'utf8')).find(x => x.name === name);
if (!inst) { console.error('unknown instance ' + name); process.exit(2); }
const factory = require(WEB + 'wasm/llrp_' + solver + '.js');
(async () => {
  const out = [];
  const t0 = Date.now();
  const M = await factory({ noInitialRun: true, print: s => out.push(s), printErr: s => out.push('[stderr] ' + s),
    wasmBinary: fs.readFileSync(WEB + 'wasm/llrp_' + solver + '.wasm') });
  M.FS.writeFile('/instance.inst', inst.text);
  const rc = M.ccall('run_cli', 'number', ['string'], [['--instance', '/instance.inst'].concat(args).join(' ')]);
  const txt = out.join('\n');
  const c = /^(?:final_cost|bestz)\s+(\S+)/m.exec(txt), f = /^feasible\s+(\d)/m.exec(txt);
  const stop = /^stop\s+(\S+)/m.exec(txt);
  console.log(JSON.stringify({ rc, cost: c ? parseFloat(c[1]) : null, feasible: f ? Number(f[1]) : (c ? 1 : 0),
    stop: stop ? stop[1] : null, sec: (Date.now() - t0) / 1000 }));
})();
