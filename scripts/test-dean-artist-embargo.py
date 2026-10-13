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
# Prove that a verified public release creates the full artist profile without
# affecting the production website or using an unreleased YouTube link.
from tempfile import TemporaryDirectory
with TemporaryDirectory(prefix="nextgen-dean-release-test-") as temporary:
    fixture_root = Path(temporary)
    (fixture_root / "artists").mkdir()
    (fixture_root / "artists.js").write_text(
        (ROOT / "artists.js").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    (fixture_root / "sitemap.xml").write_text(
        (ROOT / "sitemap.xml").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    (fixture_root / "releases.json").write_text(
        json.dumps({
            "source": "curated-youtube-playlists",
            "releases": [{**release, "published": "2026-10-13T11:00:00Z"}],
        }),
        encoding="utf-8",
    )
    previous_root, previous_artist_dir = module.ROOT, module.ARTIST_DIR
    try:
        module.ROOT = fixture_root
        module.ARTIST_DIR = fixture_root / "artists" / "dean-lawson"
        module.main()
        module.main()  # Idempotence: retries must not duplicate the artist.
        new_roster, _, _ = module.load_roster(
            (fixture_root / "artists.js").read_text(encoding="utf-8")
        )
        assert sum(artist.get("slug") == "dean-lawson" for artist in new_roster) == 1
        assert (module.ARTIST_DIR / "index.html").is_file()
        assert "https://nextgensessions.com/assets/artists/dean-lawson-portrait.webp" in (module.ARTIST_DIR / "index.html").read_text(encoding="utf-8"), "Profile social card must use the clean portrait"
        assert (module.ARTIST_DIR / "profile.js").is_file()
        assert "Dean Lawson" in (module.ARTIST_DIR / "profile.js").read_text(encoding="utf-8")
        assert (fixture_root / "sitemap.xml").read_text(encoding="utf-8").count(
            "https://nextgensessions.com/artists/dean-lawson/"
        ) == 1
    finally:
        module.ROOT, module.ARTIST_DIR = previous_root, previous_artist_dir

workflow_source = (ROOT / ".github/workflows/update-catalogue.yml").read_text(encoding="utf-8")
assert "git add artists/" in workflow_source, "New artist pages would not reach production"
print("Dean Lawson release-triggered artist embargo and publication validated.")
