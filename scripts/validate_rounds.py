"""Save direct Horizons surface-observer samples for VALIDATION.md rounds 1 and 2.

Round 1: 3 sites x 2 bodies x 11 dates at 00:00 UTC (66 comparisons).
Round 2: 9 site/body pairs x 10 dates at 07:30 UTC (90 comparisons).
One Horizons request per site and body, with all dates in TLIST.
Requests run sequentially. Cached raw responses are reused on rerun.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import csv, json, time

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "validation-rounds-raw.json"
FIXTURE = ROOT / "tests" / "validation-rounds.json"
START = datetime(2026, 11, 14, tzinfo=timezone.utc)

ROUNDS = {
    "round1": {
        "times": [(START + timedelta(days=3 * k)).replace(hour=0, minute=0) for k in range(11)],
        "cases": [(23.473, 0.674, "sun"), (23.473, 0.674, "earth"),
                  (0, -89, "sun"), (0, -89, "earth"),
                  (85, 0, "sun"), (85, 0, "earth")],
    },
    "round2": {
        "times": [(START + timedelta(days=3 * k)).replace(hour=7, minute=30) for k in range(10)],
        "cases": [(0, 0, "sun"), (180, 0, "sun"), (180, 0, "earth"),
                  (45, -60, "earth"), (30, -85, "earth"),
                  (150, -88, "sun"), (150, -88, "earth"),
                  (100, 70, "earth"), (330, -20, "earth")],
    },
}


def horizons(lon, lat, body, times):
    jds = [t.timestamp() / 86400 + 2440587.5 for t in times]
    params = dict(format="text", COMMAND="'10'" if body == "sun" else "'399'", CENTER="'coord@301'",
                  COORD_TYPE="'GEODETIC'", SITE_COORD=f"'{lon},{lat},0'", MAKE_EPHEM="'YES'",
                  EPHEM_TYPE="'OBSERVER'", OBJ_DATA="'NO'", TLIST="'" + ",".join(map(str, jds)) + "'",
                  TLIST_TYPE="'JD'", QUANTITIES="'4'", CSV_FORMAT="'YES'", TIME_DIGITS="'MINUTES'",
                  APPARENT="'AIRLESS'")
    url = "https://ssd.jpl.nasa.gov/api/horizons.api?" + urlencode(params)
    with urlopen(Request(url, headers={"User-Agent": "MIDAS-SpaceApps-student-prototype/1.0"}), timeout=60) as r:
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
    fixture = {"source": "NASA/JPL Horizons direct surface observer", "retrievedAt": datetime.now(timezone.utc).isoformat(), "rounds": {}}
    for name, spec in ROUNDS.items():
        cases = []
        for lon, lat, body in spec["cases"]:
            key = f"{name}_{body}_{lon}_{lat}"
            if key not in raws:
                url, raw = horizons(lon, lat, body, spec["times"])
                raws[key] = {"queryUrl": url, "raw": raw}
                RAW.write_text(json.dumps(raws, indent=2) + "\n")
                time.sleep(1)
            entry = raws[key]
            rows = parse(entry["raw"])
            if len(rows) != len(spec["times"]):
                raise RuntimeError(f"{key}: expected {len(spec['times'])} rows, got {len(rows)}")
            cases.append(dict(site=dict(lat=lat, lon=lon), body=body, queryUrl=entry["queryUrl"],
                              rawFile=str(RAW.relative_to(ROOT)) + "#" + key, rows=rows))
            print(key, "saved", flush=True)
        fixture["rounds"][name] = cases
    FIXTURE.write_text(json.dumps(fixture, indent=2) + "\n")


if __name__ == "__main__":
    main()
