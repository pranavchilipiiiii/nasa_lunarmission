"""Rebuild the checked-in NASA/JPL Horizons cache (Python standard library only)."""
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen, Request
import csv
import json
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
PARAMS = dict(format='text', COMMAND="'301'", CENTER="'500@399'",
              MAKE_EPHEM="'YES'", EPHEM_TYPE="'OBSERVER'", OBJ_DATA="'NO'",
              START_TIME="'2026-11-14 00:00'", STOP_TIME="'2027-11-14 00:00'",
              STEP_SIZE="'1h'", QUANTITIES="'14,15,20'", CSV_FORMAT="'YES'",
              TIME_DIGITS="'MINUTES'", RANGE_UNITS="'KM'")
url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urlencode(PARAMS)
with urlopen(Request(url, headers={'User-Agent': 'MIDAS-SpaceApps-student-prototype/1.0'}), timeout=90) as response:
    raw = response.read().decode()
if '$$SOE' not in raw or '$$EOE' not in raw:
    raise RuntimeError(raw[:2000])
out = ROOT / 'data'
out.mkdir(exist_ok=True)

headers = next(line for line in raw.splitlines() if 'ObsSub-LON' in line and 'SunSub-LON' in line)
names = [s.strip() for s in next(csv.reader([headers]))]
def column(name):
    return names.index(name)
rows = []
for line in raw.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
    values = next(csv.reader([line]))
    dt = datetime.strptime(values[0].strip(), '%Y-%b-%d %H:%M').replace(tzinfo=timezone.utc)
    rows.append([int(dt.timestamp()*1000)] + [float(values[column(name)]) for name in
                 ['ObsSub-LON', 'ObsSub-LAT', 'SunSub-LON', 'SunSub-LAT', 'delta']])
start=datetime.strptime(PARAMS['START_TIME'].strip("'"),'%Y-%m-%d %H:%M').replace(tzinfo=timezone.utc)
stop=datetime.strptime(PARAMS['STOP_TIME'].strip("'"),'%Y-%m-%d %H:%M').replace(tzinfo=timezone.utc)
expected=int((stop-start).total_seconds()/3600)+1
if len(rows) != expected or rows[0][0]!=int(start.timestamp()*1000) or rows[-1][0]!=int(stop.timestamp()*1000) or any(b[0]-a[0] != 3600000 for a,b in zip(rows,rows[1:])):
    raise RuntimeError('Incomplete or non-hourly Horizons data; existing cache kept')
(out / 'horizons-year-raw.txt').write_text(raw)
result = dict(source='NASA/JPL Horizons', queryUrl=url,
              retrievedAt=datetime.now(timezone.utc).isoformat(),
              frame='Horizons lunar mean-Earth reference surface; east-positive longitude',
              intervalMinutes=60, model='smooth sphere, radius 1737.4 km; Earth finite-distance correction',
              columns=['timeMs','earthLonDeg','earthLatDeg','sunLonDeg','sunLatDeg','earthDistanceKm'],
              rows=rows)
(out / 'ephemeris-year.json').write_text(json.dumps(result, separators=(',', ':'))+'\n')
print(f'Saved {len(rows)} hourly rows. Header: {headers}')
