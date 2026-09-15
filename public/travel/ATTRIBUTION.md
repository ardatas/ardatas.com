# Travel globe assets

## Earth imagery

NASA Earth Observatory, Blue Marble: Next Generation, July 2004.
Imagery by Reto Stöckli and Robert Simmon, based on MODIS satellite observations.

Source: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
Original: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x21600x10800.jpg

`earth.webp` is an 8192 × 4096 WebP rendition. `earth-detail.webp` is a crop
at the source resolution covering 15°W–85°E and 28°N–65°N.

`elevation.webp` is a 4096 × 2048 rendition of NASA/GEBCO's topography map:
https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/topography-bathymetry-maps/
https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.jpg

NASA imagery usage guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

## Country boundaries

Natural Earth 1:50m admin-0 countries, version 5.1.2, public domain.
Polygon rings extracted to `borders.json`; coordinates rounded to three decimal places.
https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_50m_admin_0_countries.geojson
https://www.naturalearthdata.com/about/terms-of-use/

Boundaries provide geographic orientation and do not express a position on territorial disputes.

## Renderer

Three.js 0.180.0 (MIT), locally vendored from the published npm package.
Copyright 2010–2025 Three.js Authors. Full license: `vendor/THREE-LICENSE.txt`.
https://github.com/mrdoob/three.js/tree/r180

## Places

Visited locations supplied by Arda. Coordinates are approximate city-centre locations,
not a record of exact addresses or routes. Names are normalized for spelling and diacritics.

## Close-view imagery

The six WebP files in `detail/` are 500 m/pixel crops from the northern-eastern
Blue Marble tile, limited to the visited regions. Each is no larger than 3840
pixels in either dimension and loads only on nearby close views.
Original: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x21600x21600.C1.jpg
