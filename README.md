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

## Running widget

The running section embeds Strava's official weekly summary from
`src/templates/components/running.html`. Strava serves the latest weekly
summary when visitors load the widget; no API credentials, local data updates,
or scheduled rebuilds are required.

The widget shows the current week's distance, time, and elevation using
Strava's own design. It does not provide the former year-to-date totals or
average pace. The profile link remains available if the embed cannot load.

To replace the embed, open your Strava profile, choose **Share Your Activities**,
and copy the URL from **Summary Widget** into the iframe source.

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
