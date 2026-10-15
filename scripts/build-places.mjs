import {build} from 'esbuild';
import {feature} from 'topojson-client';
import {geoMercator,geoPath} from 'd3-geo';
import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';

await build({entryPoints:['frontend/places-map.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'public/places-map-sdk.js',legalComments:'external'});
await mkdir('public/assets/maps',{recursive:true});
await cp('node_modules/leaflet/dist/leaflet.css','public/assets/maps/leaflet.css');
await cp('node_modules/leaflet/dist/images','public/assets/maps/images',{recursive:true});
await cp('node_modules/leaflet.markercluster/dist/MarkerCluster.css','public/assets/maps/marker-cluster.css');
const world=JSON.parse(await readFile('node_modules/world-atlas/land-110m.json','utf8'));
const land=feature(world,world.objects.land);
// A projected SVG clips the antimeridian correctly. Drawing the raw spherical
// rings in Leaflet creates straight lines across Russia and the North Atlantic.
// Keep the display focused on the inhabited continents containing these places.
for(const item of land.features)if(item.geometry.type==='MultiPolygon')item.geometry.coordinates=item.geometry.coordinates.filter(polygon=>polygon[0].some(([,latitude])=>latitude>-60));
const size=2048,projection=geoMercator().scale(size/(2*Math.PI)).translate([size/2,size/2]).clipExtent([[0,0],[size,size]]).precision(.15);
const path=geoPath(projection).digits(2)(land);
await writeFile('public/assets/maps/world.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><title>World land map, derived from Natural Earth</title><path d="${path}" fill="#dce4ed" stroke="#a8b6c8" stroke-width="1.1" stroke-linejoin="round"/></svg>\n`);
await rm('public/assets/maps/land.json',{force:true});
await writeFile('public/assets/maps/LICENSE.txt',await readFile('node_modules/world-atlas/LICENSE','utf8'));
await writeFile('public/places-map-sdk.js.LEGAL.txt',[
 'Leaflet 1.9.4',await readFile('node_modules/leaflet/LICENSE','utf8'),
 'Leaflet.markercluster 1.5.3',await readFile('node_modules/leaflet.markercluster/MIT-LICENCE.txt','utf8')
].join('\n\n'));
