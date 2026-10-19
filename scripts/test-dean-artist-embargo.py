#!/usr/bin/env python3
"""Dean Lawson's artist profile is public, while Dangerous Love stays embargoed."""
from __future__ import annotations

import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("dean", ROOT / "scripts/promote-dean-lawson.py")
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

NOW = datetime(2026, 10, 13, 12, 0, tzinfo=timezone.utc)
release = {
    "id": "y_gADQbXSho",
    "artist": "Dean Lawson",
    "title": "Dangerous Love",
    "group": "Pop",
    "contentType": "full-release",
    "durationSeconds": 260,
    "published": "2026-10-13T11:00:00Z",
}
assert not module.is_publicly_released([], NOW)
assert module.is_publicly_released([release], NOW)
assert module.is_publicly_released([{**release, "title": "Dangerous Love (MCDS Riddim)"}], NOW)
assert not module.is_publicly_released([{**release, "title": "Dangerous Love (MCDS Riddim)", "published": "2026-10-14T11:00:00Z"}], NOW)
assert not module.is_publicly_released([{**release, "title": "Dangerous Love (Unverified Edit)"}], NOW)
assert not module.is_publicly_released([{**release, "group": "R&B & Soul"}], NOW)
assert not module.is_publicly_released([{**release, "id": "AAAAAAAAAAA"}], NOW)
assert not module.is_publicly_released([{**release, "durationSeconds": 25}], NOW)
assert not module.is_publicly_released([{**release, "published": "2026-10-14T11:00:00Z"}], NOW)

portrait_path = ROOT / "assets/artists/dean-lawson-portrait.webp"
assert portrait_path.is_file() and portrait_path.stat().st_size > 10000, "Approved clean portrait missing"

# Validate today's real generated output and its exact embargo status.
catalogue = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
live = module.is_publicly_released(catalogue.get("releases", []))
roster, _, _ = module.load_roster((ROOT / "artists.js").read_text(encoding="utf-8"))
assert sum(item.get("slug") == "dean-lawson" for item in roster) == 1
page = ROOT / "artists/dean-lawson/index.html"
profile = ROOT / "artists/dean-lawson/profile.js"
assert page.is_file() and profile.is_file()
html = page.read_text(encoding="utf-8")
profile_source = profile.read_text(encoding="utf-8")
assert 'data-static-profile="true"' in html, "Artist profile must be visible and crawlable"
assert "Dean Lawson" in html and 'src="/assets/artists/dean-lawson-portrait.webp"' in html
assert "https://nextgensessions.com/assets/artists/dean-lawson-portrait.webp" in html
assert '/artists/dean-lawson/' in (ROOT / "artists/index.html").read_text(encoding="utf-8")
assert "https://nextgensessions.com/artists/dean-lawson/" in (ROOT / "sitemap.xml").read_text(encoding="utf-8")
assert "Dean Lawson" in (ROOT / "artists.js").read_text(encoding="utf-8")
assert '<script src="/artist-profile.js"' not in html, "Dynamic player must not insert upcoming videos"
if live:
    assert "Dangerous Love" in html
    assert "y_gADQbXSho" in html
    assert "y_gADQbXSho" in profile_source
    assert 'src="https://www.youtube-nocookie.com/embed/y_gADQbXSho?rel=0"' in html, "Verified Dean Lawson release must be playable on his profile"
    assert 'href="#featured-release">▶ Play here</a>' in html, "Profile track card must link to its in-page player"
    verified_title = next(item["title"] for item in catalogue["releases"] if module.is_publicly_released([item]))
    assert json.dumps(verified_title) in profile_source, "Profile featured title must match the verified public song"
else:
    assert "youtube-nocookie.com/embed/y_gADQbXSho" not in html, "Scheduled player leaked before release"
    assert "Dangerous Love" not in html, "Song title leaked before public release"
    assert "y_gADQbXSho" not in html, "Scheduled video ID leaked in HTML"
    assert "Dangerous Love" not in profile_source, "Song title leaked in client-side profile"
    assert "y_gADQbXSho" not in profile_source, "Scheduled video ID leaked in client-side profile"

# Simulate both states in isolation, including repeat runs and the live transition.
with TemporaryDirectory(prefix="nextgen-dean-profile-test-") as temporary:
    fixture_root = Path(temporary)
    (fixture_root / "artists").mkdir()
    roster_base = (ROOT / "artists.js").read_text(encoding="utf-8")
    sitemap_base = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    (fixture_root / "artists.js").write_text(roster_base, encoding="utf-8")
    (fixture_root / "sitemap.xml").write_text(sitemap_base, encoding="utf-8")
    catalogue_path = fixture_root / "releases.json"
    catalogue_path.write_text(
        json.dumps({"source": "curated-youtube-playlists", "releases": []}),
        encoding="utf-8",
    )
    prior_root, prior_artist_dir = module.ROOT, module.ARTIST_DIR
    try:
        module.ROOT = fixture_root
        module.ARTIST_DIR = fixture_root / "artists" / "dean-lawson"
        module.main()
        module.main()
        early = (module.ARTIST_DIR / "profile.js").read_text(encoding="utf-8")
        early_shell = (module.ARTIST_DIR / "index.html").read_text(encoding="utf-8")
        assert "Dean Lawson" in early and "Dangerous Love" not in early
        assert "y_gADQbXSho" not in early
        assert "Dangerous Love" not in early_shell and "y_gADQbXSho" not in early_shell
        assert '<script src="/artist-profile.js"' not in early_shell
        catalogue_path.write_text(
            json.dumps({"source": "curated-youtube-playlists", "releases": [release]}),
            encoding="utf-8",
        )
        module.main()
        later = (module.ARTIST_DIR / "profile.js").read_text(encoding="utf-8")
        assert "Dangerous Love" in later and "y_gADQbXSho" in later
        fixture_roster, _, _ = module.load_roster(
            (fixture_root / "artists.js").read_text(encoding="utf-8")
        )
        assert sum(item.get("slug") == "dean-lawson" for item in fixture_roster) == 1
        assert (fixture_root / "sitemap.xml").read_text(encoding="utf-8").count(
            "https://nextgensessions.com/artists/dean-lawson/"
        ) == 1
    finally:
        module.ROOT, module.ARTIST_DIR = prior_root, prior_artist_dir

workflow_source = (ROOT / ".github/workflows/update-catalogue.yml").read_text(encoding="utf-8")
assert "git add artists/" in workflow_source, "Generated artist page would not reach production"
print("Dean Lawson profile visible; scheduled song hidden until public-catalogue verification.")
