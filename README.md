# LLRP Solver

Latency location-routing heuristics that run in your browser.

**Open the app: https://michelecedolin.github.io/LLRP/** &nbsp;·&nbsp; [Learn page](https://michelecedolin.github.io/LLRP/learn.html)

The latency location-routing problem (LLRP) asks which depots to open (at most *p*) and how to route vehicles from them to customers so that the **sum of customer arrival times** is as small as possible. Routes are open: a vehicle does not return to its depot.

The solvers are written in C++ and compiled to WebAssembly, so everything runs locally in your browser. Nothing is installed and no instance data is sent to a server; the live page only reports two anonymous counts (page opened, run started) to GoatCounter.

## What you can do

- Choose one of 76 built-in benchmark instances (Tuzun-Burke, Prodhon, Barreto) with their best known solutions, or upload your own `.inst` file. The app explains the file format and offers a template.
- Pick one of 19 metaheuristics and the local-search operators, set seeds and a time limit, and see the gap to the best known solution, the routes and the convergence.
- Read the Learn page for the problem definition, the mathematical model, the operators and the literature.

## Branches

| Branch | Content |
|---|---|
| `main` | this README |
| `gh-pages` | the published site: HTML, JavaScript, CSS, WebAssembly and benchmark data |

## Related repository

Research code (C++ engine, experiments, paper material): https://github.com/MicheleCedolin/Latency-Location-Routing-Problem

## How to cite

If you use the app in your work, please cite this repository together with the papers listed on the Learn page (section 6):

> Cedolin, M. (2026). *LLRP Solver: latency location-routing heuristics in the browser* [Web application]. https://github.com/MicheleCedolin/LLRP
