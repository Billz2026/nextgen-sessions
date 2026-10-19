#!/usr/bin/env python3
"""Publish Dean Lawson's Pop artist profile now; embargo Dangerous Love until public.

Runs after the verified YouTube release catalogue is built and before the
artist/roster/search renderers. His public biography and portrait are always
available, while the song and video link come only from a confirmed public
catalogue entry.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIDEO_ID = "y_gADQbXSho"
ARTIST = "Dean Lawson"
TITLE = "Dangerous Love"
SLUG = "dean-lawson"
ARTIST_DIR = ROOT / "artists" / SLUG


def is_publicly_released(items: list[dict], now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    for item in items:
        if not (
            item.get("id") == VIDEO_ID
            and item.get("artist") == ARTIST
            and item.get("title") in {TITLE, f"{TITLE} (MCDS Riddim)"}
            and item.get("group") == "Pop"
            and item.get("contentType") == "full-release"
            and int(item.get("durationSeconds") or 0) >= 75
        ):
            continue
        try:
            published = datetime.fromisoformat(str(item["published"]).replace("Z", "+00:00"))
            if published.tzinfo is None:
                continue
        except (ValueError, TypeError, KeyError):
            continue
        if published <= now:
            return True
    return False


def roster_item() -> dict:
    return {
        "name": ARTIST,
        "slug": SLUG,
        "genre": "Pop",
        "summary": "Melodic Pop with classic 1980s influences, expressive songwriting and polished production.",
        "featured": False,
    }


def load_roster(source: str) -> tuple[list, int, int]:
    match = re.search(r"window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);", source)
    if not match:
        raise RuntimeError("Cannot find the public artist roster")
    return json.loads(match.group(1)), match.start(1), match.end(1)


def make_profile(live: bool) -> str:
    item = {
        "name": ARTIST,
        "path": "/artists/dean-lawson/",
        "genre": "Pop",
        "location": "NextGen Sessions",
        "eyebrow": "NextGen Sessions artist",
        "headline": "Melodic Pop shaped by classic 1980s influences and polished contemporary songwriting.",
        "bio": [
            "Dean Lawson brings a classic 1980s-inspired Pop sensibility to NextGen Sessions, focusing on strong melodies, expressive vocals and emotional songwriting.",
            "His official recordings are collected on this page as they become publicly available."
        ],
        "imageKey": SLUG,
        "catalogueAliases": [ARTIST],
        # The scheduled video ID and title never enter public profile data early.
        "featuredVideo": (
            {"id": VIDEO_ID, "title": TITLE}
            if live else {"title": "Official recordings"}
        ),
        **({} if live else {"releaseStatus": "upcoming"}),
        "related": [],
    }
    return (
        "window.NGS_ARTIST_PROFILES = Object.assign(window.NGS_ARTIST_PROFILES || {}, {\n"
        + json.dumps(SLUG) + ": " + json.dumps(item, ensure_ascii=False, indent=2)
        + "\n});\n"
    )


def make_shell() -> str:
    # The shared render-artists script populates the real profile from
    # this shell and the verified release catalogue in the same workflow.
    return """<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Dean Lawson | Pop Artist | NextGen Sessions</title>
  <meta name="description" content="Discover Dean Lawson, an independent Pop artist with classic 1980s influences, on NextGen Sessions.">
  <link rel="canonical" href="https://nextgensessions.com/artists/dean-lawson/">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="Dean Lawson | Pop Artist | NextGen Sessions">
  <meta property="og:description" content="Explore Dean Lawson's melodic Pop sound, artist biography and official NextGen Sessions releases.">
  <meta property="og:url" content="https://nextgensessions.com/artists/dean-lawson/">
  <meta property="og:image" content="https://nextgensessions.com/assets/artists/dean-lawson-portrait.webp">
  <meta name="twitter:image" content="https://nextgensessions.com/assets/artists/dean-lawson-portrait.webp">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#080808">
  <link rel="icon" type="image/svg+xml" href="/assets/nextgen-favicon.svg">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="/styles.css?v=20260809-header1">
  <link rel="stylesheet" href="/artist-profile.css?v=20260810-playerfirst1">
  <link rel="stylesheet" href="/artist-discography.css">
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header"><div class="header-inner">
    <a class="brand" href="/" aria-label="NextGen Sessions home"><img src="/assets/nextgen-header-wordmark-2026.webp" width="1600" height="663" alt="NextGen Sessions"></a>
    <nav class="nav" aria-label="Primary navigation"><a href="/">Home</a><a href="/artists/" aria-current="page">Artists</a><a href="/releases/">Releases</a><a href="/genres/">Genres</a><a href="/mixes/">Mixes</a><a href="/search/">Search</a><a href="/submit.html">Submit</a><a class="nav-cta" href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></nav>
  </div></header>
  <main id="artistProfile" data-artist="dean-lawson"></main>
  <footer class="site-footer"><div class="footer-inner">
    <div>© 2026 NextGen Sessions. Original music and independent artists.</div>
    <div class="footer-links"><a href="/">Home</a><a href="/artists/">Artists</a><a href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="/privacy/">Privacy</a></div>
  </div></footer>
  <!-- This profile is pre-rendered from the verified catalogue.
       Omit the dynamic featured-video module to prevent scheduled video leaks. -->
</body>
</html>
"""


def main() -> None:
    catalogue = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
    if catalogue.get("source") != "curated-youtube-playlists":
        raise RuntimeError("Untrusted release catalogue; cannot publish artist")
    live = is_publicly_released(catalogue.get("releases", []))
    roster_path = ROOT / "artists.js"
    source = roster_path.read_text(encoding="utf-8")
    roster, start, end = load_roster(source)
    dean_entries = [item for item in roster if item.get("slug") == SLUG]
    if len(dean_entries) > 1:
        raise RuntimeError("Dean Lawson appears more than once in artist roster")
    if dean_entries and dean_entries[0].get("name") != ARTIST:
        raise RuntimeError("Conflicting artist uses dean-lawson slug")

    if not dean_entries:
        roster.append(roster_item())
        source = source[:start] + json.dumps(roster, ensure_ascii=False, indent=2) + source[end:]
        roster_path.write_text(source, encoding="utf-8")

    ARTIST_DIR.mkdir(parents=True, exist_ok=True)
    profile_path = ARTIST_DIR / "profile.js"
    profile_markup = make_profile(live)
    if not profile_path.exists() or profile_path.read_text(encoding="utf-8") != profile_markup:
        profile_path.write_text(profile_markup, encoding="utf-8")
    page_path = ARTIST_DIR / "index.html"
    if not page_path.exists():
        page_path.write_text(make_shell(), encoding="utf-8")

    sitemap_path = ROOT / "sitemap.xml"
    sitemap = sitemap_path.read_text(encoding="utf-8")
    target = "https://nextgensessions.com/artists/dean-lawson/"
    if target not in sitemap:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        entry = f"  <url><loc>{target}</loc><lastmod>{today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n"
        if "</urlset>" not in sitemap:
            raise RuntimeError("Sitemap is missing closing urlset")
        sitemap_path.write_text(sitemap.replace("</urlset>", entry + "</urlset>", 1), encoding="utf-8")

    print("Dean Lawson artist profile is public; Dangerous Love " + ("is live." if live else "remains embargoed."))


if __name__ == "__main__":
    main()
