"""Cache primary lunar phases from the US Naval Observatory (UT calendar)."""
from pathlib import Path
from urllib.request import urlopen
from datetime import datetime,timezone
import json
root=Path(__file__).resolve().parents[1]
raw=[];events=[];urls=[]
for year in [2026,2027]:
 url=f'https://aa.usno.navy.mil/api/moon/phases/year?year={year}';urls.append(url)
 with urlopen(url,timeout=45) as response:record=json.load(response)
 if record.get('error') or not record.get('phasedata'):raise RuntimeError(record)
 raw.append(record)
 for row in record['phasedata']:
  stamp=datetime(row['year'],row['month'],row['day'],int(row['time'].split(':')[0]),int(row['time'].split(':')[1]),tzinfo=timezone.utc)
  events.append(dict(time=int(stamp.timestamp()*1000),phase=row['phase']))
(root/'data'/'lunar-phases.json').write_text(json.dumps(dict(source='US Naval Observatory',timeScale='UT; displayed alongside UTC at minute precision',retrievedAt=datetime.now(timezone.utc).isoformat(),queryUrls=urls,events=sorted(events,key=lambda e:e['time']),rawResponses=raw),indent=2)+'\n')
