#!/usr/bin/env python3
"""Keep homepage static and JavaScript fallbacks aligned with releases.json."""

from __future__ import annotations

import hashlib
import html
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START = "// HOMEPAGE:AUTO-FALLBACK:START"
END = "// HOMEPAGE:AUTO-FALLBACK:END"


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def format_date(value: str) -> str:
    if not value:
        return "Official release"
    try:
        date = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return "Official release"
    return f"{date.day} {date.strftime('%B %Y')}"


def display_title(release: dict) -> str:
    artist = str(release.get("artist", "")).strip()
    title = str(release.get("title", "")).strip()
    return f"{artist} – {title}" if artist and title else (title or artist or "Latest NextGen Sessions release")


def replace_once(source: str, pattern: str, replacement, label: str) -> str:
    updated, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"Expected one {label}, found {count}")
    return updated


def homepage_card(release: dict) -> str:
    video_id = esc(release.get("id", ""))
    url = esc(release.get("url", "/releases/"))
    artist = esc(release.get("artist", ""))
    title = esc(release.get("title", ""))
    shown_title = esc(display_title(release))
    published = esc(format_date(str(release.get("published", ""))))
    return (
        f'<a class="release-card" href="{url}">'
        f'<img loading="lazy" decoding="async" src="/api/release-image?id={video_id}&amp;size=card" alt="{title} by {artist} release thumbnail">'
        '<div class="release-meta"><span class="tag">Official release</span>'
        f'<h3>{shown_title}</h3><p>View release</p><span class="release-date">{published}</span>'
        '</div></a>'
    )


def normalise_release(release: dict) -> dict:
    return {
        "id": str(release.get("id", "")).strip(),
        "contentType": "full-release",
        "title": display_title(release),
        "published": str(release.get("published", "")).strip(),
        "url": str(release.get("url", "/releases/")).strip() or "/releases/",
    }


def sync_homepage(releases: list[dict]) -> None:
    if not releases:
        raise SystemExit("Cannot sync homepage from an empty release catalogue")

    featured = releases[:6]
    latest = featured[0]
    latest_id = str(latest.get("id", "")).strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", latest_id):
        raise SystemExit(f"Invalid latest video id: {latest_id!r}")

    latest_url = str(latest.get("url", "/releases/")).strip() or "/releases/"
    latest_title = display_title(latest)
    youtube_url = f"https://www.youtube.com/watch?v={latest_id}"
    published = format_date(str(latest.get("published", "")))

    index_path = ROOT / "index.html"
    source = index_path.read_text(encoding="utf-8")
    source = replace_once(source, r'(<a class="button button-secondary" id="heroLatestLink" href=")[^"]*(")', lambda m: m.group(1) + esc(latest_url) + m.group(2), "hero latest link")
    source = replace_once(source, r'(<div class="video-frame" id="latestVideoFrame" data-video-id=")[^"]*(")', lambda m: m.group(1) + esc(latest_id) + m.group(2), "latest video id")
    source = replace_once(source, r'(<button class="video-poster" id="latestVideoPlay" type="button" aria-label=")[^"]*(")', lambda m: m.group(1) + esc(f"Play {latest_title}") + m.group(2), "latest play label")
    source = replace_once(source, r'(<img id="latestVideoThumbnail" src=")[^"]*(")', lambda m: m.group(1) + f"/api/release-image?id={esc(latest_id)}" + m.group(2), "latest thumbnail")
    source = replace_once(source, r'(<noscript><a class="video-no-script" href=")[^"]*(")', lambda m: m.group(1) + esc(youtube_url) + m.group(2), "latest no-script link")
    source = replace_once(source, r'(<h2 id="latestVideoTitle">).*?(</h2>)', lambda m: m.group(1) + esc(latest_title) + m.group(2), "latest title")
    source = replace_once(source, r'(<p id="latestVideoDate">).*?(</p>)', lambda m: m.group(1) + esc(f"Published {published}") + m.group(2), "latest date")
    source = replace_once(source, r'(<a class="button button-primary latest-watch" id="latestWatchLink" href=")[^"]*(")', lambda m: m.group(1) + esc(youtube_url) + m.group(2), "latest YouTube link")

    cards = "".join(homepage_card(release) for release in featured)
    source = replace_once(
        source,
        r'<div class="release-grid" id="releaseGrid">.*?</div>(?=<div class="button-row" style="margin-top:24px">)',
        f'<div class="release-grid" id="releaseGrid">{cards}</div>',
        "homepage release fallback grid",
    )

    version_payload = json.dumps([normalise_release(item) for item in featured], ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    version = hashlib.sha1(version_payload.encode("utf-8")).hexdigest()[:10]
    source = replace_once(source, r'<script src="/site\.js(?:\?v=[^"]*)?" defer></script>', f'<script src="/site.js?v=catalogue-{version}" defer></script>', "site.js cache version")
    index_path.write_text(source, encoding="utf-8")

    fallback = [normalise_release(item) for item in featured]
    latest_json = json.dumps(fallback[0], ensure_ascii=False, separators=(",", ":"))
    rest = ["    FALLBACK_LATEST"] + ["    " + json.dumps(item, ensure_ascii=False, separators=(",", ":")) for item in fallback[1:]]
    block = (
        f"  {START}\n"
        f"  const FALLBACK_LATEST = {latest_json};\n\n"
        "  const FALLBACK_RELEASES = [\n"
        + ",\n".join(rest)
        + "\n  ];\n"
        f"  {END}"
    )

    site_path = ROOT / "site.js"
    site = site_path.read_text(encoding="utf-8")
    if START in site and END in site:
        site = replace_once(site, re.escape(START) + r".*?" + re.escape(END), block.strip(), "marked JavaScript fallback block")
    else:
        site = replace_once(site, r'  const FALLBACK_LATEST = \{.*?\n  const FALLBACK_RELEASES = \[.*?\n  \];', block, "legacy JavaScript fallback block")
    site_path.write_text(site, encoding="utf-8")


def main() -> None:
    catalogue_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "releases.json"
    if not catalogue_path.is_absolute():
        catalogue_path = ROOT / catalogue_path
    payload = json.loads(catalogue_path.read_text(encoding="utf-8"))
    releases = payload.get("releases", [])
    sync_homepage(releases)
    latest = releases[0]
    print(f"Homepage fallback synced to {latest.get('artist', '')} — {latest.get('title', '')}")


if __name__ == "__main__":
    main()
