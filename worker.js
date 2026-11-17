// Runs one solver command in a fresh WebAssembly instance (no state is shared between runs).
// The solver modules are the same C++ code as bin/llrp_fast and bin/llrp_native, compiled with Emscripten.
importScripts('wasm/llrp_fast.js', 'wasm/llrp_native.js');

const wasmCache = {};
async function wasmBytes(name) {
  if (!wasmCache[name]) {
    wasmCache[name] = fetch('wasm/' + name + '.wasm').then(r => {
      if (!r.ok) throw new Error('could not load ' + name + '.wasm (HTTP ' + r.status + ')');
      return r.arrayBuffer();
    });
  }
  return wasmCache[name];
}

self.onmessage = async (e) => {
  const { id, solver, instanceText, args } = e.data;
  const factory = solver === 'llrp_fast' ? self.Solver_fast : self.Solver_native;
  const out = [];
  const t0 = performance.now();
  let rc = -1;
  let routes = '';
  try {
    const wasmBinary = await wasmBytes(solver);
    const M = await factory({
      noInitialRun: true, wasmBinary,
      print: (s) => out.push(s),
      printErr: (s) => out.push('[stderr] ' + s),
    });
    M.FS.writeFile('/instance.inst', instanceText);
    const line = ['--instance', '/instance.inst'].concat(args).join(' ');
    rc = M.ccall('run_cli', 'number', ['string'], [line]);
    // --out /r writes /r.routes.csv into the in-memory file system of this run (llrp_fast only)
    try { routes = M.FS.readFile('/r.routes.csv', { encoding: 'utf8' }); } catch (_) { routes = ''; }
  } catch (err) {
    out.push('[error] ' + (err && err.message ? err.message : String(err)));
  }
  self.postMessage({ id, rc, output: out.join('\n'), routes, seconds: (performance.now() - t0) / 1000 });
};
