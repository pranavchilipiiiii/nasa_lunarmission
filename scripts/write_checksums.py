"""Write SHA-256 checksums for every cached data file the site loads or the tests read."""
from hashlib import sha256
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
FILES = sorted(p for p in (ROOT / "data").glob("*.json") if p.is_file()) + [ROOT / "data" / "horizons-raw.txt", ROOT / "data" / "horizons-year-raw.txt"]
out = {}
for path in FILES:
    if path.exists():
        out[str(path.relative_to(ROOT))] = sha256(path.read_bytes()).hexdigest()
(ROOT / "data" / "checksums.json").write_text(json.dumps(out, indent=2, sort_keys=True) + "\n")
print(f"wrote {len(out)} checksums")
