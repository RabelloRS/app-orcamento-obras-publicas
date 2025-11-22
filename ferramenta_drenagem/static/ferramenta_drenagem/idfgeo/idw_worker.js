import { valueToColor } from './color_utils.js';

/**
 * Web Worker for IDW (Inverse Distance Weighting)
 * Generates heatmap pixel data off the main thread.
 */

self.onmessage = function(e) {
    const { width, height, anchors, limits, bounds, type } = e.data;


    const buffer = new ArrayBuffer(width * height * 4);
    const data = new Uint8ClampedArray(buffer);

    const [swLat, swLon] = bounds[0];
    const [neLat, neLon] = bounds[1];

    const latRange = neLat - swLat;
    const lonRange = neLon - swLon;


    const p = 2.5; // Higher power = more localized "spots", lower = smoother
    const minVal = limits[type].min;
    const maxVal = limits[type].max;

    let pixelIndex = 0;


    for (let y = 0; y < height; y++) {

        const pctY = y / height;
        const lat = neLat - (pctY * latRange);

        for (let x = 0; x < width; x++) {

            const pctX = x / width;
            const lng = swLon + (pctX * lonRange);

            let numerator = 0;
            let denominator = 0;
            let exactMatch = null;



            for (let i = 0; i < anchors.length; i++) {
                const pt = anchors[i];


                const dLat = lat - pt.lat;
                const dLon = lng - pt.lon;
                const distSq = dLat*dLat + dLon*dLon;

                if (distSq < 0.0000001) {
                    exactMatch = pt[type];
                    break;
                }

                const dist = Math.sqrt(distSq);
                const weight = 1 / Math.pow(dist, p);

                numerator += pt[type] * weight;
                denominator += weight;
            }

            let value;
            if (exactMatch !== null) {
                value = exactMatch;
            } else {
                value = numerator / denominator;
            }


            const [r, g, b] = valueToColor(value, minVal, maxVal);


            data[pixelIndex]     = r;
            data[pixelIndex + 1] = g;
            data[pixelIndex + 2] = b;
            data[pixelIndex + 3] = 180; // Base Opacity (0-255). 180 is ~70%

            pixelIndex += 4;
        }
    }


    self.postMessage({ buffer }, [buffer]);
};
