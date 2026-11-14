"""Save direct Horizons reference samples at two dates in the extended cache.
Sequential requests avoid concurrent load on the public NASA service.
"""
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request,urlopen
from datetime import datetime,timezone
import csv,json,time
ROOT=Path(__file__).resolve().parents[1]
DATES=['2027-04-14T07:30:00Z','2027-11-13T07:30:00Z']
JDS=[datetime.fromisoformat(t.replace('Z','+00:00')).timestamp()/86400+2440587.5 for t in DATES]
CASES=[(0,0,'sun'),(180,0,'sun'),(180,0,'earth'),(45,-60,'earth'),(30,-85,'earth'),(150,-88,'sun'),(150,-88,'earth'),(100,70,'earth'),(330,-20,'earth')]
rawfile=ROOT/'data'/'validation-extended-raw.json'
raws=json.loads(rawfile.read_text()) if rawfile.exists() else {}
results=[]
for lon,lat,body in CASES:
 params=dict(format='text',COMMAND="'10'" if body=='sun' else "'399'",CENTER="'coord@301'",COORD_TYPE="'GEODETIC'",SITE_COORD=f"'{lon},{lat},0'",MAKE_EPHEM="'YES'",EPHEM_TYPE="'OBSERVER'",OBJ_DATA="'NO'",TLIST="'"+','.join(map(str,JDS))+"'",TLIST_TYPE="'JD'",QUANTITIES="'4'",CSV_FORMAT="'YES'",TIME_DIGITS="'MINUTES'",APPARENT="'AIRLESS'")
 url='https://ssd.jpl.nasa.gov/api/horizons.api?'+urlencode(params)
 key=f'{body}_{lon}_{lat}'
 if key in raws:raw=raws[key]
 else:
  with urlopen(Request(url,headers={'User-Agent':'MIDAS-SpaceApps-student-prototype/1.0'}),timeout=45) as response:raw=response.read().decode()
  if '$$SOE' not in raw:raise RuntimeError(raw[:2000])
  raws[key]=raw;rawfile.write_text(json.dumps(raws,indent=2)+'\n')
  time.sleep(1)
 header=next(line for line in raw.splitlines() if 'Azi' in line and 'Elev' in line)
 names=[s.strip() for s in next(csv.reader([header]))]
 az=next(i for i,n in enumerate(names) if 'Azi' in n);el=next(i for i,n in enumerate(names) if 'Elev' in n)
 rows=[]
 for line in raw.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
  v=next(csv.reader([line]));stamp=datetime.strptime(v[0].strip()[:17],'%Y-%b-%d %H:%M').replace(tzinfo=timezone.utc).isoformat()
  rows.append(dict(time=stamp,azimuth=float(v[az]),elevation=float(v[el])))
 if len(rows)!=2:raise RuntimeError('Expected two reference timestamps')
 results.append(dict(site=dict(lat=lat,lon=lon),body=body,queryUrl=url,rawFile=str(rawfile.relative_to(ROOT))+'#'+key,rows=rows))
 print(body,lon,lat,'saved',flush=True)
fixture=dict(source='NASA/JPL Horizons direct surface observer',retrievedAt=datetime.now(timezone.utc).isoformat(),cases=results)
(ROOT/'tests'/'horizons-extended.json').write_text(json.dumps(fixture,indent=2)+'\n')
