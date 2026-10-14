"""Extract Jamaica from the Overture Maps release on S3 (anonymous) into build/out/*.ndjson.

Usage: python 1_extract_overture.py division water land_use land_cover land infrastructure segment place building
"""
import pyarrow.dataset as ds, pyarrow.fs as pfs, pyarrow.compute as pc, json, os, sys, time
from shapely import wkb
from shapely.geometry import mapping
R='overturemaps-us-west-2/release/2026-09-23.1'
W,S,E,N=-78.45,17.65,-76.15,18.6
s3=pfs.S3FileSystem(anonymous=True, region='us-west-2', proxy_options=os.environ.get('HTTPS_PROXY'))
def f(field): return pc.field('bbox', field)
flt=(pc.field(('bbox','xmax'))>=W)&(pc.field(('bbox','xmin'))<=E)&(pc.field(('bbox','ymax'))>=S)&(pc.field(('bbox','ymin'))<=N)
def run(theme, typ, cols, props, extra=None):
    t=time.time()
    d=ds.dataset(f'{R}/theme={theme}/type={typ}', filesystem=s3, format='parquet')
    fl=flt if extra is None else flt&extra
    n=0
    with open(f'./build/out/{typ}.ndjson','w') as o:
        for b in d.to_batches(columns=['geometry']+cols, filter=fl, batch_size=20000):
            rows=b.to_pylist()
            for r in rows:
                g=wkb.loads(r['geometry'])
                p=props(r)
                if p is None: continue
                o.write(json.dumps({'type':'Feature','properties':p,'geometry':mapping(g)},separators=(',',':'))+'\n'); n+=1
    print(typ, n, round(time.time()-t), 's', flush=True)
nm=lambda r: (r.get('names') or {}).get('primary')
def seg(r):
    refs=[x.get('ref') for x in (r.get('routes') or []) if x and x.get('ref')]
    return {'subtype':r['subtype'],'class':r.get('class'),'subclass':r.get('subclass'),'name':nm(r),'ref':refs[0] if refs else None}
def place(r):
    if not nm(r) or (r.get('confidence') or 0)<0.7 or r.get('operating_status') not in (None,'open'): return None
    countries={a.get('country') for a in (r.get('addresses') or []) if a and a.get('country')}
    if countries and 'JM' not in countries: return None
    return {'name':nm(r),'cat':(r.get('taxonomy') or {}).get('primary'),'basic':r.get('basic_category'),'conf':r.get('confidence'),'cc':','.join(sorted(countries)) or None}
jobs={
 'division':lambda: run('divisions','division',['subtype','class','names','population','country'], lambda r: {'subtype':r['subtype'],'class':r.get('class'),'name':nm(r),'population':r.get('population')} if r.get('country') in ('JM',None) else None),
 'water':lambda: run('base','water',['subtype','class','names','is_salt'], lambda r: {'subtype':r['subtype'],'class':r.get('class'),'name':nm(r),'salt':r.get('is_salt')}),
 'land_use':lambda: run('base','land_use',['subtype','class','names'], lambda r: {'subtype':r['subtype'],'class':r.get('class'),'name':nm(r)}),
 'land_cover':lambda: run('base','land_cover',['subtype'], lambda r: {'subtype':r['subtype']}),
 'land':lambda: run('base','land',['subtype','class','names'], lambda r: {'subtype':r['subtype'],'class':r.get('class'),'name':nm(r)}),
 'infrastructure':lambda: run('base','infrastructure',['subtype','class','names'], lambda r: {'subtype':r['subtype'],'class':r.get('class'),'name':nm(r)}),
 'segment':lambda: run('transportation','segment',['subtype','class','subclass','names','routes'], seg),
 'place':lambda: run('places','place',['names','taxonomy','confidence','basic_category','operating_status','addresses'], place),
 'building':lambda: run('buildings','building',['height','num_floors','class'], lambda r: {'h':r.get('height'),'floors':r.get('num_floors'),'class':r.get('class')}),
}
for k in sys.argv[1:]:
    try: jobs[k]()
    except Exception as e: print('FAIL',k,repr(e)[:300], flush=True)
