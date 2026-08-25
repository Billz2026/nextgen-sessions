#!/usr/bin/env python3
"""Fail the build if a scheduled release leaks public media or release URLs early."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEDULE = json.loads((ROOT / "scheduled-releases.json").read_text(encoding="utf-8"))
CATALOGUE = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
NOW = datetime.now(timezone.utc)

DISALLOWED_SCHEDULE_KEYS = {
    "id",
    "videoId",
    "youtubeId",
    "youtubeUrl",
    "watchUrl",
    "embedUrl",
    "thumbnailUrl",
    "contentUrl",
}


def parse_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise AssertionError(f"releaseAt must include a timezone: {value}")
    return parsed.astimezone(timezone.utc)


def same_release(left: dict, right: dict) -> bool:
    return (
        str(left.get("artist", "")).casefold() == str(right.get("artist", "")).casefold()
        and str(left.get("title", "")).casefold() == str(right.get("title", "")).casefold()
    )


assert SCHEDULE.get("policy") == "metadata-only-no-media-identifiers"
scheduled = SCHEDULE.get("releases", [])
assert isinstance(scheduled, list), "Scheduled release registry must contain a releases array"

future_count = 0
for item in scheduled:
    forbidden = DISALLOWED_SCHEDULE_KEYS.intersection(item)
    assert not forbidden, f"Scheduled metadata must not contain media identifiers: {sorted(forbidden)}"
    assert item.get("artist") and item.get("title") and item.get("artistPath") and item.get("releaseSlug")
    release_at = parse_utc(str(item.get("releaseAt", "")))

    if NOW >= release_at:
        continue
    future_count += 1

    public_matches = [release for release in CATALOGUE.get("releases", []) if same_release(release, item)]
    assert not public_matches, f"Future release leaked into releases.json: {item['artist']} — {item['title']}"

    slug = str(item["releaseSlug"]).strip("/")
    release_url = f"/releases/{slug}/"
    release_page = ROOT / "releases" / slug / "index.html"
    assert not release_page.exists(), f"Future release detail page exists before releaseAt: {release_url}"

    archive = (ROOT / "releases" / "index.html").read_text(encoding="utf-8")
    assert release_url not in archive, f"Future release URL leaked into archive: {release_url}"

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    assert release_url not in sitemap, f"Future release URL leaked into sitemap: {release_url}"

    artist_path = ROOT / str(item["artistPath"]).strip("/") / "index.html"
    assert artist_path.exists(), f"Scheduled artist page is missing: {item['artistPath']}"
    artist_html = artist_path.read_text(encoding="utf-8")
    assert release_url not in artist_html, f"Future release page link leaked on artist profile: {release_url}"
    assert f'data-video-title="{item["artist"]} — {item["title"]}"' not in artist_html, (
        f"Future release video metadata leaked on artist profile: {item['artist']} — {item['title']}"
    )

for release in CATALOGUE.get("releases", []):
    published = release.get("published")
    assert published, f"Public catalogue release missing published time: {release.get('title')}"
    assert parse_utc(str(published)) <= NOW, (
        f"Future-dated release present in public catalogue: {release.get('artist')} — {release.get('title')}"
    )

print(
    f"Scheduled-release policy validated for {len(scheduled)} registered release(s); "
    f"{future_count} currently under release-time protection."
)
