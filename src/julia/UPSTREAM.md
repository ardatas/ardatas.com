# Julia renderer provenance

Source: https://github.com/ardatas/gra26capsproject
Commit: `e5af0e9e53fb4fbd171c75352a225d2697dc3280`

Original project by Arda Tas, Erdeniz, and Noah. See the upstream README for
individual contributions. The upstream repository has no license file; these
vendored files retain their upstream provenance and are not represented as
covered by this website's MIT license.

`vendor/julia.c`, `vendor/julia.h`, and `vendor/utils.h` come from
`Implementierung/`. The only change to the vendored source is an
`#if defined(__SSE2__)` guard around the two SIMD color helper functions, which
allows the existing scalar fallback to compile on non-SSE targets.

`bridge.c` is the browser adapter. It reuses the original renderer for each row,
preserves float coordinate calculations, expands grayscale or BGR0 pixels into
opaque RGBA, and exposes bounded row rendering for worker cancellation.
The recurrence, escape condition, iteration counting, and palettes are unchanged.

Compile using Emscripten 4.0.15 with `bash scripts/build-julia.sh`.
Both SIMD (`-msimd128 -msse2`) and scalar artifacts are checked into
`public/julia/`, so ordinary website builds do not require Emscripten.
No pthreads, SharedArrayBuffer, server renderer, or cross-origin isolation is
required. The generated browser assets inherit the original source provenance.

Update the pinned source explicitly and rerun the renderer parity tests whenever
updating the project. Do not fetch a moving upstream branch during site builds.
