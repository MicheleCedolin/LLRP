# irace tuning of llrp_fast (WebAssembly build)

Tunes the 11 parameters of `llrp_fast` (GRASP + RVND + ILS + strategic oscillation; 14 operators, SO and ILS always on).
Cost of one run = 100 * (final_cost - BKS) / BKS (BKS = RLHEA records stored in `web/data/instances.json`); infeasible = 1000.

- `irace/parameters.txt`  11 parameters, ranges = web app ranges
- `irace/configurations.txt`  two initial configurations (web default, previous irace best)
- `irace/instances_train.txt`  12 training instances (stratified split of 2026-11-09); the other 64 are held out
- `irace/runner.js` + `target-runner`  one run in Node/WASM; per-run time cap by size: n<=30 5 s, <=60 15 s, <=120 30 s, <=160 45 s, <=250 75 s (x LLRP_TIME_SCALE)
- `irace/run_irace.sh`  runs irace (needs R + irace 4.5.1) then `report.R` (best configurations -> best_configurations.csv)
- `.github/workflows/irace.yml`  GitHub Actions job (4 vCPU runner): installs R and irace from github.com/cran/*, runs 1000 experiments.

Local run: put the gh-pages build in `web/` (or set LLRP_WEB=<dir with wasm/ and data/>), then `cd irace && ./run_irace.sh --max-experiments 1000 --parallel 4`.
irace needs at least 300 experiments for this parameter space. Estimated cost: mean cap 40 s -> 1000 experiments = 11.2 core-hours (2.8 h on 4 cores).
Runs are wall-clock capped, so results are not bit-reproducible; the irace seed and logs (`irace.Rdata`) are kept.
