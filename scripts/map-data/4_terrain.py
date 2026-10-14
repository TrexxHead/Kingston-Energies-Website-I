"""Download open elevation tiles (AWS Terrain Tiles, Terrarium) for Jamaica, z0–11, into one PMTiles file."""
import math, urllib.request, os, concurrent.futures as cf
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, TileType, Compression
W,S,E,N=-78.6,17.55,-76.0,18.7
def tile(z,lng,lat):
    n=2**z; x=int((lng+180)/360*n); r=math.radians(lat); y=int((1-math.log(math.tan(r)+1/math.cos(r))/math.pi)/2*n); return x,y
jobs=[]
for z in range(0,12):
    x0,y0=tile(z,W,N); x1,y1=tile(z,E,S)
    for x in range(x0,x1+1):
        for y in range(y0,y1+1): jobs.append((z,x,y))
print('tiles',len(jobs))
op=urllib.request.build_opener(urllib.request.ProxyHandler({'https':os.environ['HTTPS_PROXY']}))
def get(j):
    z,x,y=j
    for i in range(4):
        try: return j, op.open(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',timeout=30).read()
        except Exception as e: err=e
    raise err
data={}
with cf.ThreadPoolExecutor(16) as ex:
    for j,b in ex.map(get,jobs): data[zxy_to_tileid(*j)]=b
with open('build/jamaica-terrain.pmtiles','wb') as f:
    w=Writer(f)
    for tid in sorted(data): w.write_tile(tid,data[tid])
    w.finalize({'tile_type':TileType.PNG,'tile_compression':Compression.NONE,'min_zoom':0,'max_zoom':11,'min_lon_e7':int(W*1e7),'min_lat_e7':int(S*1e7),'max_lon_e7':int(E*1e7),'max_lat_e7':int(N*1e7),'center_zoom':8,'center_lon_e7':int(-77.3e7),'center_lat_e7':int(18.1e7)},
               {'attribution':'Terrain: Mapzen / AWS Terrain Tiles','encoding':'terrarium'})
print(os.path.getsize('build/jamaica-terrain.pmtiles'))
