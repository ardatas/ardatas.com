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
