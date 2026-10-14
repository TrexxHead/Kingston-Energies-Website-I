"""Build the map search index (places, peaks, bays, POIs, streets) with a parish for each entry."""
import json
from collections import defaultdict
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from shapely.ops import linemerge

par = json.load(open('../../public/maps/jamaica-parishes.geojson'))
polys = [shape(f['geometry']) for f in par['features']]
pids = [f['properties']['id'] for f in par['features']]
PIDS = ['kingston', 'st-andrew', 'st-thomas', 'portland', 'st-mary', 'st-ann', 'trelawny', 'st-james', 'hanover', 'westmoreland', 'st-elizabeth', 'manchester', 'clarendon', 'st-catherine']
tree = STRtree(polys)

def parish(pt):
    for i in tree.query(pt):
        if polys[i].contains(pt):
            return PIDS.index(pids[i])
    return PIDS.index(pids[tree.nearest(pt)])

rows = []
def add(name, kind, pt, cat=None):
    pt = Point(round(pt.x, 5), round(pt.y, 5))
    rows.append([name, kind, pt.x, pt.y, parish(pt)] + ([cat] if cat else []))

L = 'build/layers/'
for l in open(L + 'place.ndjson'):
    f = json.loads(l); p = f['properties']; add(p['name'], p['kind'], shape(f['geometry']))
for l in open(L + 'peak.ndjson'):
    f = json.loads(l); add(f['properties']['name'], 'peak', shape(f['geometry']))
for l in open(L + 'water_label.ndjson'):
    f = json.loads(l); add(f['properties']['name'], f['properties']['kind'], shape(f['geometry']))
for l in open(L + 'poi.ndjson'):
    f = json.loads(l); p = f['properties']; g = shape(f['geometry'])
    add(p['name'], 'poi:' + p['kind'], g if g.geom_type == 'Point' else g.representative_point(), (p.get('cat') or '').replace('_', ' '))

# Streets: same-name segments within ~2 km become one entry at their midpoint.
by = defaultdict(list)
for l in open(L + 'roads.ndjson'):
    f = json.loads(l); p = f['properties']
    if p.get('name') and p['kind'] not in ('footway', 'path', 'steps', 'track', 'service'):
        by[p['name']].append(shape(f['geometry']))
for name, gs in by.items():
    groups = []
    for g in gs:
        for gr in groups:
            if gr[0].distance(g) < 0.02:
                gr.append(g); break
        else:
            groups.append([g])
    for gr in groups:
        m = linemerge(gr) if len(gr) > 1 else gr[0]
        add(name, 'street', m.interpolate(0.5, normalized=True) if m.geom_type == 'LineString' else m.representative_point())

json.dump({'v': 1, 'parishes': PIDS, 'attribution': '© OpenStreetMap contributors, Overture Maps Foundation', 'rows': rows},
          open('build/jamaica-search.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(rows), 'entries')
