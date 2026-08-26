#!/usr/bin/env python3
"""Verify genre discovery pages ship useful crawlable HTML before JavaScript."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LANES = {
    "uk-rap-grime": {"groups": {"UK Rap & Grime"}, "artist_terms": {"uk rap", "grime"}},
    "hip-hop-g-funk": {"groups": {"Hip-Hop / G-Funk"}, "artist_terms": {"hip-hop", "g-funk"}},
    "dancehall": {"groups": {"Dancehall"}, "artist_terms": {"dancehall"}},
    "reggae-lovers-rock": {"groups": {"Reggae", "Lovers Rock"}, "artist_terms": {"reggae", "lovers rock"}},
    "rnb-soul": {"groups": {"R&B & Soul"}, "artist_terms": {"r&b"}},
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

for slug, lane in LANES.items():
    lane_releases = [item for item in releases if item.get("group") in lane["groups"]]
    lane_artists = [
        artist
        for artist in artists
        if any(term in str(artist.get("genre", "")).lower() for term in lane["artist_terms"])
    ]
    assert lane_releases, f"{slug} has no releases"
    assert lane_artists, f"{slug} has no artists"

    page = ROOT / "genres" / slug / "index.html"
    html = page.read_text(encoding="utf-8")

    assert 'data-static-genre="true"' in html, f"{slug} must ship a pre-rendered genre hub"
    assert "genre-loading" not in html, f"{slug} still ships a loading-only placeholder"
    assert f"data-hub-release-count>{len(lane_releases)}<" in html, f"{slug} release count is stale"
    assert f"data-hub-artist-count>{len(lane_artists)}<" in html, f"{slug} artist count is stale"

    latest = lane_releases[0]
    assert latest["url"] in html, f"{slug} latest release link is missing"
    assert f'/api/release-image?id={latest["id"]}' in html, f"{slug} latest artwork is missing"

    expected_cards = lane_releases[:8]
    assert html.count('class="genre-release-card"') == len(expected_cards), f"{slug} must expose its latest release cards"
    for release in expected_cards:
        assert release["url"] in html, f"{slug} is missing release {release['title']}"
        assert f'data-video-id="{release["id"]}"' in html, f"{slug} is missing release video ID {release['id']}"

    assert html.count('class="genre-artist-card') == len(lane_artists), f"{slug} must expose every matching artist"
    for artist in lane_artists:
        assert f'/artists/{artist["slug"]}/' in html, f"{slug} is missing artist {artist['name']}"

    related = [other for other in LANES if other != slug][:3]
    for other in related:
        assert f'href="/genres/{other}/"' in html, f"{slug} is missing related genre {other}"

    if slug == "uk-rap-grime":
        expected_title = "New UK Rap Music &amp; Artists 2026 | NextGen Sessions"
        expected_description = (
            "Discover new independent UK rap artists and original 2026 music on NextGen Sessions, "
            "from London rap and melodic records to estate storytelling and grime."
        )
        assert f"<title>{expected_title}</title>" in html, "UK Rap search title is stale"
        assert f'content="{expected_description}"' in html, "UK Rap search description is stale"
        assert f'property="og:title" content="{expected_title}"' in html, "UK Rap Open Graph title is stale"
        assert f'name="twitter:title" content="{expected_title}"' in html, "UK Rap Twitter title is missing or stale"
        assert 'data-search-growth="uk-rap-grime"' in html, "UK Rap search-growth section is missing"
        assert "Discover new independent UK rap artists" in html, "UK Rap hero does not target artist discovery"
        assert "New UK rap music 2026" in html, "UK Rap 2026 discovery context is missing"
        assert "Discover independent UK rap artists and original 2026 releases." in html, "UK Rap discovery heading is missing"
        assert 'href="/artists/renz-cole/"' in html, "UK Rap discovery does not route to Renz Cole"
        assert 'href="/artists/reiss/"' in html, "UK Rap discovery does not route to Reiss"
        assert 'href="/mixes/uk-rap-mashup-series-1/"' in html, "UK Rap discovery does not route to the UK Rap mix"

    if slug == "dancehall":
        expected_title = "New Dancehall Music &amp; Artists 2026 | NextGen Sessions"
        expected_description = (
            "Discover new independent dancehall artists and original 2026 music on NextGen Sessions, "
            "from Jamaican gully records and melodic dancehall to bashment mixes."
        )
        assert f"<title>{expected_title}</title>" in html, "Dancehall search title is stale"
        assert f'content="{expected_description}"' in html, "Dancehall search description is stale"
        assert f'property="og:title" content="{expected_title}"' in html, "Dancehall Open Graph title is stale"
        assert f'name="twitter:title" content="{expected_title}"' in html, "Dancehall Twitter title is missing or stale"
        assert 'data-search-growth="dancehall"' in html, "Dancehall search-growth section is missing"
        assert "Discover new independent dancehall artists" in html, "Dancehall hero does not target artist discovery"
        assert "New dancehall music 2026" in html, "Dancehall 2026 discovery context is missing"
        assert "Discover independent dancehall artists and original 2026 releases." in html, "Dancehall discovery heading is missing"
        assert 'href="/artists/kemarco/"' in html, "Dancehall discovery does not route to Kemarco"
        assert 'href="/artists/reeko/"' in html, "Dancehall discovery does not route to Reeko"
        assert 'href="/mixes/dancehall-mashups/"' in html, "Dancehall discovery does not route to the Dancehall mix"

landing = (ROOT / "genres" / "index.html").read_text(encoding="utf-8")
assert 'data-static-genres-index="true"' in landing, "Genre landing page must be pre-rendered"
assert f'data-genre-total-releases>{len(releases)}<' in landing, "Genre landing release total is stale"
assert f'data-genre-total-artists>{len(artists)}<' in landing, "Genre landing artist total is stale"

for slug, lane in LANES.items():
    lane_releases = [item for item in releases if item.get("group") in lane["groups"]]
    lane_artists = [
        artist
        for artist in artists
        if any(term in str(artist.get("genre", "")).lower() for term in lane["artist_terms"])
    ]
    expected = f"{len(lane_releases)} releases · {len(lane_artists)} artists"
    assert expected in landing, f"Genre landing count is stale for {slug}"
    assert f'/api/release-image?id={lane_releases[0]["id"]}&amp;size=card' in landing, f"Genre landing artwork is stale for {slug}"

print(f"Static genre render passed: {len(LANES)} hubs, {len(releases)} releases and {len(artists)} artists are crawlable.")
