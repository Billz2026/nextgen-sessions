#!/usr/bin/env python3
"""Verify Dean Lawson is embargoed until a validated Pop video is public."""
from __future__ import annotations

import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("dean", ROOT / "scripts/promote-dean-lawson.py")
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

NOW = datetime(2026, 10, 13, 12, 0, tzinfo=timezone.utc)
release = {
    "id": "y_gADQbXSho", "artist": "Dean Lawson", "title": "Dangerous Love",
    "group": "Pop", "contentType": "full-release",
    "durationSeconds": 260, "published": "2026-10-13T11:00:00Z",
}
assert not module.is_publicly_released([], NOW)
assert module.is_publicly_released([release], NOW)
assert not module.is_publicly_released([{**release, "group": "R&B & Soul"}], NOW)
assert not module.is_publicly_released([{**release, "id": "AAAAAAAAAAA"}], NOW)
assert not module.is_publicly_released([{**release, "durationSeconds": 25}], NOW)
assert not module.is_publicly_released([{**release, "published": "2026-10-14T11:00:00Z"}], NOW)

catalogue = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
live = module.is_publicly_released(catalogue.get("releases", []))
roster, _, _ = module.load_roster((ROOT / "artists.js").read_text(encoding="utf-8"))
visible = any(item.get("slug") == "dean-lawson" for item in roster)
page = ROOT / "artists/dean-lawson/index.html"
profile = ROOT / "artists/dean-lawson/profile.js"
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
if live:
    assert visible and page.is_file() and profile.is_file()
    assert 'data-static-profile="true"' in page.read_text(encoding="utf-8")
    assert '/artists/dean-lawson/' in (ROOT / "artists/index.html").read_text(encoding="utf-8")
    assert "https://nextgensessions.com/artists/dean-lawson/" in sitemap
else:
    assert not visible, "Unreleased Dean Lawson must stay off the public roster"
    assert not page.exists() and not profile.exists(), "Unreleased artist page must not be deployed"
    assert "/artists/dean-lawson/" not in sitemap, "Unreleased artist must not enter sitemap"
    assert "dean-lawson" not in (ROOT / "artists/index.html").read_text(encoding="utf-8"), "No advance artist card"
print("Dean Lawson release-triggered artist embargo verified.")
