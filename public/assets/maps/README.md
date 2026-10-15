# Tibet House directory and map

Public addresses in `public/tibet-houses.js` were researched on **15 October 2026** using the organisation's own website or an identified institutional directory. Each record stores its address source and official website. This is a prototype directory, not an exhaustive authoritative register or a partner list.

The directory includes Tibet Houses and related Tibetan cultural spaces. Taipei is labelled a related Tibetan cultural foundation; Zürich is labelled a cultural centre; Melbourne is labelled an independent Tibetan craft business. São Paulo's official contact page notes temporary closure, which the app displays.

Coordinates are rounded, approximate city-area pins. The published addresses and source links provide visit information; the map does not claim precise entrances. All New Tibet ID acceptance, activities, benefits and token prices in this component are **fictional examples**, explicitly labelled in the app. No agreements, bookings, redemptions or payments are represented as live.

The SVG land basemap is projected and clipped with D3 to avoid antimeridian artefacts, showing the inhabited continents where the directory locations are situated. It is generated from `world-atlas` 2.0.2 `land-110m.json`, derived from [Natural Earth](https://www.naturalearthdata.com/). Geographic data is public domain; the source package's license is included in `LICENSE.txt`. Leaflet 1.9.4 and Leaflet.markercluster 1.5.3 are bundled locally, with licenses in `places-map-sdk.js.LEGAL.txt`.

The map and all of its assets are self-hosted. No third-party map tiles, live geocoder, location permission or user position are used. It loads when the map approaches the viewport; choosing a location continues to work if map assets fail. Region controls, clustered pins, zoom controls, a location selector, and a touch-only Move map toggle allow exploration without trapping ordinary page scrolling.
