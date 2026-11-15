"""Save direct Horizons surface-observer samples for every catalog site across the year.

15 catalog sites x 2 bodies (Sun, Earth) x 12 dates x 2 times (00:00 and 07:30 UTC).
One Horizons request per site and body, with all 24 times in TLIST, so 30 requests.
Requests run sequentially. Cached raw responses are reused on rerun.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import csv, json, time

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "validation-catalog-raw.json"
FIXTURE = ROOT / "tests" / "validation-catalog.json"
SITES = json.loads((ROOT / "data" / "landing-sites.json").read_text())["sites"]
START = datetime(2026, 11, 14, tzinfo=timezone.utc)
DATES = [START + timedelta(days=k * 30 + 5) for k in range(12)]
TIMES = [t.replace(hour=h, minute=m) for t in DATES for h, m in ((0, 0), (7, 30))]


def horizons(lon, lat, body):
    jds = [t.timestamp() / 86400 + 2440587.5 for t in TIMES]
    params = dict(format="text", COMMAND="'10'" if body == "sun" else "'399'", CENTER="'coord@301'",
                  COORD_TYPE="'GEODETIC'", SITE_COORD=f"'{lon},{lat},0'", MAKE_EPHEM="'YES'",
                  EPHEM_TYPE="'OBSERVER'", OBJ_DATA="'NO'", TLIST="'" + ",".join(f"{j:.6f}" for j in jds) + "'",
                  TLIST_TYPE="'JD'", QUANTITIES="'4'", CSV_FORMAT="'YES'", TIME_DIGITS="'MINUTES'",
                  APPARENT="'AIRLESS'")
    url = "https://ssd.jpl.nasa.gov/api/horizons.api?" + urlencode(params)
    with urlopen(Request(url, headers={"User-Agent": "MIDAS-SpaceApps-student-prototype/1.0"}), timeout=90) as r:
        raw = r.read().decode()
    if "$$SOE" not in raw:
        raise RuntimeError(raw[:2000])
    return url, raw


def parse(raw):
    header = next(line for line in raw.splitlines() if "Azi" in line and "Elev" in line)
    names = [s.strip() for s in next(csv.reader([header]))]
    az = next(i for i, n in enumerate(names) if "Azi" in n)
    el = next(i for i, n in enumerate(names) if "Elev" in n)
    rows = []
    for line in raw.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines():
        v = next(csv.reader([line]))
        stamp = datetime.strptime(v[0].strip()[:17], "%Y-%b-%d %H:%M").replace(tzinfo=timezone.utc).isoformat()
        rows.append(dict(time=stamp, azimuth=float(v[az]), elevation=float(v[el])))
    return rows


def main():
    raws = json.loads(RAW.read_text()) if RAW.exists() else {}
    cases = []
    for site in SITES:
        lon, lat = site["lon"] % 360, site["lat"]
        for body in ("sun", "earth"):
            key = f"{site['name']}|{body}"
            if key not in raws:
                url, raw = horizons(lon, lat, body)
                raws[key] = {"queryUrl": url, "raw": raw}
                RAW.write_text(json.dumps(raws, indent=2) + "\n")
                time.sleep(1)
            rows = parse(raws[key]["raw"])
            if len(rows) != len(TIMES):
                raise RuntimeError(f"{key}: expected {len(TIMES)} rows, got {len(rows)}")
            cases.append(dict(name=site["name"], site=dict(lat=lat, lon=lon), body=body,
                              queryUrl=raws[key]["queryUrl"], rawFile=str(RAW.relative_to(ROOT)) + "#" + key, rows=rows))
            print(key, "saved", flush=True)
    FIXTURE.write_text(json.dumps({"source": "NASA/JPL Horizons direct surface observer",
                                   "retrievedAt": datetime.now(timezone.utc).isoformat(),
                                   "cases": cases}, indent=2) + "\n")
    print("wrote", FIXTURE.name, len(cases), "cases", flush=True)


if __name__ == "__main__":
    main()
