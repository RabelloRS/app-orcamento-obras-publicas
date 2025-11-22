import { MAP_CONFIG, RS_BOUNDS, RS_MASK_POLYGON } from './config.js';
import { CITIES } from './data_cities.js';
import { loadDataset, getDatasetValue } from './dataset_loader.js';
import { openPopup, updateLegend } from './ui_manager.js';

const TILE_URLS = {
    a: `${window.STATIC_URL}tiles/a/{z}/{x}/{y}.png`,
    b: `${window.STATIC_URL}tiles/b/{z}/{x}/{y}.png`
};

let map;
let layers = { a: null, b: null };
let datasets = { a: null, b: null };
let cityMarkers = [];
let boundaryLayer = null;

export async function initMap() {
    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        maxBounds: [[-36, -60], [-25, -45]]
    }).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);

    L.tileLayer(MAP_CONFIG.tileLayer, {
        attribution: MAP_CONFIG.attribution,
        maxZoom: MAP_CONFIG.maxZoom,
        minZoom: MAP_CONFIG.minZoom
    }).addTo(map);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

    try {
        const [datasetA, datasetB] = await Promise.all([
            loadDataset('a'),
            loadDataset('b')
        ]);

        datasets.a = datasetA;
        datasets.b = datasetB;

        layers.a = createTileLayer('a');
        layers.b = createTileLayer('b');
        layers.a.addTo(map);
        updateLegend('a');

        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 700);
        }
    } catch (error) {
        console.error('Map loading error:', error);
        document.getElementById('loading-indicator').innerHTML = `<p class="text-red-600 font-bold">Erro ao carregar os rasters oficiais.</p>`;
    }

    setupEvents();
    drawStateBoundary();
}

function setupEvents() {
    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const values = readValues(lat, lng);
        if (values) {
            openPopup(lat, lng, values, map);
        }
    });

    const radios = document.querySelectorAll('input[name="layer-select"]');
    radios.forEach(r => {
        r.addEventListener('change', (e) => switchLayer(e.target.value));
    });

    document.getElementById('toggle-cities').addEventListener('click', toggleCities);
}

function drawStateBoundary() {
    if (!RS_MASK_POLYGON.length) return;

    const latLngs = RS_MASK_POLYGON.map(([lat, lon]) => [lat, lon]);

    if (boundaryLayer) {
        map.removeLayer(boundaryLayer);
    }

    boundaryLayer = L.polygon(latLngs, {
        color: '#0f172a',
        weight: 1,
        opacity: 0.6,
        fill: false,
        interactive: false
    }).addTo(map);

    map.fitBounds(boundaryLayer.getBounds(), { padding: [20, 20] });
}

function switchLayer(type) {
    const other = type === 'a' ? 'b' : 'a';

    if (map.hasLayer(layers[other])) {
        map.removeLayer(layers[other]);
    }
    if (!map.hasLayer(layers[type])) {
        map.addLayer(layers[type]);
    }

    updateLegend(type);
}

function toggleCities() {
    const btn = document.getElementById('toggle-cities');
    const isActive = btn.classList.contains('bg-blue-50');

    if (isActive) {
        cityMarkers.forEach(m => map.removeLayer(m));
        cityMarkers = [];
        btn.classList.remove('bg-blue-50', 'text-blue-700', 'border-blue-200');
        btn.classList.add('bg-slate-50', 'text-slate-600');
    } else {
        CITIES.forEach(city => {
            const marker = L.circleMarker([city.lat, city.lon], {
                radius: 4,
                fillColor: '#1e293b',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
                className: 'city-marker-pulse'
            }).addTo(map);

            marker.bindTooltip(city.name, {
                direction: 'top',
                offset: [0, -8],
                className: 'font-sans text-[10px] font-bold text-slate-700 bg-white/90 border-0 shadow-sm px-2 py-0.5 rounded'
            });

            marker.on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                const values = readValues(city.lat, city.lon);
                if (values) {
                    openPopup(city.lat, city.lon, values, map, city.name);
                }
            });

            cityMarkers.push(marker);
        });

        btn.classList.remove('bg-slate-50', 'text-slate-600');
        btn.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200');
    }
}

function readValues(lat, lng) {
    const valA = getDatasetValue(datasets.a, lat, lng);
    const valB = getDatasetValue(datasets.b, lat, lng);
    if (valA == null || valB == null) {
        return null;
    }

    return {
        a: parseFloat(valA.toFixed(1)),
        b: parseFloat(valB.toFixed(4))
    };
}

function createTileLayer(key) {
    return L.tileLayer(TILE_URLS[key], {
        opacity: 0.82,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        maxNativeZoom: MAP_CONFIG.maxZoom,
        bounds: RS_BOUNDS,
        pane: 'overlayPane'
    });
}
