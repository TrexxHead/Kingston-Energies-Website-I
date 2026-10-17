"""Cloud-free Sentinel-2 satellite mosaic of Jamaica → raster PMTiles (roadmap L2).

Source: Copernicus Sentinel-2 L2A, Cloud-Optimised GeoTIFFs in the AWS open-data
bucket `sentinel-cogs` (Element 84). Licence: free and open, including commercial
use, with attribution "Contains modified Copernicus Sentinel data <years>".

Steps
  1. Scenes: for each Sentinel-2 grid tile over Jamaica, list dry-season scenes
     (Dec–Apr) in the chosen years and keep the least cloudy (scene metadata).
  2. Per grid tile: read the true-colour image (TCI) at 20 m from the COG overview
     and the scene classification (SCL, native 20 m) for the land window only.
  3. Mask cloud, cloud shadow, cirrus and saturated pixels; per-pixel median of the
     clear observations (falls back to the least-cloudy look where nothing is clear).
  4. Clip to Jamaica's land plus a coastal margin; write one GeoTIFF per grid tile.
  5. Reproject to Web Mercator and cut WebP tiles z8–MAXZOOM into one PMTiles file.

Run from this folder (needs network access to S3):
  pip install rasterio numpy shapely pillow pmtiles mgrs packaging
  python 6_satellite.py            # → build/jamaica-satellite.pmtiles
"""
import concurrent.futures as cf
import io
import json
import math
import os
import re
import sys
import urllib.request

import numpy as np
import rasterio
import rasterio.warp
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from rasterio.windows import from_bounds
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from PIL import Image
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, TileType, Compression

BUCKET = 'https://sentinel-cogs.s3.us-west-2.amazonaws.com'
PREFIX = 'sentinel-s2-l2a-cogs'
GRID = ['17QQA', '17QQV', '17QRA', '17QRV', '18QSE', '18QSF', '18QTE', '18QTF', '18QUE', '18QUF']
SEASONS = [(2023, 12), (2024, 1), (2024, 2), (2024, 3), (2024, 4), (2024, 12), (2025, 1), (2025, 2), (2025, 3), (2025, 4)]
MAX_CLOUD = 40.0          # scene-level cloud %, before per-pixel masking
SCENES_PER_TILE = 7
RES = 20                  # metres; z13 ≈ 18 m/px at Jamaica's latitude
MINZOOM, MAXZOOM = 8, 13
COAST_BUFFER_M = 1500     # keep reefs, harbours and the cays close to shore
BAD_SCL = {0, 1, 3, 8, 9, 10}  # nodata, saturated, cloud shadow, cloud medium/high, thin cirrus
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, 'build', 'satellite')
PARISHES = os.path.join(HERE, '..', '..', 'public', 'maps', 'jamaica-parishes.geojson')

os.environ.setdefault('GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR')
os.environ.setdefault('CPL_VSIL_CURL_ALLOWED_EXTENSIONS', '.tif')
os.environ.setdefault('GDAL_HTTP_MAX_RETRY', '4')
os.environ.setdefault('GDAL_HTTP_RETRY_DELAY', '2')
os.environ.setdefault('VSI_CACHE', 'TRUE')
if os.environ.get('HTTPS_PROXY'):
    os.environ.setdefault('GDAL_HTTP_PROXY', os.environ['HTTPS_PROXY'].replace('http://', '').rstrip('/'))
CA = '/root/.ccr/ca-bundle.crt'
if os.path.exists(CA):
    os.environ.setdefault('CURL_CA_BUNDLE', CA)

opener = urllib.request.build_opener(urllib.request.ProxyHandler({'https': os.environ['HTTPS_PROXY']} if os.environ.get('HTTPS_PROXY') else {}))


def get(url, tries=4):
    for i in range(tries):
        try:
            return opener.open(url, timeout=60).read()
        except Exception as e:  # noqa: BLE001
            err = e
    raise err


def list_prefixes(prefix):
    xml = get(f'{BUCKET}/?list-type=2&delimiter=/&prefix={prefix}').decode()
    return re.findall(r'<Prefix>([^<]+/)</Prefix>', xml)[1:]


def scenes_for(tile):
    z, band, sq = tile[:2], tile[2], tile[3:]
    found = []
    for y, m in SEASONS:
        for p in list_prefixes(f'{PREFIX}/{int(z)}/{band}/{sq}/{y}/{m}/'):
            name = p.rstrip('/').split('/')[-1]
            found.append(p + name + '.json')
    def meta(key):
        try:
            d = json.loads(get(f'{BUCKET}/{key}'))
            pr = d['properties']
            return {'key': key.rsplit('/', 1)[0], 'cloud': pr.get('eo:cloud_cover', 100), 'nodata': pr.get('s2:nodata_pixel_percentage', 100), 'date': pr['datetime'][:10]}
        except Exception:  # noqa: BLE001
            return None
    with cf.ThreadPoolExecutor(12) as ex:
        metas = [m for m in ex.map(meta, found) if m]
    ok = [m for m in metas if m['cloud'] <= MAX_CLOUD and m['nodata'] < 60]
    ok.sort(key=lambda m: (m['cloud'] + m['nodata'] * 0.5))
    return ok[:SCENES_PER_TILE]


def land_geometry():
    gj = json.load(open(PARISHES))
    return unary_union([shape(f['geometry']) for f in gj['features']])


def build_tile(tile, land_wgs84):
    out = os.path.join(BUILD, f'{tile}.tif')
    if os.path.exists(out):
        return out
    scenes = scenes_for(tile)
    print(f'{tile}: {len(scenes)} scenes', [f"{s['date']} {s['cloud']:.0f}%" for s in scenes], flush=True)
    if not scenes:
        return None
    first = f"/vsicurl/{BUCKET}/{scenes[0]['key']}/TCI.tif"
    with rasterio.open(first) as src:
        crs = src.crs
        land = shape(transform_geom('EPSG:4326', crs, mapping(land_wgs84))).buffer(COAST_BUFFER_M)
        tb = src.bounds
        lb = land.bounds
        bounds = (max(tb.left, lb[0]), max(tb.bottom, lb[1]), min(tb.right, lb[2]), min(tb.top, lb[3]))
        if bounds[0] >= bounds[2] or bounds[1] >= bounds[3]:
            return None
        w = int(round((bounds[2] - bounds[0]) / RES))
        h = int(round((bounds[3] - bounds[1]) / RES))
        transform = rasterio.transform.from_bounds(*bounds, w, h)
    keep = ~geometry_mask([mapping(land)], (h, w), transform)
    if not keep.any():
        return None

    stack, clear = [], []
    for s in scenes:
        try:
            with rasterio.open(f"/vsicurl/{BUCKET}/{s['key']}/TCI.tif") as t:
                win = from_bounds(*bounds, transform=t.transform)
                rgb = t.read(window=win, out_shape=(3, h, w), resampling=Resampling.average, boundless=True, fill_value=0)
            with rasterio.open(f"/vsicurl/{BUCKET}/{s['key']}/SCL.tif") as c:
                win = from_bounds(*bounds, transform=c.transform)
                scl = c.read(1, window=win, out_shape=(h, w), resampling=Resampling.nearest, boundless=True, fill_value=0)
        except Exception as e:  # noqa: BLE001
            print('  skip', s['date'], e, flush=True)
            continue
        ok = ~np.isin(scl, list(BAD_SCL)) & (rgb.sum(0) > 0)
        stack.append(rgb)
        clear.append(ok)
        print(f"  {s['date']}: {ok[keep].mean() * 100:.0f}% clear", flush=True)
    if not stack:
        return None
    rgb = np.stack(stack).astype(np.float32)          # n, 3, h, w
    ok = np.stack(clear)                              # n, h, w
    masked = np.where(ok[:, None], rgb, np.nan)
    with np.errstate(all='ignore'):
        med = np.nanmedian(masked, axis=0)            # 3, h, w
    # Nothing clear: fall back to the scene listed first (least cloudy overall) where it has data.
    hole = np.isnan(med[0])
    med[:, hole] = rgb[0][:, hole]
    print(f'  clear-sky coverage {(~hole[keep]).mean() * 100:.1f}%', flush=True)
    img = np.clip(med, 0, 255).astype(np.uint8)
    alpha = (keep & (img.sum(0) > 0)).astype(np.uint8) * 255
    profile = dict(driver='GTiff', width=w, height=h, count=4, dtype='uint8', crs=crs, transform=transform, compress='deflate', tiled=True, photometric='RGB')
    with rasterio.open(out, 'w', **profile) as dst:
        dst.write(img, [1, 2, 3])
        dst.write(alpha, 4)
        dst.colorinterp = [rasterio.enums.ColorInterp.red, rasterio.enums.ColorInterp.green, rasterio.enums.ColorInterp.blue, rasterio.enums.ColorInterp.alpha]
    return out


def merc(lng, lat):
    x = lng * 20037508.34 / 180
    y = math.log(math.tan((90 + lat) * math.pi / 360)) * 20037508.34 / math.pi
    return x, y


def tile_bounds(z, x, y):
    n = 2 ** z
    size = 2 * 20037508.34 / n
    left = -20037508.34 + x * size
    top = 20037508.34 - y * size
    return left, top - size, left + size, top


def tile_xy(z, lng, lat):
    n = 2 ** z
    r = math.radians(lat)
    return int((lng + 180) / 360 * n), int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n)


Z_RES = 2 * 20037508.34 / (256 * 2 ** MAXZOOM)  # Web Mercator metres per pixel at MAXZOOM


def to_mercator(path):
    """Reproject one grid tile to Web Mercator, snapped to the MAXZOOM pixel grid (done once, then cut)."""
    out = path.replace('.tif', '.3857.tif')
    if os.path.exists(out):
        return out
    from rasterio.warp import calculate_default_transform, reproject
    with rasterio.open(path) as src:
        _, w0, h0 = calculate_default_transform(src.crs, 'EPSG:3857', src.width, src.height, *src.bounds, resolution=Z_RES)
        l, b, r, t = rasterio.warp.transform_bounds(src.crs, 'EPSG:3857', *src.bounds)
        l = math.floor((l + 20037508.34) / Z_RES) * Z_RES - 20037508.34
        t = 20037508.34 - math.floor((20037508.34 - t) / Z_RES) * Z_RES
        w = int(math.ceil((r - l) / Z_RES))
        h = int(math.ceil((t - b) / Z_RES))
        transform = rasterio.transform.from_origin(l, t, Z_RES, Z_RES)
        profile = dict(driver='GTiff', width=w, height=h, count=4, dtype='uint8', crs='EPSG:3857', transform=transform, compress='deflate', tiled=True)
        with rasterio.open(out, 'w', **profile) as dst:
            for band in range(1, 5):
                reproject(rasterio.band(src, band), rasterio.band(dst, band), resampling=Resampling.bilinear, dst_nodata=0)
    return out


def cut_tiles(paths):
    W, S, E, N = -78.45, 17.65, -76.15, 18.58
    srcs = [rasterio.open(to_mercator(p)) for p in paths]
    tiles = {}
    for z in range(MINZOOM, MAXZOOM + 1):
        x0, y0 = tile_xy(z, W, N)
        x1, y1 = tile_xy(z, E, S)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                b = tile_bounds(z, x, y)
                canvas = np.zeros((4, 256, 256), dtype=np.float32)
                for v in srcs:
                    vb = v.bounds
                    if vb.right <= b[0] or vb.left >= b[2] or vb.top <= b[1] or vb.bottom >= b[3]:
                        continue
                    win = from_bounds(*b, transform=v.transform)
                    part = v.read(window=win, out_shape=(4, 256, 256), resampling=Resampling.average if z < MAXZOOM else Resampling.nearest, boundless=True, fill_value=0).astype(np.float32)
                    a = part[3:4] / 255
                    # Composite over what's there (grid tiles overlap at their edges).
                    canvas[:3] = part[:3] * a + canvas[:3] * (1 - a)
                    canvas[3:4] = np.maximum(canvas[3:4], part[3:4])
                if canvas[3].max() == 0:
                    continue
                im = Image.fromarray(np.moveaxis(canvas, 0, 2).astype(np.uint8), 'RGBA')
                buf = io.BytesIO()
                im.save(buf, 'WEBP', quality=72, method=6)
                tiles[zxy_to_tileid(z, x, y)] = buf.getvalue()
        print(f'z{z}: {len(tiles)} tiles so far, {sum(len(t) for t in tiles.values()) // 1024} KB', flush=True)
    return tiles


def main():
    os.makedirs(BUILD, exist_ok=True)
    land = land_geometry()
    paths = []
    for t in GRID:
        p = build_tile(t, land)
        if p:
            paths.append(p)
    tiles = cut_tiles(paths)
    out = os.path.join(HERE, 'build', 'jamaica-satellite.pmtiles')
    years = sorted({y for y, _ in SEASONS})
    with open(out, 'wb') as f:
        w = Writer(f)
        for tid in sorted(tiles):
            w.write_tile(tid, tiles[tid])
        w.finalize(
            {'tile_type': TileType.WEBP, 'tile_compression': Compression.NONE, 'min_zoom': MINZOOM, 'max_zoom': MAXZOOM,
             'min_lon_e7': int(-78.45e7), 'min_lat_e7': int(17.65e7), 'max_lon_e7': int(-76.15e7), 'max_lat_e7': int(18.58e7),
             'center_zoom': 9, 'center_lon_e7': int(-77.3e7), 'center_lat_e7': int(18.1e7)},
            {'attribution': f'Contains modified Copernicus Sentinel data {years[0]}–{years[-1]}', 'name': 'Jamaica Sentinel-2 mosaic'},
        )
    print('wrote', out, os.path.getsize(out) // 1024, 'KB,', len(tiles), 'tiles')


if __name__ == '__main__':
    sys.exit(main())
