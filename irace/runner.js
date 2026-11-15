// irace target runner for the llrp_fast WebAssembly build (same C++ code as bin/llrp_fast).
// Prints "<cost> <seconds>" where cost = 100*(final_cost-BKS)/BKS (infeasible -> 1000).
const fs=require('fs'), path=require('path');
const WEB=process.env.LLRP_WEB || path.join(__dirname,'..','web')+'/';
const a=process.argv.slice(2);
const [idc,idi,seed,name]=a; let rest=a.slice(4);
if(rest.length && !rest[0].startsWith('--') && !isNaN(Number(rest[0]))) rest=rest.slice(1); // optional bound
const SCALE=Number(process.env.LLRP_TIME_SCALE||1);
const inst=JSON.parse(fs.readFileSync(WEB+'data/instances.json','utf8')).find(x=>x.name===name);
if(!inst){console.error('unknown instance '+name);process.exit(2);}
const n=inst.n; const base= n<=30?5 : n<=60?15 : n<=120?30 : n<=160?45 : 75; // per-run time cap (s), wasm
const T=Math.max(0.5,Math.round(base*SCALE*10)/10);
const FULL='relocate,oropt2,oropt3,swap11,swap21,swap22,swap31,swap32,2opt,2opt*,swapstar,dexch,rdepot,ds';
const factory=require(WEB+'wasm/llrp_fast.js');
(async()=>{
  const out=[];
  const M=await factory({noInitialRun:true,print:s=>out.push(s),printErr:s=>out.push('[stderr] '+s),
    wasmBinary:fs.readFileSync(WEB+'wasm/llrp_fast.wasm')});
  M.FS.writeFile('/instance.inst',inst.text);
  const line=['--instance','/instance.inst','--ops',FULL,'--so','--time',String(T),'--seed',String(seed)].concat(rest).join(' ');
  const t0=Date.now();
  M.ccall('run_cli','number',['string'],[line]);
  const txt=out.join('\n');
  const c=/^final_cost\s+(\S+)/m.exec(txt), f=/^feasible\s+(\d)/m.exec(txt);
  let cost=1000;
  if(c && f && f[1]==='1') cost=100*(parseFloat(c[1])-inst.bks)/inst.bks;
  console.log(cost.toFixed(6)+' '+((Date.now()-t0)/1000).toFixed(2));
})();
