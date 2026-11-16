#!/usr/bin/env python3
"""Stratified selection of 12 held-out validation instances (reproducible).
Held-out = all 76 web-app instances minus the 12 irace training instances.
Strata (family, n-bucket) with fixed allocation; random.Random(SEED) picks within strata."""
import json, random, sys
SEED = 20261116
WEB = sys.argv[1] if len(sys.argv) > 1 else '../web'
TRAIN = ['20-5-2-5','50-5-2-5','Ch75-10','100-10-1-10','100-5-1b-5','P112122-20','P112212-10',
         'P131112-10','P131212-10','200-10-3-10','P121122-20','P122222-20']
inst = json.load(open(f'{WEB}/data/instances.json'))
held = [x for x in inst if x['name'] not in TRAIN]
def stratum(x):
    f, n = x['family'], x['n']
    if f == 'barreto': return ('barreto', 'small' if n <= 60 else 'large')
    if f == 'prins':   return ('prins', 'n<=60' if n <= 60 else 'n=100' if n <= 100 else 'n=200')
    return ('tuzun', f'n={n}')
ALLOC = {('tuzun','n=100'):2, ('tuzun','n=150'):2, ('tuzun','n=200'):2,
         ('prins','n<=60'):1, ('prins','n=100'):2, ('prins','n=200'):1,
         ('barreto','small'):1, ('barreto','large'):1}
rng = random.Random(SEED)
sel = []
for k in sorted(ALLOC):
    pool = sorted([x['name'] for x in held if stratum(x) == k])
    sel += rng.sample(pool, ALLOC[k])
out = [{'name': x['name'], 'family': x['family'], 'n': x['n'], 'm': x['m'], 'bks': x['bks']}
       for x in inst if x['name'] in sel]
json.dump({'seed': SEED, 'train': TRAIN, 'selected': out}, open('selected.json', 'w'), indent=1)
print(json.dumps([o['name'] for o in out]))
for o in out: print(o)
