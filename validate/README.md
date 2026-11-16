# Held-out validation (llrp_fast tuned configurations vs native metaheuristics)

- `select_instances.py` -> `selected.json`: 12 held-out instances, stratified random (seed 20261116), disjoint from the 12 irace training instances.
- `configs.json`: llrp_fast configurations (5 irace elites 128/129/126/127/101, cfg2 = previous irace best, cfg1 = web-app default parameters; all with the 14 operators and `--so`) and native ILS/VNS/BRKGA (`--method first --preset llrp5`, default parameters, untuned).
- `driver.py`: one instance per job; 10 seeds (1001..1010); runs in random order, 4 parallel runs. llrp_fast gets `--time cap` (5/15/30/45/75 s by n, same as tuning); native methods have no working `--time`, so their iteration budget is calibrated (seed 0, <=5 rounds, +-10 %) to cap*1.03 and the realised time is recorded per run.
- Workflow `.github/workflows/validate.yml`: matrix over instances; results are committed to branch `validation-results` under `run-<run_id>/` (`all_runs.jsonl`, `all_calib.jsonl`, `env_*.txt` with lscpu, `manifest.txt`).
