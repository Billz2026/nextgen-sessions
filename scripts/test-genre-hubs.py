#!/usr/bin/env python3
"""Regression checks for NextGen Sessions genre discovery hubs."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LANES = {
    "uk-rap-grime": {
        "groups": {"UK Rap & Grime"},
        "artist_terms": {"uk rap", "grime"},
    },
    "hip-hop-g-funk": {
        "groups": {"Hip-Hop / G-Funk"},
        "artist_terms": {"hip-hop", "g-funk"},
    },
    "dancehall": {
        "groups": {"Dancehall"},
        "artist_terms": {"dancehall"},
    },
    "reggae-lovers-rock": {
        "groups": {"Reggae", "Lovers Rock"},
        "artist_terms": {"reggae", "lovers rock"},
    },
    "rnb-soul": {
        "groups": {"R&B & Soul"},
        "artist_terms": {"r&b"},
    },
    "global-sounds": {
        "groups": {"Asian", "Arabic", "Late Night Afro", "Late Night Vibes"},
        "artist_terms": {"punjabi", "south asian", "arabic", "afro"},
    },
}

payload = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
releases = payload.get("releases", [])
assert releases, "Release catalogue is empty"

artists_source = (ROOT / "artists.js").read_text(encoding="utf-8")
start = artists_source.find("[")
end = artists_source.find("];", start)
assert start >= 0 and end > start, "Could not parse artists.js catalogue"
artists = json.loads(artists_source[start : end + 1])
assert artists, "Artist catalogue is empty"

mapped_groups: dict[str, str] = {}
for slug, lane in LANES.items():
    for group in lane["groups"]:
        assert group not in mapped_groups, f"Release group {group!r} mapped to multiple genre hubs"
        mapped_groups[group] = slug

catalogue_groups = {str(item.get("group", "")).strip() for item in releases}
unmapped_groups = sorted(group for group in catalogue_groups if group not in mapped_groups)
assert not unmapped_groups, f"Unmapped release groups: {unmapped_groups}"

for slug, lane in LANES.items():
    lane_releases = [item for item in releases if item.get("group") in lane["groups"]]
    assert lane_releases, f"Genre hub {slug} has no releases"

    lane_artists = []
    for artist in artists:
        genre = str(artist.get("genre", "")).lower()
        if any(term in genre for term in lane["artist_terms"]):
            lane_artists.append(artist)
    assert lane_artists, f"Genre hub {slug} has no matching artists"

    page = ROOT / "genres" / slug / "index.html"
    assert page.exists(), f"Missing hub page: {page.relative_to(ROOT)}"
    html = page.read_text(encoding="utf-8")
    assert f'data-genre-slug="{slug}"' in html, f"Wrong genre slug marker on {slug}"
    assert 'href="/genres/"' in html, f"Genre navigation missing on {slug}"
    assert '/genre-hubs.js' in html, f"Genre runtime missing on {slug}"
    assert '/genre-hubs.css' in html, f"Genre styles missing on {slug}"
    assert 'href="/privacy/"' in html, f"Privacy footer missing on {slug}"

uncovered_artists = []
for artist in artists:
    genre = str(artist.get("genre", "")).lower()
    if not any(
        any(term in genre for term in lane["artist_terms"])
        for lane in LANES.values()
    ):
        uncovered_artists.append(artist.get("name", "Unknown"))
assert not uncovered_artists, f"Artists missing genre-hub coverage: {uncovered_artists}"

landing = (ROOT / "genres" / "index.html").read_text(encoding="utf-8")
for slug in LANES:
    assert f'href="/genres/{slug}/"' in landing, f"Landing page missing {slug}"
    assert f'data-lane-image="{slug}"' in landing, f"Landing artwork missing {slug}"
assert landing.count('class="genre-hub-card-media"') == len(LANES), "Every genre landing card must have its own artwork frame"
assert 'genre-hubs.css?v=20260824-genres2' in landing, "Genre landing page has a stale CSS cache key"

runtime = (ROOT / "genre-hubs.js").read_text(encoding="utf-8")
for slug in LANES:
    assert f'"{slug}"' in runtime, f"Runtime taxonomy missing {slug}"
assert 'fetch("/releases.json"' in runtime, "Genre hubs no longer load the live release catalogue"

styles = (ROOT / "genre-hubs.css").read_text(encoding="utf-8")
landing_media_start = styles.find(".genre-hub-card-media{")
assert landing_media_start >= 0, "Genre landing artwork frame rule is missing"
landing_media_end = styles.find("}", landing_media_start)
landing_media_rule = styles[landing_media_start:landing_media_end]
assert "aspect-ratio:16/9" in landing_media_rule, "Genre landing cards must use a consistent 16:9 artwork frame"
landing_image_start = styles.find(".genre-hub-card-media img{")
assert landing_image_start >= 0, "Genre landing artwork rule is missing"
landing_image_end = styles.find("}", landing_image_start)
landing_image_rule = styles[landing_image_start:landing_image_end]
assert "object-fit:contain" in landing_image_rule, "Genre landing artwork must remain fully visible"
assert "object-fit:cover" not in landing_image_rule, "Genre landing artwork has regressed to crop mode"

media_rule_start = styles.find(".genre-hero-media{")
assert media_rule_start >= 0, "Genre hero media rule is missing"
media_rule_end = styles.find("}", media_rule_start)
media_rule = styles[media_rule_start:media_rule_end]
assert "aspect-ratio:16/9" in media_rule, "Genre hero media must preserve the native widescreen artwork frame"
hero_rule_start = styles.find(".genre-hero-media img{")
assert hero_rule_start >= 0, "Genre hero artwork rule is missing"
hero_rule_end = styles.find("}", hero_rule_start)
hero_rule = styles[hero_rule_start:hero_rule_end]
assert "object-fit:contain" in hero_rule, "Genre hero artwork must remain fully visible with object-fit: contain"
assert "object-fit:cover" not in hero_rule, "Genre hero artwork has regressed to cropped cover mode"

metrics = (ROOT / "site-metrics.js").read_text(encoding="utf-8")
assert 'genresLink.href = "/genres/"' in metrics, "Shared site navigation no longer exposes Genres"
assert 'send("genre_click"' in metrics, "Genre discovery analytics missing"

robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
assert "sitemap-genres.xml" in robots, "Genre sitemap not exposed in robots.txt"
assert (ROOT / "sitemap-genres.xml").exists(), "Genre sitemap file missing"

print(
    f"Validated {len(LANES)} genre hubs across {len(releases)} releases and {len(artists)} artists"
)
