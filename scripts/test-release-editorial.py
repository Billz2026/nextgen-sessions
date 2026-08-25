#!/usr/bin/env python3
"""Validate release detail pages remain rich, crawlable and catalogue-grounded."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EDITORIAL_RE = re.compile(r"<!-- RELEASE-EDITORIAL:START -->([\s\S]*?)<!-- RELEASE-EDITORIAL:END -->")
DISCOVERY_RE = re.compile(r"<!-- RELEASE-DISCOVERY:START -->([\s\S]*?)<!-- RELEASE-DISCOVERY:END -->")
SCRIPT_RE = re.compile(r'<script\s+type="application/ld\+json">([\s\S]*?)</script>', re.I)
META_DESCRIPTION_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]+)"', re.I)
HREF_RE = re.compile(r'href="(/releases/[a-z0-9][a-z0-9-]*/?)"', re.I)
TAG_RE = re.compile(r"<[^>]+>")

LANES = {
    "UK Rap & Grime": "/genres/uk-rap-grime/",
    "Hip-Hop / G-Funk": "/genres/hip-hop-g-funk/",
    "Dancehall": "/genres/dancehall/",
    "Reggae": "/genres/reggae-lovers-rock/",
    "Lovers Rock": "/genres/reggae-lovers-rock/",
    "R&B & Soul": "/genres/rnb-soul/",
    "Asian": "/genres/global-sounds/",
    "Arabic": "/genres/global-sounds/",
    "Late Night Afro": "/genres/global-sounds/",
    "Late Night Vibes": "/genres/global-sounds/",
}


def iso_duration(seconds: int) -> str:
    total = int(seconds or 0)
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    return f"PT{f'{hours}H' if hours else ''}{f'{minutes}M' if minutes else ''}{f'{secs}S' if secs or (not hours and not minutes) else ''}"


def visible_words(fragment: str) -> list[str]:
    text = html.unescape(TAG_RE.sub(" ", fragment))
    return re.findall(r"\b[\w’'-]+\b", text, flags=re.UNICODE)


payload = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
releases = payload.get("releases", [])
assert releases, "Release catalogue is empty"
valid_urls = {item["url"] for item in releases}
checked = 0

for index, release in enumerate(releases):
    page = ROOT / "releases" / release["slug"] / "index.html"
    assert page.exists(), f"Missing release page: {release['url']}"
    source = page.read_text(encoding="utf-8")

    assert 'data-release-editorial="true"' in source, f"Editorial section missing: {release['url']}"
    assert "<!-- RELEASE-BREADCRUMBS:START -->" in source, f"Breadcrumb schema marker missing: {release['url']}"
    assert "/release-detail.css?v=20260825-editorial1" in source, f"Editorial CSS version missing: {release['url']}"
    assert release["title"] in html.unescape(source), f"Release title missing: {release['url']}"
    assert release["artist"] in html.unescape(source), f"Artist missing: {release['url']}"

    editorial_match = EDITORIAL_RE.search(source)
    discovery_match = DISCOVERY_RE.search(source)
    assert editorial_match, f"Editorial markers missing: {release['url']}"
    assert discovery_match, f"Discovery markers missing: {release['url']}"
    assert len(visible_words(editorial_match.group(1))) >= 75, f"Editorial copy is too thin: {release['url']}"

    meta_match = META_DESCRIPTION_RE.search(source)
    assert meta_match, f"Meta description missing: {release['url']}"
    description = html.unescape(meta_match.group(1))
    assert 80 <= len(description) <= 180, f"Meta description length is weak ({len(description)}): {release['url']}"
    assert release["title"] in description and release["artist"] in description, f"Meta description is not release-specific: {release['url']}"

    expected_genre = LANES.get(release.get("group"))
    assert expected_genre and f'href="{expected_genre}"' in editorial_match.group(1), f"Genre hub link missing: {release['url']}"

    for linked_url in HREF_RE.findall(discovery_match.group(1)):
        normalized = linked_url if linked_url.endswith("/") else linked_url + "/"
        assert normalized in valid_urls, f"Discovery links to non-catalogue release {normalized} from {release['url']}"
        assert normalized != release["url"], f"Release recommends itself: {release['url']}"

    if index > 0:
        assert releases[index - 1]["url"] in discovery_match.group(1), f"Newer chronology link missing: {release['url']}"
    if index < len(releases) - 1:
        assert releases[index + 1]["url"] in discovery_match.group(1), f"Earlier chronology link missing: {release['url']}"

    schemas = []
    for raw in SCRIPT_RE.findall(source):
        try:
            schemas.append(json.loads(raw))
        except json.JSONDecodeError as exc:
            raise AssertionError(f"Invalid JSON-LD in {release['url']}: {exc}") from exc
    music = next((item for item in schemas if item.get("@type") == "MusicRecording"), None)
    breadcrumbs = next((item for item in schemas if item.get("@type") == "BreadcrumbList"), None)
    assert music, f"MusicRecording schema missing: {release['url']}"
    assert breadcrumbs, f"BreadcrumbList schema missing: {release['url']}"
    if release.get("durationSeconds"):
        assert music.get("duration") == iso_duration(release["durationSeconds"]), f"Schema duration mismatch: {release['url']}"
    assert music.get("isPartOf", {}).get("url") == "https://nextgensessions.com/releases/", f"Catalogue schema link missing: {release['url']}"
    assert breadcrumbs.get("itemListElement", [])[-1].get("item") == f"https://nextgensessions.com{release['url']}", f"Breadcrumb endpoint mismatch: {release['url']}"

    checked += 1

sample = (ROOT / "releases" / "kemarco-ghetto-blessings" / "index.html").read_text(encoding="utf-8")
assert "FROM ZINC FENCE TO MANSION GATES" in sample, "Verified YouTube campaign line was not preserved for Ghetto Blessings"

assert checked == len(releases), f"Expected {len(releases)} release pages, validated {checked}"
print(f"Release editorial QA passed: {checked} pages contain grounded context, schema, discovery and chronology.")
