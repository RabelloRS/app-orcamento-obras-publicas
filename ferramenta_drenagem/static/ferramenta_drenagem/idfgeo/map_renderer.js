import { MAP_CONFIG, RS_BOUNDS, LIMITS } from './config.js';
import { CITIES } from './data_cities.js';
import { generateMapLayer, getValuesAtPosition } from './canvas_utils.js';
import { openPopup, updateLegend } from './ui_manager.js';

let map;
let layers = { a: null, b: null };
let contexts = { a: null, b: null };
let cityMarkers = [];

export async function initMap() {

    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        maxBounds: [[-36, -60], [-25, -45]] // Restrict view loosely around RS
    }).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);


    L.tileLayer(MAP_CONFIG.tileLayer, {
        attribution: MAP_CONFIG.attribution,
        maxZoom: MAP_CONFIG.maxZoom,
        minZoom: MAP_CONFIG.minZoom
    }).addTo(map);


    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);


    try {
        const [resA, resB] = await Promise.all([
            generateMapLayer('a'),
            generateMapLayer('b')
        ]);


        contexts.a = resA.ctx;
        contexts.b = resB.ctx;


        layers.a = L.imageOverlay(resA.url, RS_BOUNDS, { opacity: 0.75, interactive: true });
        layers.b = L.imageOverlay(resB.url, RS_BOUNDS, { opacity: 0.75, interactive: true });


        layers.a.addTo(map);
        updateLegend('a');


        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 700);
        }
    } catch (e) {
        console.error("Map generation error:", e);
        document.getElementById('loading-indicator').innerHTML = `<p class="text-red-600 font-bold">Erro na geração do mapa.</p>`;
    }


    setupEvents();
}

function setupEvents() {

    map.on('click', (e) => {
        if (!contexts.a || !contexts.b) return;

        const { lat, lng } = e.latlng;
        const values = getValuesAtPosition(lat, lng, contexts.a, contexts.b);

        if (values) {

            values.a = parseFloat(values.a.toFixed(1));
            values.b = parseFloat(values.b.toFixed(4));
            openPopup(lat, lng, values, map);
        }
    });


    const radios = document.querySelectorAll('input[name="layer-select"]');
    radios.forEach(r => {
        r.addEventListener('change', (e) => switchLayer(e.target.value));
    });


    document.getElementById('toggle-cities').addEventListener('click', toggleCities);
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
            const m = L.circleMarker([city.lat, city.lon], {
                radius: 4,
                fillColor: '#1e293b',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
                className: 'city-marker-pulse' // Custom animation
            }).addTo(map);

            m.bindTooltip(city.name, {
                direction: 'top',
                offset: [0, -8],
                className: 'font-sans text-[10px] font-bold text-slate-700 bg-white/90 border-0 shadow-sm px-2 py-0.5 rounded'
            });


            m.on('click', (e) => {
                L.DomEvent.stopPropagation(e); // Prevent double click

                const values = getValuesAtPosition(city.lat, city.lon, contexts.a, contexts.b);
                if (values) {
                    values.a = parseFloat(values.a.toFixed(1));
                    values.b = parseFloat(values.b.toFixed(4));
                    openPopup(city.lat, city.lon, values, map, city.name);
                }
            });

            cityMarkers.push(m);
        });

        btn.classList.remove('bg-slate-50', 'text-slate-600');
        btn.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200');
    }
}
