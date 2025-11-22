import { RS_BOUNDS, LIMITS, ANCHORS } from './config.js';
import { getValueFromColor } from './color_utils.js';



const CANVAS_W = 800;
const CANVAS_H = 800;

/**
 * Spawns a worker to generate the IDW heatmap.
 * Returns a Promise with { url, ctx }
 * url: DataURL for Leaflet ImageOverlay
 * ctx: CanvasContext2D for pixel reading
 */
export function generateMapLayer(type) {
    return new Promise((resolve, reject) => {
        // Use the global WORKER_URL variable if defined, otherwise fallback to relative
        const workerPath = window.WORKER_URL || 'idw_worker.js';
        const worker = new Worker(workerPath, { type: 'module' });

        worker.postMessage({
            width: CANVAS_W,
            height: CANVAS_H,
            anchors: ANCHORS,
            limits: LIMITS,
            bounds: RS_BOUNDS,
            type: type
        });

        worker.onmessage = (e) => {
            const { buffer } = e.data;


            const canvas = document.createElement('canvas');
            canvas.width = CANVAS_W;
            canvas.height = CANVAS_H;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            const imgData = new ImageData(new Uint8ClampedArray(buffer), CANVAS_W, CANVAS_H);
            ctx.putImageData(imgData, 0, 0);

            worker.terminate();

            resolve({
                url: canvas.toDataURL(),
                ctx: ctx
            });
        };

        worker.onerror = (err) => {
            worker.terminate();
            reject(err);
        };
    });
}

/**
 * Extracts coefficients 'a' and 'b' given a Lat/Lng.
 * Performs geometric mapping from Map Lat/Lng to Canvas X/Y.
 */
export function getValuesAtPosition(lat, lng, ctxA, ctxB) {
    const [swLat, swLon] = RS_BOUNDS[0];
    const [neLat, neLon] = RS_BOUNDS[1];


    const pctX = (lng - swLon) / (neLon - swLon);
    const pctY = (neLat - lat) / (neLat - swLat); // Lat is inverted (Y goes down, Lat goes up)


    if (pctX < 0 || pctX > 1 || pctY < 0 || pctY > 1) {
        return null;
    }


    const x = Math.floor(pctX * CANVAS_W);
    const y = Math.floor(pctY * CANVAS_H);

    try {

        const pA = ctxA.getImageData(x, y, 1, 1).data;
        const pB = ctxB.getImageData(x, y, 1, 1).data;


        if (pA[3] === 0) return null;


        const valA = getValueFromColor(pA[0], pA[1], pA[2], LIMITS.a.min, LIMITS.a.max);
        const valB = getValueFromColor(pB[0], pB[1], pB[2], LIMITS.b.min, LIMITS.b.max);

        return { a: valA, b: valB };
    } catch (e) {
        console.warn("Pixel read failed", e);
        return null;
    }
}
