"""Generate IDFGeo XYZ tiles and sampling grids from official rasters.

Usage example:
    python scripts/generate_idfgeo_tiles.py \
        --input-dir "G:/Meu Drive/BIBLIOTECA/DRENAGEM URBANA/Coeficientes_IDF_RS-1/Rasteres" \
        --output-dir "ferramenta_drenagem/static/ferramenta_drenagem/idfgeo" \
        --min-zoom 6 --max-zoom 10

The script performs three tasks for each raster (coeficiente_a / coeficiente_b):
1. Reprojects the GeoTIFF from ESRI:102033 to EPSG:4326 using a WarpedVRT.
2. Generates an XYZ tile pyramid (PNG with transparency) that matches the Blue→Red
   gradient used on the front-end.
3. Exports a compact JSON grid so the application can sample exact coefficient
   values without running an interpolation on the client.

Dependencies: rasterio, numpy, mercantile, Pillow, pyproj (bundled with rasterio).
Install them in the virtualenv before running this script.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Tuple

import mercantile
import numpy as np
import rasterio
from PIL import Image
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.vrt import WarpedVRT
from rasterio.warp import reproject


# Geographic extent used by the Leaflet map (south-west, north-east)
RS_BOUNDS = ((-33.752, -57.649), (-27.08, -49.691))


@dataclass(frozen=True)
class DatasetConfig:
    key: str
    filename: str
    min_val: float
    max_val: float
    precision: int


DATASETS: Tuple[DatasetConfig, ...] = (
    DatasetConfig('a', 'coeficiente_a.tif', 507.6, 1254.6, 1),
    DatasetConfig('b', 'coeficiente_b.tif', 0.0593, 0.3738, 4),
)

COLOR_STEPS = 2048
COLOR_LUT_CACHE: Dict[str, np.ndarray] = {}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate IDFGeo assets")
    parser.add_argument('--input-dir', required=True, type=Path,
                        help='Folder containing the official GeoTIFF rasters.')
    parser.add_argument('--output-dir', type=Path,
                        default=Path('ferramenta_drenagem/static/ferramenta_drenagem/idfgeo'),
                        help='Base directory inside the Django project where assets are written.')
    parser.add_argument('--min-zoom', type=int, default=6)
    parser.add_argument('--max-zoom', type=int, default=10)
    parser.add_argument('--tile-size', type=int, default=256)
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def js_value_to_rgb(value: float, min_val: float, max_val: float) -> Tuple[int, int, int]:
    """Mirror the client-side valueToColor helper (Hue 240→0)."""
    clamped = max(min_val, min(max_val, value))
    t = (clamped - min_val) / (max_val - min_val)
    hue = 240 * (1 - t)
    return hsl_to_rgb(hue, 1.0, 0.5)


def hsl_to_rgb(h: float, s: float, l: float) -> Tuple[int, int, int]:
    c = (1 - abs(2 * l - 1)) * s
    hp = h / 60
    x = c * (1 - abs(hp % 2 - 1))

    r = g = b = 0.0
    if 0 <= hp < 1:
        r, g = c, x
    elif 1 <= hp < 2:
        r, g = x, c
    elif 2 <= hp < 3:
        g, b = c, x
    elif 3 <= hp < 4:
        g, b = x, c
    elif 4 <= hp < 5:
        r, b = x, c
    else:
        r, b = c, x

    m = l - c / 2
    return (
        int(round((r + m) * 255)),
        int(round((g + m) * 255)),
        int(round((b + m) * 255)),
    )


def build_color_lut(cfg: DatasetConfig) -> np.ndarray:
    lut = np.zeros((COLOR_STEPS, 3), dtype=np.uint8)
    for idx in range(COLOR_STEPS):
        t = idx / (COLOR_STEPS - 1)
        value = cfg.min_val + t * (cfg.max_val - cfg.min_val)
        lut[idx] = js_value_to_rgb(value, cfg.min_val, cfg.max_val)
    return lut


def get_color_lut(cfg: DatasetConfig) -> np.ndarray:
    lut = COLOR_LUT_CACHE.get(cfg.key)
    if lut is None:
        lut = build_color_lut(cfg)
        COLOR_LUT_CACHE[cfg.key] = lut
    return lut


def tile_bounds(tile: mercantile.Tile) -> Tuple[float, float, float, float]:
    bounds = mercantile.bounds(tile)
    return bounds.west, bounds.south, bounds.east, bounds.north


def raster_bounds_latlon(src: rasterio.io.DatasetReader) -> Tuple[float, float, float, float]:
    transformer = Transformer.from_crs(src.crs, 'EPSG:4326', always_xy=True)
    west, south = transformer.transform(src.bounds.left, src.bounds.bottom)
    east, north = transformer.transform(src.bounds.right, src.bounds.top)
    return west, south, east, north


def reproject_window(
    vrt: WarpedVRT,
    bounds: Tuple[float, float, float, float],
    width: int,
    height: int,
) -> np.ndarray:
    west, south, east, north = bounds
    dst = np.full((height, width), np.nan, dtype=np.float32)
    dst_transform = from_bounds(west, south, east, north, width, height)
    reproject(
        source=rasterio.band(vrt, 1),
        destination=dst,
        dst_transform=dst_transform,
        dst_crs='EPSG:4326',
        resampling=Resampling.bilinear,
    )
    return dst


def write_tile(tile_path: Path, data: np.ndarray, cfg: DatasetConfig) -> None:
    valid = np.isfinite(data)
    if not np.any(valid):
        return  # Skip writing empty tiles

    rgba = np.zeros((data.shape[0], data.shape[1], 4), dtype=np.uint8)
    lut = get_color_lut(cfg)

    norm = (data - cfg.min_val) / (cfg.max_val - cfg.min_val)
    norm = np.where(valid, norm, 0)
    norm = np.clip(norm, 0, 1)
    idx = (norm * (COLOR_STEPS - 1)).round().astype(int)

    rgba[..., 3] = np.where(valid, 200, 0)
    rgba[..., :3] = lut[idx]
    rgba[~valid, :3] = 0

    ensure_dir(tile_path.parent)
    Image.fromarray(rgba, mode='RGBA').save(tile_path, format='PNG', optimize=True)


def export_dataset_json(json_path: Path, grid: np.ndarray, bounds: Tuple[float, float, float, float], cfg: DatasetConfig) -> None:
    ensure_dir(json_path.parent)
    west, south, east, north = bounds

    values: Iterable[float | None] = (
        None if not math.isfinite(val) else round(float(val), cfg.precision)
        for val in grid.flatten()
    )

    payload = {
        'key': cfg.key,
        'width': int(grid.shape[1]),
        'height': int(grid.shape[0]),
        'bounds': {'west': west, 'south': south, 'east': east, 'north': north},
        'min': cfg.min_val,
        'max': cfg.max_val,
        'values': list(values),
    }

    with json_path.open('w', encoding='utf-8') as fp:
        json.dump(payload, fp, ensure_ascii=False, separators=(',', ':'))


def build_assets(src_path: Path, out_dir: Path, cfg: DatasetConfig, min_zoom: int, max_zoom: int, tile_size: int) -> None:
    print(f'Processing {cfg.filename} → tiles/{cfg.key}')
    tile_base = out_dir / 'tiles' / cfg.key
    dataset_json = out_dir / 'datasets' / f'{cfg.key}.json'

    with rasterio.open(src_path) as src:
        bounds_latlon = raster_bounds_latlon(src)
        vrt_opts = {
            'crs': 'EPSG:4326',
            'resampling': Resampling.bilinear,
            'nodata': src.nodata,
        }

        with WarpedVRT(src, **vrt_opts) as vrt:
            for zoom in range(min_zoom, max_zoom + 1):
                tiles = mercantile.tiles(
                    RS_BOUNDS[0][1], RS_BOUNDS[0][0],
                    RS_BOUNDS[1][1], RS_BOUNDS[1][0],
                    zoom
                )
                for tile in tiles:
                    bounds = tile_bounds(tile)
                    data = reproject_window(vrt, bounds, tile_size, tile_size)
                    tile_path = tile_base / str(tile.z) / str(tile.x) / f'{tile.y}.png'
                    write_tile(tile_path, data, cfg)

            # Use the native resolution to export a compact sampling grid
            grid = reproject_window(vrt, bounds_latlon, src.width, src.height)
            export_dataset_json(dataset_json, grid, bounds_latlon, cfg)


def main() -> None:
    args = parse_args()
    out_dir = args.output_dir

    for cfg in DATASETS:
        src_path = args.input_dir / cfg.filename
        if not src_path.exists():
            raise FileNotFoundError(f'Could not find {src_path}')
        build_assets(src_path, out_dir, cfg, args.min_zoom, args.max_zoom, args.tile_size)

    print('✅ Assets generated successfully.')


if __name__ == '__main__':
    main()
