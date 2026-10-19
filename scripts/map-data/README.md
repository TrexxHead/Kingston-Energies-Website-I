# Jamaica map data (Kingston Energies map)

Builds the self-hosted files in `public/maps/data/` that the Kingston Energies map reads
(see `lib/map/mapData.ts`). Run from this folder; outputs go to `./build/` (gitignored).

```bash
pip install pyarrow shapely pmtiles
mkdir -p build/out build/layers
python 1_extract_overture.py division water land_use land_cover land infrastructure segment place building
python 2_prepare_layers.py
TIPPECANOE=/path/to/tippecanoe python 3_clip_and_tile.py   # build tippecanoe from github.com/felt/tippecanoe
python 4_terrain.py
python 5_search_index.py
pip install rasterio numpy mgrs packaging pillow   # for the satellite mosaic
python 6_satellite.py                              # ~15 min, reads Sentinel-2 COGs from AWS
```

Then copy into `public/maps/data/` under **new versioned names** and update `lib/map/mapData.ts`
(the files are cached for a year):

| build output | public file |
|---|---|
| `jamaica-base.pmtiles` | `jamaica-base-YYYY-MM.pmtiles` |
| `jamaica-buildings.pmtiles` | `jamaica-buildings-YYYY-MM.pmtiles` |
| `jamaica-terrain.pmtiles` | `jamaica-terrain-vN.pmtiles` (rarely changes) |
| `jamaica-search.json` | `jamaica-search-YYYY-MM.json` |
| `jamaica-satellite.pmtiles` | `jamaica-satellite-YYYY-rN.pmtiles` |

**Sources and licences** (attribution is shown on the map):
- Overture Maps Foundation, release set in `1_extract_overture.py` — transportation, base, divisions and
  buildings are derived from OpenStreetMap (ODbL); places are CDLA-Permissive-2.0.
- AWS Terrain Tiles (Mapzen/Tilezen and the sources listed in their attribution).
- Copernicus Sentinel-2 L2A (ESA/EU), via the AWS open-data `sentinel-cogs` bucket — free and open incl. commercial use; attribution “Contains modified Copernicus Sentinel data”. Mosaic: dry-season scenes Dec 2023–Apr 2025, cloud-masked median, z8–13 (10–20 m data, so it fades out past z14 on the map).
- Fonts in `public/maps/fonts`: Open Sans (Apache 2.0).

Charging points from OSM/Overture are deliberately excluded — only the verified Kingston Energies
registry shows chargers.
