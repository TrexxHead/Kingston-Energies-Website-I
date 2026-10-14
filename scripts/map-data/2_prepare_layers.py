"""Turn the Overture extract into map layers (build/layers/*.ndjson) with per-feature zoom levels."""
import json,sys
O='./build/out/'; L='./build/layers/'
def feats(name):
    for l in open(O+name+'.ndjson'): yield json.loads(l)
outs={}
def emit(layer, f, props, minz, maxz=None):
    if layer not in outs: outs[layer]=open(L+layer+'.ndjson','w')
    t={'layer':layer,'minzoom':min(minz,14)}
    if maxz is not None: t['maxzoom']=maxz
    props={k:v for k,v in props.items() if v is not None}
    outs[layer].write(json.dumps({'type':'Feature','tippecanoe':t,'properties':props,'geometry':f['geometry']},separators=(',',':'))+'\n')
# land / earth
for f in feats('land'):
    p=f['properties']; g=f['geometry']['type']
    if p['subtype']=='land' and 'Polygon' in g: emit('earth',f,{},0)
    elif p['class']=='peak' and g=='Point' and p.get('name'): emit('peak',f,{'name':p['name']},11)
    elif p['class']=='beach' and 'Polygon' in g: emit('landcover',f,{'kind':'sand'},11)
    elif p['subtype'] in ('forest',) and 'Polygon' in g: emit('landcover',f,{'kind':'forest'},10)
    elif p['subtype']=='grass' and 'Polygon' in g: emit('landcover',f,{'kind':'grass'},11)
    elif p['subtype']=='wetland' and 'Polygon' in g: emit('landcover',f,{'kind':'wetland'},10)
for f in feats('land_cover'):
    k={'forest':'forest','shrub':'shrub','grass':'grass','crop':'farmland','wetland':'wetland','mangrove':'wetland','barren':'barren','urban':'urban'}.get(f['properties']['subtype'])
    if k: emit('landcover',f,{'kind':k},5,12)
LU={'residential':'residential','developed':None,'park':'park','recreation':'pitch','education':'school','medical':'hospital','cemetery':'cemetery','golf':'golf','agriculture':'farmland','managed':'grass','resource_extraction':'industrial','horticulture':'garden','military':'military','transportation':'transport','aerodrome':'airport','religious':'religious','entertainment':'pitch','protected':'protected','campground':'park','pedestrian':'pedestrian'}
for f in feats('land_use'):
    p=f['properties']
    if 'Polygon' not in f['geometry']['type']: continue
    k=LU.get(p['subtype'],'other')
    if p['subtype']=='developed': k={'industrial':'industrial','commercial':'commercial','retail':'commercial'}.get(p['class'],'commercial')
    if p['class'] in ('aerodrome','airport'): k='airport'
    if k=='protected': emit('landuse',f,{'kind':k,'name':p.get('name')},7); continue
    emit('landuse',f,{'kind':k,'name':p.get('name')},10 if k in ('residential','farmland','park','airport','golf') else 12)
# water
for f in feats('water'):
    p=f['properties']; g=f['geometry']['type']
    if 'Polygon' in g:
        if p['class']=='swimming_pool': emit('water',f,{'kind':'pool'},15); continue
        emit('water',f,{'kind':p['subtype'],'name':p.get('name')},6 if p['subtype'] in ('lake','reservoir','ocean','water') else 10)
    elif 'LineString' in g:
        k=p['subtype']
        emit('waterway',f,{'kind':k,'name':p.get('name')},9 if k=='river' else 12)
    elif g=='Point' and p.get('name') and p['class'] in ('bay','waterfall'):
        emit('water_label',f,{'kind':p['class'],'name':p['name']},10 if p['class']=='bay' else 12)
# roads
RZ={'motorway':5,'trunk':6,'primary':7,'secondary':8,'tertiary':10,'unclassified':11,'residential':12,'living_street':13,'service':13,'track':13,'pedestrian':14,'footway':14,'path':14,'steps':15,'cycleway':14,'bridleway':15}
for f in feats('segment'):
    p=f['properties']
    if p['subtype']=='rail': emit('rail',f,{'kind':'rail'},10); continue
    if p['subtype']!='road': continue
    c=p['class'] or 'unknown'
    if c=='unknown': continue
    emit('roads',f,{'kind':c,'name':p.get('name')},RZ.get(c,13))
# infrastructure
for f in feats('infrastructure'):
    p=f['properties']; g=f['geometry']['type']
    if p['class'] in ('pier','breakwater') and g!='Point': emit('pier',f,{},13)
    elif p['subtype']=='airport' and 'LineString' in g: emit('aeroway',f,{'kind':p['class']},11)
    elif p['subtype']=='airport' and 'Polygon' in g: emit('aeroway',f,{'kind':p['class']},11)
# labels: places (localities)
PZ={'city':6,'town':8,'village':11,'hamlet':13}
for f in feats('division'):
    p=f['properties']
    if f['geometry']['type']!='Point' or not p.get('name'): continue
    if p['subtype']=='locality': emit('place',f,{'kind':p['class'] or 'village','name':p['name'],'pop':p.get('population')},PZ.get(p['class'],12))
    elif p['subtype'] in ('macrohood','neighborhood','microhood'): emit('place',f,{'kind':'neighbourhood','name':p['name']},12 if p['subtype']=='macrohood' else 14)
# POIs
KIND=[('ev_charging','EXCLUDE'),('charging','EXCLUDE'),('airport','airport'),('hospital','health'),('pharmacy','health'),('dental','health'),('clinic','health'),('doctor','health'),('medical','health'),
 ('restaurant','food'),('cafe','food'),('bar','food'),('bakery','food'),('food_court','food'),('hotel','stay'),('lodging','stay'),('resort','stay'),('guest','stay'),
 ('gas_station','fuel'),('bank','bank'),('atm','bank'),('financial','bank'),('learning','edu'),('school','edu'),('college','edu'),('university','edu'),
 ('worship','worship'),('religious','worship'),('mall','shop'),('store','shop'),('shopping','shop'),('supermarket','shop'),('market','shop'),
 ('government','gov'),('police','gov'),('fire_station','gov'),('post_office','gov'),('historic','attraction'),('museum','attraction'),('landmark','attraction'),('arts','attraction'),('tourist','attraction'),('beach','park'),('park','park'),('garden','park'),
 ('auto','auto'),('vehicle','auto'),('bus_station','transport'),('ferry','transport')]
IMPORTANT={'airport','health_hospital','shopping_mall','college_university','resort','historic_site','beach','park','hotel','museum'}
from shapely.geometry import shape as _shape
from shapely.ops import unary_union as _union
from shapely.strtree import STRtree as _Tree
_coast=_union([_shape(f['geometry']).buffer(0) for f in feats('land') if f['properties']['subtype']=='land' and 'Polygon' in f['geometry']['type'] and _shape(f['geometry']).intersects(_shape({'type':'Polygon','coordinates':[[[-78.6,17.6],[-76.0,17.6],[-76.0,18.7],[-78.6,18.7],[-78.6,17.6]]]}))]).boundary
def coastal(f): return _coast.distance(_shape(f['geometry']))<0.004  # ~400 m
n=0
for f in feats('place'):
    p=f['properties']; b=(p.get('basic') or p.get('cat') or '')
    cat=(p.get('cat') or '')
    if 'charging' in b or 'charging' in cat: continue
    kind=next((k for key,k in KIND if key in b or key in cat),'place')
    if kind=='EXCLUDE': continue
    # Beach listings are only trusted on the coast (some are mis-geocoded inland).
    if (b=='beach' or cat=='beach') and not coastal(f): continue
    imp = b in ('airport','hospital','shopping_mall','college_university','resort','museum','beach') or 'airport' in cat
    emit('poi',f,{'kind':kind,'name':p['name'],'cat':b or cat,'rank':1 if imp else 2},13 if imp else 15); n+=1
print('pois',n)
for o in outs.values(): o.close()
