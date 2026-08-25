#!/usr/bin/env python3
"""Static safeguards for metadata-only scheduled-release source files."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEDULE = json.loads((ROOT / "scheduled-releases.json").read_text(encoding="utf-8"))
NOW = datetime.now(timezone.utc)


def parse_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise AssertionError(f"releaseAt must include a timezone: {value}")
    return parsed.astimezone(timezone.utc)


checked = 0
for item in SCHEDULE.get("releases", []):
    release_at = parse_utc(str(item.get("releaseAt", "")))
    if NOW >= release_at:
        continue

    relative_source = str(item.get("scheduleSource", "")).strip("/")
    assert relative_source, f"Future scheduled release needs scheduleSource: {item.get('artist')} — {item.get('title')}"
    path = ROOT / relative_source
    assert path.exists(), f"Scheduled release source is missing: {relative_source}"
    source = path.read_text(encoding="utf-8")

    assert str(item["releaseAt"]) in source, f"scheduleSource does not contain releaseAt: {relative_source}"
    assert not re.search(r"youtube\.com/watch\?v=[A-Za-z0-9_-]{11}", source), (
        f"Scheduled source hardcodes a YouTube video ID in a watch URL: {relative_source}"
    )
    assert not re.search(r"youtube-nocookie\.com/embed/[A-Za-z0-9_-]{11}", source), (
        f"Scheduled source hardcodes a YouTube video ID in an embed URL: {relative_source}"
    )
    assert "releaseWindowOpen()" in source, f"Scheduled source lacks release-time gating: {relative_source}"
    assert "if (!releaseWindowOpen())" in source, f"Scheduled source does not default to locked state: {relative_source}"
    assert '/releases.json' in source, f"Scheduled source must obtain live media from the public catalogue: {relative_source}"
    checked += 1

print(f"Scheduled-release source safety validated for {checked} currently upcoming release(s).")
