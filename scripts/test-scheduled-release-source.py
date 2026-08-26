#!/usr/bin/env python3
"""Static safeguards for the central metadata-only scheduled release registry."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SCHEDULE_PATH = ROOT / "scheduled-releases.json"
SCHEDULE = json.loads(SCHEDULE_PATH.read_text(encoding="utf-8"))
DEFAULT_TIMEZONE = SCHEDULE.get("defaultTimezone", "Europe/London")
NOW = datetime.now(timezone.utc)

assert SCHEDULE.get("policy") == "metadata-only-no-media-identifiers"
assert DEFAULT_TIMEZONE == "Europe/London"
raw = SCHEDULE_PATH.read_text(encoding="utf-8")
assert not re.search(r"youtube\.com/watch\?v=[A-Za-z0-9_-]{6,20}", raw), "central schedule must not contain YouTube watch URLs"
assert not re.search(r"youtube-nocookie\.com/embed/[A-Za-z0-9_-]{6,20}", raw), "central schedule must not contain embed identifiers"

seen = set()
checked = 0
for item in SCHEDULE.get("releases", []):
    assert item.get("artist") and item.get("title") and item.get("group") and item.get("releaseLocal")
    assert item.get("artistPath") and item.get("releaseSlug")
    assert "releaseAt" not in item, "releaseAt is derived and must not be hand-maintained"
    assert "scheduleSource" not in item, "per-artist schedule sources are no longer allowed"
    assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", str(item["releaseSlug"])), f"invalid releaseSlug: {item['releaseSlug']}"
    assert str(item["artistPath"]).startswith("/artists/") and str(item["artistPath"]).endswith("/")

    key = (str(item["artist"]).casefold(), str(item["title"]).casefold())
    assert key not in seen, f"duplicate central schedule entry: {item['artist']} — {item['title']}"
    seen.add(key)

    local = datetime.fromisoformat(str(item["releaseLocal"]))
    assert local.tzinfo is None, "releaseLocal must be local wall time without an offset"
    zone_name = str(item.get("timezone") or DEFAULT_TIMEZONE)
    zone = ZoneInfo(zone_name)
    first = local.replace(tzinfo=zone, fold=0)
    second = local.replace(tzinfo=zone, fold=1)
    assert first.utcoffset() == second.utcoffset(), f"ambiguous scheduled local time: {item['releaseLocal']} {zone_name}"
    utc = first.astimezone(timezone.utc)
    assert utc.astimezone(zone).replace(tzinfo=None) == local, f"non-existent scheduled local time: {item['releaseLocal']} {zone_name}"

    artist_page = ROOT / str(item["artistPath"]).strip("/") / "index.html"
    assert artist_page.exists(), f"scheduled artist page is missing: {item['artistPath']}"
    checked += 1

print(f"Central scheduled-release source safety validated for {checked} registered release(s).")
