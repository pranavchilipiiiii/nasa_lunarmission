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
              START_TIME="'2026-11-14 00:00'", STOP_TIME="'2026-12-14 00:00'",
              STEP_SIZE="'1h'", QUANTITIES="'14,15,20'", CSV_FORMAT="'YES'",
              TIME_DIGITS="'MINUTES'", RANGE_UNITS="'KM'")
url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urlencode(PARAMS)
with urlopen(Request(url, headers={'User-Agent': 'MIDAS-SpaceApps-student-prototype/1.0'}), timeout=90) as response:
    raw = response.read().decode()
if '$$SOE' not in raw or '$$EOE' not in raw:
    raise RuntimeError(raw[:2000])
out = ROOT / 'data'
out.mkdir(exist_ok=True)
(out / 'horizons-raw.txt').write_text(raw)
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
result = dict(source='NASA/JPL Horizons', queryUrl=url,
              retrievedAt=datetime.now(timezone.utc).isoformat(),
              frame='Horizons lunar mean-Earth reference surface; east-positive longitude',
              intervalMinutes=60, model='smooth sphere, radius 1737.4 km; Earth finite-distance correction',
              columns=['timeMs','earthLonDeg','earthLatDeg','sunLonDeg','sunLatDeg','earthDistanceKm'],
              rows=rows)
(out / 'ephemeris.json').write_text(json.dumps(result, separators=(',', ':'))+'\n')
print(f'Saved {len(rows)} hourly rows. Header: {headers}')
