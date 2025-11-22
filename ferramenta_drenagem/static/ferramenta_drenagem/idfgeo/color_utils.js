/**
 * Color utility functions for Heatmap generation.
 * Logic: Map normalized value (0-1) to Hue (240-0 aka Blue-Red).
 */


export function valueToColor(value, min, max) {
    const clamped = Math.max(min, Math.min(max, value));
    const t = (clamped - min) / (max - min); // 0 to 1


    const hue = 240 * (1 - t);

    return hslToRgb(hue, 1.0, 0.5);
}


export function getValueFromColor(r, g, b, min, max) {
    const hue = rgbToHue(r, g, b);

    let t = 1 - (hue / 240);
    t = Math.max(0, Math.min(1, t));

    return min + (t * (max - min));
}


function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}


function rgbToHue(r, g, b) {
    const rN = r / 255;
    const gN = g / 255;
    const bN = b / 255;

    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);

    if (max === min) return 0;

    const d = max - min;
    let h = 0;

    switch (max) {
        case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
        case gN: h = (bN - rN) / d + 2; break;
        case bN: h = (rN - gN) / d + 4; break;
    }

    return h * 60;
}
