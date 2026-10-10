"""Download electrician wages and parts price indexes from the BLS public API.

    python -m src.bls --metro 0012420 --metro 0035620

Writes data/bls.json. The v1 API needs no key but allows about 25 requests a
day; set BLS_API_KEY to use v2 (500 a day). Wages are OEWS annual estimates for
SOC 47-2111 (Electricians); price indexes are the PPI series in
catalog/ppi_series.json.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "bls.json"
ELECTRICIANS = "472111"
# OEWS datatype codes: 03 hourly mean, 08 hourly median.
WAGE_TYPES = {"03": "hourly_mean", "08": "hourly_median"}


def oews_series(area: str | None, datatype: str) -> str:
    # OEU + N/M + area(7) + industry(6) + occupation(6) + datatype(2)
    if area is None:
        return f"OEUN0000000000000{ELECTRICIANS}{datatype}"
    return f"OEUM{area}000000{ELECTRICIANS}{datatype}"


def fetch(series: list[str], start_year: int, end_year: int) -> dict[str, list[dict]]:
    key = os.environ.get("BLS_API_KEY")
    url = f"https://api.bls.gov/publicAPI/{'v2' if key else 'v1'}/timeseries/data/"
    body: dict = {"seriesid": series, "startyear": str(start_year), "endyear": str(end_year)}
    if key:
        body["registrationkey"] = key
    out: dict[str, list[dict]] = {}
    # The API caps series per request (25 on v1, 50 on v2).
    step = 50 if key else 25
    for i in range(0, len(series), step):
        body["seriesid"] = series[i : i + step]
        r = requests.post(url, json=body, timeout=60)
        r.raise_for_status()
        payload = r.json()
        if payload.get("status") != "REQUEST_SUCCEEDED":
            raise RuntimeError(f"BLS error: {payload.get('message')}")
        for s in payload["Results"]["series"]:
            out[s["seriesID"]] = s["data"]
    return out


def latest(points: list[dict]) -> dict | None:
    return points[0] if points else None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--metro", action="append", default=[], help="7-digit OEWS metro area code, e.g. 0012420 (Austin)")
    args = ap.parse_args()

    now = datetime.now(timezone.utc).year
    ppi = json.loads((ROOT / "catalog" / "ppi_series.json").read_text(encoding="utf-8"))
    ppi = {k: v for k, v in ppi.items() if not k.startswith("_")}

    areas: list[str | None] = [None, *args.metro]
    wage_ids = {(a, dt): oews_series(a, dt) for a in areas for dt in WAGE_TYPES}
    raw = fetch([*wage_ids.values(), *(v["series"] for v in ppi.values())], now - 2, now)

    wages: dict[str, dict] = {}
    for (area, dt), sid in wage_ids.items():
        point = latest(raw.get(sid, []))
        entry = wages.setdefault(area or "national", {})
        if point:
            entry[WAGE_TYPES[dt]] = float(point["value"])
            entry["year"] = int(point["year"])
            entry.setdefault("series", []).append(sid)

    indexes: dict[str, dict] = {}
    for category, info in ppi.items():
        points = raw.get(info["series"], [])
        indexes[category] = {
            "series": info["series"],
            "title": info["title"],
            # "2026-08" -> index value, newest first as BLS returns them.
            "values": {
                f"{p['year']}-{p['period'][1:]}": float(p["value"])
                for p in points
                if p["period"].startswith("M") and p["period"] != "M13" and p["value"] not in ("-", "")
            },
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(encoding="utf-8", data=
        json.dumps(
            {
                "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "source": "U.S. Bureau of Labor Statistics (OEWS, PPI)",
                "electrician_wages": wages,
                "ppi": indexes,
            },
            indent=2,
        )
    )
    for area, w in wages.items():
        print(f"wages {area}: {w}")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
