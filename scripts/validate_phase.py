"""Save direct NASA illuminated-percentage samples for the phase approximation."""
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode
from datetime import datetime,timezone
import csv,json
root=Path(__file__).resolve().parents[1]
params=dict(format='text',COMMAND="'301'",CENTER="'500@399'",MAKE_EPHEM="'YES'",EPHEM_TYPE="'OBSERVER'",OBJ_DATA="'NO'",START_TIME="'2026-11-14 00:00'",STOP_TIME="'2026-12-14 00:00'",STEP_SIZE="'5d'",QUANTITIES="'10'",CSV_FORMAT="'YES'",TIME_DIGITS="'MINUTES'")
url='https://ssd.jpl.nasa.gov/api/horizons.api?'+urlencode(params)
with urlopen(url,timeout=45) as response:raw=response.read().decode()
if '$$SOE' not in raw:raise RuntimeError(raw[:1000])
header=next(line for line in raw.splitlines() if 'Illu%' in line);names=[s.strip() for s in next(csv.reader([header]))];column=names.index('Illu%')
rows=[]
for line in raw.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
 v=next(csv.reader([line]));t=datetime.strptime(v[0].strip()[:17],'%Y-%b-%d %H:%M').replace(tzinfo=timezone.utc)
 rows.append(dict(time=int(t.timestamp()*1000),percent=float(v[column])))
(root/'tests'/'lunar-phase-reference.json').write_text(json.dumps(dict(queryUrl=url,retrievedAt=datetime.now(timezone.utc).isoformat(),rows=rows,raw=raw),indent=2)+'\n')
print('Saved',len(rows),'NASA illumination samples')
