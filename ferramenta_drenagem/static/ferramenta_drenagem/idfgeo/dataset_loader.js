import { RS_MASK_POLYGON } from './config.js';

const DATASET_URLS = {
    a: `${window.STATIC_URL}datasets/a.json`,
    b: `${window.STATIC_URL}datasets/b.json`
};

const cache = {};

export async function loadDataset(key) {
    if (cache[key]) {
        return cache[key];
    }

    const url = DATASET_URLS[key];
    if (!url) {
        throw new Error(`Unknown dataset key: ${key}`);
    }

    const response = await fetch(url, { cache: 'default' });
    if (!response.ok) {
        throw new Error(`Failed to fetch dataset ${key}: ${response.statusText}`);
    }

    const payload = await response.json();
    const values = new Float32Array(payload.values.length);
    payload.values.forEach((value, idx) => {
        values[idx] = (typeof value === 'number' && Number.isFinite(value)) ? value : NaN;
    });

    const dataset = {
        key: payload.key,
        width: payload.width,
        height: payload.height,
        bounds: payload.bounds,
        min: payload.min,
        max: payload.max,
        values
    };

    cache[key] = dataset;
    return dataset;
}

export function getDatasetValue(dataset, lat, lng) {
    if (!dataset) return null;

    const { bounds, width, height, values } = dataset;
    if (
        lng < bounds.west || lng > bounds.east ||
        lat < bounds.south || lat > bounds.north
    ) {
        return null;
    }

    if (!pointInPolygon(lat, lng, RS_MASK_POLYGON)) {
        return null;
    }

    const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * (width - 1);
    const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * (height - 1);

    return bilinearSample(values, width, height, x, y);
}

function bilinearSample(values, width, height, x, y) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);

    const xf = x - x0;
    const yf = y - y0;

    const q11 = values[y0 * width + x0];
    const q21 = values[y0 * width + x1];
    const q12 = values[y1 * width + x0];
    const q22 = values[y1 * width + x1];

    const top = lerp(q11, q21, xf);
    const bottom = lerp(q12, q22, xf);
    const value = lerp(top, bottom, yf);

    if (!Number.isFinite(value)) {
        const neighbors = [q11, q21, q12, q22].filter(Number.isFinite);
        if (!neighbors.length) return null;
        return neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
    }

    return value;
}

function lerp(a, b, t) {
    if (!Number.isFinite(a) && !Number.isFinite(b)) return NaN;
    if (!Number.isFinite(a)) return b;
    if (!Number.isFinite(b)) return a;
    return a + (b - a) * t;
}

function pointInPolygon(lat, lon, polygon) {
    if (!polygon.length) return true;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [latI, lonI] = polygon[i];
        const [latJ, lonJ] = polygon[j];

        const intersects = ((lonI > lon) !== (lonJ > lon)) &&
            (lat < ((latJ - latI) * (lon - lonI)) / ((lonJ - lonI) || 1e-12) + latI);

        if (intersects) inside = !inside;
    }

    return inside;
}
