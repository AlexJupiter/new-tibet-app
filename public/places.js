import {tibetHouses,tibetHouseRegions,tibetHousesIn} from './tibet-houses.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const asset=file=>new URL('./assets/maps/'+file,import.meta.url).href;
const options=places=>'<option value="">Choose a location</option>'+places.map(place=>`<option value="${place.id}">${esc(place.city+', '+place.country+' — '+place.name)}</option>`).join('');
const pin='<svg viewBox="0 0 32 40" width="32" height="40" fill="none" aria-hidden="true"><path d="M16 39S2 23 2 16a14 14 0 1 1 28 0c0 7-14 23-14 23Z" fill="currentColor" stroke="white" stroke-width="2"/><path d="m8 14 8-5 8 5M10 14h12v10H10zM8 24h16m-9-7h2v7" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let assetsPromise;

function stylesheet(file){
 const href=asset(file),existing=document.querySelector(`link[data-places-style="${file}"]`);if(existing?.sheet)return Promise.resolve();
 return new Promise((resolve,reject)=>{const link=existing||document.createElement('link');link.onload=resolve;link.onerror=()=>{link.remove();reject(new Error('Map styles could not be loaded.'));};if(!existing){link.rel='stylesheet';link.href=href;link.dataset.placesStyle=file;document.head.append(link);}});
}
function loadAssets(){
 if(!assetsPromise)assetsPromise=Promise.all([import('./places-map-sdk.js'),new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error('Map could not be loaded.'));image.src=asset('world.svg');}),stylesheet('leaflet.css'),stylesheet('marker-cluster.css')]).catch(error=>{assetsPromise=null;throw error;});
 return assetsPromise;
}

export function placesSection(){
 return `<section class="tibet-house-directory" aria-labelledby="tibet-house-title"><div class="places-heading"><h3 id="tibet-house-title">Tibet Houses worldwide</h3><span>Directory preview</span></div><p>Tap a pin to explore how your New Tibet ID could be used at Tibet Houses and related cultural spaces.</p><p class="places-demo-note"><strong>Example card benefits.</strong> Locations are researched; New Tibet ID acceptance, services and prices shown here are illustrative.</p><div class="places-regions" role="group" aria-label="Map region">${tibetHouseRegions.map((region,index)=>`<button type="button" data-places-region="${region}" aria-pressed="${index===0}">${region}</button>`).join('')}</div><label class="places-location-label" for="tibet-house-location">Find a Tibet House</label><select id="tibet-house-location">${options(tibetHouses)}</select><div class="places-map-shell"><div id="tibet-house-map" class="places-map" role="region" aria-label="Interactive world map of Tibet Houses" aria-describedby="places-map-help"><p class="places-loading" role="status">Loading world map…</p></div><button class="places-world-button" id="places-world" type="button" aria-label="Reset map to world view">World view</button><button class="places-move-button" id="places-move" type="button" aria-pressed="false">Move map</button></div><p class="places-map-help" id="places-map-help"><span id="places-count">${tibetHouses.length} locations</span> · Approximate pins. Select a cluster to zoom in.</p><div class="places-selected" id="places-selected" hidden></div><p class="places-source-note">Addresses checked 15 October 2026. Official sources are linked for each location. Check visiting arrangements with the organisation.</p><p class="sr-only" id="places-map-status" role="status"></p></section>`;
}

function placeDetails(place){
 return `<div class="places-detail-heading"><div><span>${esc(place.city+', '+place.country)}</span><h4 tabindex="-1">${esc(place.name)}</h4></div><span class="places-detail-icon" aria-hidden="true">${pin}</span></div><p class="places-place-kind">${esc(place.kind)}</p><p class="places-address">${esc(place.address)}</p>${place.visitNote?`<p class="places-visit-note">${esc(place.visitNote)}</p>`:''}<h5>Example New Tibet ID services</h5><ul class="places-services">${place.services.map(service=>`<li><strong>${esc(service.title)}</strong><span>${esc(service.benefit)}</span></li>`).join('')}</ul><p class="places-benefits-note">Demo ideas only. Card acceptance and these benefits are not confirmed.</p><div class="places-source-links"><a href="${esc(place.source)}" target="_blank" rel="noopener noreferrer">Location source ↗</a><a href="${esc(place.website)}" target="_blank" rel="noopener noreferrer">${esc(place.websiteLabel||'Official website')} ↗</a></div>`;
}

export function mountPlaces(root){
 const section=root.querySelector('.tibet-house-directory');if(!section)return;
 const container=section.querySelector('#tibet-house-map'),select=section.querySelector('#tibet-house-location'),selected=section.querySelector('#places-selected'),status=section.querySelector('#places-map-status'),count=section.querySelector('#places-count'),move=section.querySelector('#places-move');
 const coarse=matchMedia('(pointer: coarse)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let disposed=false,map,clusters,resizeObserver,intersection,loading=null,region='Worldwide',selectedId='',mapReady=false,markerById=new Map();
 const cleanup=()=>{disposed=true;intersection?.disconnect();resizeObserver?.disconnect();map?.remove();removalObserver.disconnect();};
 const removalObserver=new MutationObserver(()=>{if(!section.isConnected)cleanup();});removalObserver.observe(root,{childList:true});
 const showDetails=place=>{selectedId=place.id;selected.innerHTML=placeDetails(place);selected.hidden=false;select.value=place.id;status.textContent=`${place.name}, ${place.city}. Three example New Tibet ID services shown below the map.`;};
 const fit=()=>{
  if(!mapReady)return;const places=tibetHousesIn(region);
  if(places.length===1)map.setView(places[0].coordinates,3,{animate:!reduced});
  else map.fitBounds(places.map(place=>place.coordinates),{padding:[34,38],maxZoom:4,animate:!reduced});
 };
 const changeRegion=value=>{
  region=value;selectedId='';selected.hidden=true;selected.replaceChildren();select.innerHTML=options(tibetHousesIn(region));
  section.querySelectorAll('[data-places-region]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.placesRegion===region)));
  count.textContent=tibetHousesIn(region).length+' locations';status.textContent=`Showing ${count.textContent} ${region==='Worldwide'?'worldwide':'in '+region}.`;
  if(mapReady){map.closePopup();clusters.clearLayers();clusters.addLayers(tibetHousesIn(region).map(place=>markerById.get(place.id)));fit();}
 };
 const choose=async id=>{
  const place=tibetHouses.find(place=>place.id===id);if(!place)return;
  showDetails(place);selected.querySelector('h4').focus({preventScroll:true});selected.scrollIntoView({block:'nearest',behavior:reduced?'instant':'smooth'});
  await initialise();if(disposed||!mapReady||selectedId!==id)return;
  const marker=markerById.get(id);map.setView(place.coordinates,Math.max(map.getZoom(),4),{animate:!reduced});
  clusters.zoomToShowLayer(marker,()=>{if(!disposed&&selectedId===id)marker.openPopup();});
 };
 select.onchange=()=>{if(select.value)choose(select.value);else{selectedId='';selected.hidden=true;map?.closePopup();}};
 section.querySelectorAll('[data-places-region]').forEach(button=>button.onclick=()=>{changeRegion(button.dataset.placesRegion);initialise();});
 section.querySelector('#places-world').onclick=()=>{changeRegion('Worldwide');initialise();};
 move.hidden=!coarse;
 move.onclick=async()=>{
  await initialise();if(disposed||!mapReady)return;const enabled=move.getAttribute('aria-pressed')!=='true';move.setAttribute('aria-pressed',String(enabled));move.textContent=enabled?'Done moving':'Move map';container.classList.toggle('is-moving',enabled);
  if(enabled){map.dragging.enable();map.touchZoom.enable();}else{map.dragging.disable();map.touchZoom.disable();}
 };
 function initialise(){
  if(disposed||mapReady)return Promise.resolve();if(loading)return loading;
  loading=(async()=>{try{
   const [{L}]=await loadAssets();if(disposed)return;
   container.replaceChildren();
   map=L.map(container,{zoomControl:false,scrollWheelZoom:false,dragging:!coarse,touchZoom:!coarse,tapHold:false,zoomAnimation:!reduced,fadeAnimation:!reduced,markerZoomAnimation:!reduced,minZoom:0,maxZoom:7,maxBounds:[[-80,-190],[85,190]],maxBoundsViscosity:.8});
   L.imageOverlay(asset('world.svg'),[[-85.0511287798,-180],[85.0511287798,180]],{interactive:false,alt:'World land map'}).addTo(map);
   map.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">Leaflet</a>');map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>');
   L.control.zoom({position:'topleft',zoomInTitle:'Zoom in',zoomOutTitle:'Zoom out'}).addTo(map);
   clusters=L.markerClusterGroup({maxClusterRadius:34,showCoverageOnHover:false,animate:!reduced,disableClusteringAtZoom:6,spiderfyOnMaxZoom:true,iconCreateFunction:cluster=>L.divIcon({className:'places-cluster',html:`<span>${cluster.getChildCount()}</span><span class="sr-only"> locations. Zoom in.</span>`,iconSize:[40,40]})});
   markerById=new Map(tibetHouses.map(place=>{
    const marker=L.marker(place.coordinates,{title:place.name+' · '+place.city,alt:place.name,keyboard:true,icon:L.divIcon({className:'places-pin',html:pin,iconSize:[36,44],iconAnchor:[18,42],popupAnchor:[0,-38]})});
    marker.bindPopup(`<div class="places-pin-popup"><strong>${esc(place.name)}</strong><span>${esc(place.city+', '+place.country)}</span><span>Example services shown below the map ↓</span></div>`,{maxWidth:240,autoPanPadding:[24,36],closeButton:true});
    marker.on('add',()=>{const element=marker.getElement();element?.setAttribute('aria-label',`${place.name}, ${place.city}. Show example card services.`);element?.setAttribute('aria-controls','places-selected');});
    const activate=()=>{showDetails(place);selected.scrollIntoView({block:'nearest',behavior:reduced?'instant':'smooth'});};
    marker.on('click',activate);
    marker.on('keypress',event=>{if(['Enter',' '].includes(event.originalEvent.key)){event.originalEvent.preventDefault();activate();marker.openPopup();}});
    return [place.id,marker];
   }));
   clusters.addLayers(tibetHousesIn(region).map(place=>markerById.get(place.id)));map.addLayer(clusters);mapReady=true;fit();
   resizeObserver=new ResizeObserver(()=>{if(!disposed){map.invalidateSize({pan:false});}});resizeObserver.observe(container);
   container.dataset.ready='true';status.textContent='World map loaded. Select a pin or choose a location to see example card services.';
  }catch(error){if(disposed)return;map?.remove();map=null;mapReady=false;container.innerHTML='<p class="places-loading">The map could not load. You can still choose any location above to view its services and source.</p>';}
  finally{loading=null;}
  })();return loading;
 }
 intersection=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){intersection.disconnect();initialise();}},{rootMargin:'240px'});intersection.observe(container);
}
