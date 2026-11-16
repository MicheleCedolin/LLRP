#!/usr/bin/env python3
"""Held-out validation for one instance: llrp_fast configs + native ILS/VNS/BRKGA at equal wall-clock budget.
Usage: python3 driver.py --web web --instance NAME --out out [--seeds 10] [--seed0 1001] [--parallel 4] [--scale 1]
Native metaheuristics have no working --time, so their iteration budget is calibrated (seed 0) to the target
wall time (cap*1.03); realised times are recorded per run."""
import argparse, json, os, random, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
FULL = 'relocate,oropt2,oropt3,swap11,swap21,swap22,swap31,swap32,2opt,2opt*,swapstar,dexch,rdepot,ds'
def cap_for(n):  # same per-run caps (s) as the irace tuning runner
    return 5 if n <= 30 else 15 if n <= 60 else 30 if n <= 120 else 45 if n <= 160 else 75

ap = argparse.ArgumentParser()
ap.add_argument('--web', default='web'); ap.add_argument('--instance', required=True)
ap.add_argument('--out', default='out'); ap.add_argument('--seeds', type=int, default=10)
ap.add_argument('--seed0', type=int, default=1001); ap.add_argument('--parallel', type=int, default=4)
ap.add_argument('--scale', type=float, default=1.0); ap.add_argument('--no-native', action='store_true')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
env = dict(os.environ, LLRP_WEB=os.path.abspath(a.web))
inst = next(x for x in json.load(open(os.path.join(a.web, 'data/instances.json'))) if x['name'] == a.instance)
n, bks = inst['n'], inst['bks']
cap = max(0.5, round(cap_for(n) * a.scale, 1))
target = cap * 1.03
cfg = json.load(open(os.path.join(HERE, 'configs.json')))
mjson = {m['id']: m for m in json.load(open(os.path.join(a.web, 'data/methods.json')))['methods']}
lock = threading.Lock()
runs_f = open(os.path.join(a.out, f'runs_{a.instance}.jsonl'), 'a')
cal_f = open(os.path.join(a.out, f'calib_{a.instance}.jsonl'), 'a')
def emit(f, rec):
    with lock:
        f.write(json.dumps(rec) + '\n'); f.flush()

def run(solver, args):
    p = subprocess.run(['node', os.path.join(HERE, 'run_task.js'), solver, a.instance] + args,
                       capture_output=True, text=True, env=env, timeout=3600)
    try:
        return json.loads(p.stdout.strip().splitlines()[-1])
    except Exception:
        return {'rc': -1, 'cost': None, 'feasible': 0, 'stop': None, 'sec': None, 'err': (p.stdout + p.stderr)[-300:]}

def native_args(meth, budget, seed):
    return ['--algo', 'meta', '--meta', meth, '--method', 'first', '--preset', 'llrp5', '--seed', str(seed),
            cfg['native'][meth]['flag'], str(int(budget))]

def calibrate(meth):
    m = mjson[meth]; base = m['time']['t50'] * (n / 50.0) ** m['time']['alpha']
    b = max(1.0, m['budget']['default'] * target / max(base, 1e-6))
    best = None
    for it in range(5):
        r = run('native', native_args(meth, b, 0)); t = r.get('sec') or 0.0
        emit(cal_f, {'instance': a.instance, 'method': meth, 'iter': it, 'budget': int(b), 'sec': t, 'target': target, 'cost': r.get('cost')})
        if t > 0 and (best is None or abs(t / target - 1) < abs(best[1] / target - 1)): best = (int(b), t)
        if t > 0 and abs(t / target - 1) < 0.10: break
        f = min(10.0, max(0.1, target / max(t, 1e-3)))
        b = max(1.0, b * f)
    return best[0] if best else int(b)

methods = [] if a.no_native else ['ils', 'vns', 'brkga']
budgets = {}
if methods:
    with ThreadPoolExecutor(len(methods)) as ex:
        for meth, bud in zip(methods, ex.map(calibrate, methods)): budgets[meth] = bud
print(f'{a.instance} n={n} cap={cap}s native target={target:.1f}s budgets={budgets}', flush=True)

seeds = [a.seed0 + i for i in range(a.seeds)]
tasks = []
for s in seeds:
    for label in cfg['fast']:
        tasks.append(('fast', label, s, ['--ops', FULL, '--so', '--time', str(cap), '--seed', str(s)] + cfg['fast'][label].split(), None))
    for meth in methods:
        tasks.append(('native', meth, s, native_args(meth, budgets[meth], s), budgets[meth]))
random.Random(a.seed0 * 7919 + n).shuffle(tasks)   # random order: no config systematically runs last

def work(t):
    solver, label, s, args, budget = t
    r = run(solver, args)
    cost = r.get('cost')
    ok = cost is not None and r.get('feasible') == 1
    emit(runs_f, {'instance': a.instance, 'n': n, 'bks': bks, 'label': label, 'solver': solver, 'seed': s,
                  'cost': cost, 'gap': (100.0 * (cost - bks) / bks) if ok else None, 'feasible': r.get('feasible'),
                  'sec': r.get('sec'), 'cap': cap, 'budget': budget, 'stop': r.get('stop'), 'rc': r.get('rc')})
t0 = time.time()
with ThreadPoolExecutor(a.parallel) as ex: list(ex.map(work, tasks))
print(f'{a.instance}: {len(tasks)} runs in {time.time() - t0:.0f}s', flush=True)
