"""Clip land to the Jamaica area, build the sea mask, then tile with tippecanoe.

Needs a tippecanoe binary (https://github.com/felt/tippecanoe) on PATH or in $TIPPECANOE.
Writes build/jamaica-base.pmtiles and build/jamaica-buildings.pmtiles.
"""
import json, os, subprocess, glob
from shapely.geometry import shape, box, mapping
from shapely.ops import unary_union

T = os.environ.get('TIPPECANOE', 'tippecanoe')
B = box(-79.2, 17.0, -75.4, 19.3)

# Land polygons can belong to Cuba/Haiti too — keep only the area around Jamaica.
out = []
for l in open('build/layers/earth.ndjson'):
    f = json.loads(l)
    g = shape(f['geometry']).buffer(0).intersection(B)
    if not g.is_empty:
        f['geometry'] = mapping(g)
        out.append(f)
open('build/layers/earth.ndjson', 'w').write(''.join(json.dumps(f) + '\n' for f in out))

# Sea = area minus land; drawn above hill shading so sea-floor relief never shows.
sea = B.difference(unary_union([shape(f['geometry']) for f in out]))
open('build/layers/ocean.ndjson', 'w').write(json.dumps({'type': 'Feature', 'tippecanoe': {'layer': 'ocean', 'minzoom': 0}, 'properties': {}, 'geometry': mapping(sea)}) + '\n')

with open('build/base.ndjson', 'w') as o:
    for f in sorted(glob.glob('build/layers/*.ndjson')):
        o.write(open(f).read())
subprocess.run([T, '-q', '-o', 'build/jamaica-base.pmtiles', '--force', '-Z0', '-z14', '-P', '--no-tile-size-limit', '--no-feature-limit',
                '--simplification=6', '--simplify-only-low-zooms', '--detect-shared-borders', '--name=Kingston Energies Jamaica',
                '--attribution=© OpenStreetMap contributors, Overture Maps Foundation', 'build/base.ndjson'], check=True)

# Buildings: one detailed zoom (14); MapLibre over-zooms from it.
with open('build/buildings.ndjson', 'w') as o:
    for l in open('build/out/building.ndjson'):
        f = json.loads(l); p = f['properties']
        h = p.get('h') or (p['floors'] * 3.2 if p.get('floors') else None)
        o.write(json.dumps({'type': 'Feature', 'tippecanoe': {'layer': 'buildings', 'minzoom': 14}, 'properties': {'h': round(h, 1)} if h else {}, 'geometry': f['geometry']}, separators=(',', ':')) + '\n')
subprocess.run([T, '-q', '-o', 'build/jamaica-buildings.pmtiles', '--force', '-Z14', '-z14', '--simplification=2', '--no-tile-size-limit',
                '--no-feature-limit', '-l', 'buildings', 'build/buildings.ndjson'], check=True)
print('tiled')
