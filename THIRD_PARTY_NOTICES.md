# Third-party notices

The published site (branch `gh-pages`) bundles or loads the following third-party components. Their licences apply to them, not to the original code and text of this project.

## KaTeX 0.16.11 (MIT)

Mathematics on the Learn page is typeset with [KaTeX](https://github.com/KaTeX/KaTeX). The formulas are rendered ahead of time (`tools/render_math.js`), so no KaTeX script runs in the browser, but the KaTeX stylesheet and fonts are served from `vendor/katex/`.

Copyright (c) 2013-2020 Khan Academy and other contributors. KaTeX is released under the MIT License; the licence text is kept in `vendor/katex/LICENSE`.

## Emscripten runtime and musl libc (MIT)

The WebAssembly modules in `wasm/` were built with [Emscripten](https://emscripten.org). The generated JavaScript glue and the linked runtime contain code from Emscripten (available under the MIT licence or the University of Illinois/NCSA Open Source License) and from musl libc (MIT licence; see `system/lib/libc/musl/COPYRIGHT` in the Emscripten repository). The C++ standard library that Emscripten links is LLVM libc++ (Apache License 2.0 with LLVM exceptions). Licence overview: https://emscripten.org/docs/introducing_emscripten/emscripten_license.html

## GoatCounter (loaded at run time, not bundled)

The pages load the script `https://gc.zgo.at/count.js` from [GoatCounter](https://www.goatcounter.com) to count page opens and run starts anonymously. It is not part of this repository.

## Benchmark data

The built-in benchmark instances and best known solutions come from published work by other researchers; see [DATA.md](DATA.md).
