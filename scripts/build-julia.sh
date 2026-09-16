#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Use Emscripten 4.0.15 for reproducible checked-in browser artifacts.
EMCC="${EMCC:-emcc}"
if ! command -v "$EMCC" >/dev/null; then
    echo 'Install Emscripten 4.0.15 and activate its environment, or set EMCC.' >&2
    exit 1
fi
mkdir -p public/julia
common=(
    -std=c17 -O3 -ffp-contract=off --no-entry
    src/julia/bridge.c src/julia/vendor/julia.c
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=worker,node
    -sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=67108864
    '-sEXPORTED_FUNCTIONS=["_prepare","_get_pixels","_render_rows"]'
    '-sEXPORTED_RUNTIME_METHODS=["HEAPU8"]'
)
"$EMCC" "${common[@]}" -msimd128 -msse2 -o public/julia/renderer-simd.js
"$EMCC" "${common[@]}" -fno-vectorize -fno-slp-vectorize -o public/julia/renderer-scalar.js

# A content-addressed manifest also versions the worker's imported assets.
python3 scripts/julia-manifest.py
