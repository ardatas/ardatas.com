# Portfolio Website

My portfolio website, built with a custom static site generator

## Dependencies
```sh
yarn install
poetry install
```

## Development
```sh
poetry shell
yarn dev
```

## Production
```sh
yarn build
```

## Running stats

The custom running card uses `src/data/running.json`. Update the snapshot and
run `pnpm build` to regenerate the page. It does not update automatically.

Keep all totals within the same period. Store distance in kilometres, moving
time in seconds, run count as an integer, and elevation gain in metres. Use
`YYYY-MM-DD` for `updated_at`. Leave unavailable values as `null`.

`best_efforts` stores Strava's all-time best efforts separately from the annual totals.
Each entry has a `distance` label, a `time`, and its source Strava activity `url`.
Only include distances with recorded best efforts; do not extrapolate times.
The card includes the snapshot date and a link to the Strava profile.

## Map
```
portfolio-website
├── README.md                     # this file
├── dist                          # output directory
├── LICENSE                       # MIT License
├── package.json                  # JS dependencies & dev server target
├── yarn.lock
├── tailwind.config.js
├── pyproject.toml                # Python dependencies
├── poetry.lock
├── build.sh                      # prod build script, called by yarn build
├── posts                         # contains categories of posts
│   └── projects
│       └── *.md                  # project posts
├── public
│   ├── assets/                   # static assets, images optimized
│   └── photography/              # unoptimized images
├── src
│   ├── build.py                  # main entrypoint
│   ├── dev-server.py             # live reload server
│   ├── index.css                 # just tailwind imports
│   ├── optimize-images.sh        # image optimization script
│   └── templates
│       ├── components            # reusable components
│       │   ├── button.html
│       │   └── fieldset.html
│       ├── index.html            # landing page
│       ├── layout.html           # base layout
│       └── posts                 # corresponds to posts directory
│           └── projects
│               ├── list.html     # renders list of posts in index.html
│               └── page.html     # renders the actual post page
```

## Travel globe

The home page includes a self-contained 3D globe after Resources. Edit
`src/data/travel.json` to add places; coordinates are city-centre latitude and
longitude in degrees. Country and place totals are generated from that data.
Munich uses `base: "home"`, Istanbul uses `base: "second"`. Bielefeld is a separate
easter egg and is excluded from the visited-place count.

Run `pnpm build` to include the globe and all its assets in `dist/travel/`.
No map API key, runtime geocoding, or external map service is required. The
renderer loads when the section approaches the viewport and only draws while
its view changes. Higher-detail imagery loads when cities are revealed.

- Scroll forward over the globe to zoom in; scroll back to zoom out. Drag to rotate.
- Country buttons zoom to a region. Select a city pin to move closer.
- Arrow keys rotate the focused globe; `+` / `-` zoom; `Home` resets.
- `Escape` releases page scrolling. Scrolling outside the panel always scrolls the page.
- On touchscreens, tap **Explore globe** for drag/pinch controls, then **Done exploring**
  to resume page scrolling. Country and zoom buttons also work without entering this mode.
- **All the places** remains available without JavaScript or WebGL.

Asset provenance and license details are in `public/travel/ATTRIBUTION.md`.

Exploration percentages are calculated at build time by `src/travel_stats.py`.
They count unique visited countries, using 195 UN member/observer states for the
world and UN M49 regional assignments for continents (Türkiye is in Asia).
Only continents with at least one visited country are shown. Every country in
`src/data/travel.json` has a `continent` field; use Africa, Asia, Europe,
North America, South America, or Oceania when adding a new country.
The displayed fractions show countries visited out of the total; these values
do not estimate land area or the completeness of a visit.

## Julia set explorer

The homepage links to the interactive explorer from a card in Projects.
`/julia/` provides the standalone, shareable explorer. Its defaults come from
`ardatas/gra26capsproject`: `c=-0.5125+0.5213i`, top-left `-2+1.5i`, 800×600,
pixel spacing `0.005`, 100 iterations, grayscale.

The original C renderer is vendored at a pinned commit in `src/julia/vendor/`;
see `src/julia/UPSTREAM.md` for attribution and the one portability patch.
`bridge.c` adapts its pixel buffer to RGBA. Compiled SIMD and scalar WebAssembly
artifacts live in `public/julia/`. A module worker renders short row batches,
discards superseded requests, and transfers completed images to the canvas.
The scalar build is used if SIMD is unavailable or cannot load.

Sliders and numeric fields update the image immediately. Previews preserve the
view while reducing pixel count; a full-resolution render follows when input
settles. Animation starts paused, uses an adaptive preview targeting 30 fps,
and pauses when the explorer or tab is hidden. Actual speed depends on the
device, view, and iteration count. Images are capped at 2048×2048 and 2000
iterations. Float precision limits deep zoom; pixel spacing is bounded at 1e-7.

- Click the canvas, then scroll to zoom around the pointer. Drag to pan.
- Focus the canvas for arrow-key panning, `+`/`-` zoom, and `Home` to reset the view.
- `Escape` releases scrolling. On touchscreens, tap **Explore image**, then use
  drag/pinch gestures. **Done exploring** restores page scrolling.
- **Download PNG** pauses animation and renders the selected full resolution.
- **Copy link** encodes all rendering parameters in a `/julia/` URL.
- **Reset defaults** restores the original project parameters and pauses animation.

`pnpm build` copies the precompiled files into `dist/julia/` and versions their
URLs, including worker and Wasm dependencies. No server computation, special
isolation headers, or Emscripten installation is needed to build/deploy the site.
When changing C code, install Emscripten **4.0.15**, activate its environment, and
run `bash scripts/build-julia.sh` before building the website.

Validation:

```sh
node tests/julia-renderer.mjs  # requires a native C compiler; byte-for-byte parity
pnpm build
python3 -m http.server 8766 --bind 127.0.0.1 --directory dist
# In another terminal, with Playwright and its Chromium/WebKit browsers installed:
node tests/julia-browser.mjs
```

The browser test accepts `JULIA_TEST_URL` and `PLAYWRIGHT_MODULE` overrides.
Tests cover default and edge-case parity, scalar/SIMD builds, input validation,
sharing, animation, cancellation, PNG export, fallback, and mobile layout.
