# LLRP Solver (web)

Browser front end for the latency location-routing (LLRP) heuristics. The solvers run in
WebAssembly; nothing is installed and no data leaves the browser.

## Deploy on GitHub Pages
1. Create a repository (for example `llrp-solver`) and upload the contents of this folder to its root.
2. Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Open `https://<user>.github.io/llrp-solver/` after the build finishes.

The page loads its data and WebAssembly files with relative paths, so it works from a sub-path.
It must be served over HTTP(S); opening `index.html` from disk will not load the data.

## Contents
- `index.html`, `style.css`, `app.js`: user interface (English).
- `worker.js`: runs one solver job per fresh WebAssembly instance.
- `wasm/`: `llrp_fast` (GRASP-RVND-ILS-SO) and `llrp_native` (19 metaheuristics), built with Emscripten.
- `data/`: 76 benchmark instances with best known solutions, method parameter ranges and operator lists.

## Notes
- Costs are total latency. Gap to BKS = 100 (cost - BKS) / BKS.
- Time estimates are indicative (roughly +/- 50%).
- The web build reproduces the native command-line results for the same seed on the tested cases.

## Third-party components and data
- `vendor/katex/`: KaTeX stylesheet and fonts (MIT; licence in `vendor/katex/LICENSE`).
- `wasm/`: built with Emscripten; see `THIRD_PARTY_NOTICES.md`.
- `data/`: benchmark instances by other researchers; sources are listed in section 6.3 of the Learn page.

## License
MIT License (file `LICENSE`) for the original code and text of this site. The benchmark data and third-party components are not covered by it.
