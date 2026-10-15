import L from 'leaflet';
// The upstream clustering plugin extends the browser's Leaflet namespace.
globalThis.L=L;
await import('leaflet.markercluster');
export {L};
