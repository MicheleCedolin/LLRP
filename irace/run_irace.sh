#!/bin/bash
# Usage: LLRP_WEB=<dir with wasm/ and data/> [LLRP_TIME_SCALE=1] ./run_irace.sh [extra irace args]
set -e
cd "$(dirname "$0")"
export IRACE_HOME=$(Rscript -e 'cat(system.file(package="irace"))')
"$IRACE_HOME/bin/irace" --scenario scenario.txt "$@"
Rscript report.R
