#!/usr/bin/env python3
"""Keep homepage static and JavaScript fallbacks aligned with all eligible full-length catalogues."""

from __future__ import annotations

import hashlib
import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START = "// HOMEPAGE:AUTO-FALLBACK:START"
END = "// HOMEPAGE:AUTO-FALLBACK:END"
BLOCKED = re.compile(r"\b(?:shorts?|teaser|trailer|promo|preview|coming soon|out tomorrow|out tonight|out now)\b|#shorts", re.I)
MIX_URLS = {
    "grime": "/mixes/grime-mashup-series-1/",
    "hip-hop": "/mixes/hip-hop-mashup-series-1/",
    "uk-rap": "/mixes/uk-rap-mashup-series-1/",
    "dancehall": "/mixes/dancehall-mashups/",
    "summer": "/mixes/sound-of-summer/",
}
ALBUM_URL = "/mixes/full-albums/"


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def format_date(value: str) -> str:
    date = parse_date(value)
    if not date:
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


def normalise_mix(mix: dict) -> dict:
    raw_title = str(mix.get("rawTitle", "")).strip()
    raw_lead = raw_title.split("|")[0].strip() if raw_title else ""
    return {
        "id": str(mix.get("id", "")).strip(),
        "contentType": "long-mix",
        "title": raw_lead or str(mix.get("title", "")).strip() or "NextGen Sessions Mix",
        "published": str(mix.get("published", "")).strip(),
        "url": MIX_URLS.get(str(mix.get("collection", "")).strip(), "/mixes/"),
        "durationSeconds": int(mix.get("durationSeconds", 0) or 0),
    }


def normalise_album(album: dict) -> dict:
    artist = str(album.get("artist", "")).strip()
    album_title = str(album.get("albumTitle", "")).strip()
    raw_title = str(album.get("rawTitle", "")).strip()
    raw_lead = raw_title.split("|")[0].strip() if raw_title else ""
    title = f"{artist} – {album_title} (Full Album)" if artist and album_title else (raw_lead or raw_title or "NextGen Sessions Full Album")
    return {
        "id": str(album.get("id", "")).strip(),
        "contentType": "album",
        "title": title,
        "published": str(album.get("published", "")).strip(),
        "url": ALBUM_URL,
    }


def eligible_latest(item: dict) -> bool:
    video_id = str(item.get("id", "")).strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        return False
    if item.get("contentType") not in {"full-release", "long-mix", "album"}:
        return False
    if not str(item.get("title", "")).strip() or BLOCKED.search(str(item.get("title", ""))):
        return False
    if item.get("contentType") == "long-mix" and int(item.get("durationSeconds", 0) or 0) < 600:
        return False
    published = parse_date(str(item.get("published", "")))
    return not published or published <= datetime.now(timezone.utc)


def latest_timestamp(item: dict) -> float:
    published = parse_date(str(item.get("published", "")))
    return published.timestamp() if published else 0.0


def select_latest_content(releases: list[dict], mixes: list[dict], albums: list[dict]) -> dict:
    candidates = [normalise_release(item) for item in releases]
    candidates += [normalise_mix(item) for item in mixes]
    candidates += [normalise_album(item) for item in albums if re.search(r"\balbum\b", str(item.get("rawTitle", "")), re.I)]
    candidates = [item for item in candidates if eligible_latest(item)]
    if not candidates:
        raise SystemExit("Cannot sync homepage: no eligible full-length songs, albums or mixes")
    return max(candidates, key=latest_timestamp)


def load_catalogue(path: Path, key: str) -> list[dict]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    value = payload.get(key, [])
    return value if isinstance(value, list) else []


def sync_homepage(releases: list[dict], mixes: list[dict], albums: list[dict]) -> None:
    if not releases:
        raise SystemExit("Cannot sync homepage from an empty release catalogue")

    featured = releases[:6]
    latest = select_latest_content(releases, mixes, albums)
    latest_id = str(latest.get("id", "")).strip()
    latest_url = str(latest.get("url", "/releases/")).strip() or "/releases/"
    latest_title = str(latest.get("title", "Latest NextGen Sessions release")).strip()
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

    release_fallback = [normalise_release(item) for item in featured]
    version_payload = json.dumps({"latest": latest, "releases": release_fallback}, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    version = hashlib.sha1(version_payload.encode("utf-8")).hexdigest()[:10]
    source = replace_once(source, r'<script src="/site\.js(?:\?v=[^"]*)?" defer></script>', f'<script src="/site.js?v=catalogue-{version}" defer></script>', "site.js cache version")
    index_path.write_text(source, encoding="utf-8")

    latest_json = json.dumps(latest, ensure_ascii=False, separators=(",", ":"))
    rest = ["    " + json.dumps(item, ensure_ascii=False, separators=(",", ":")) for item in release_fallback]
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
    release_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "releases.json"
    if not release_path.is_absolute():
        release_path = ROOT / release_path
    releases = load_catalogue(release_path, "releases")
    mixes = load_catalogue(ROOT / "mixes.json", "mixes")
    albums = load_catalogue(ROOT / "albums.json", "albums")
    sync_homepage(releases, mixes, albums)
    latest = select_latest_content(releases, mixes, albums)
    print(f"Homepage fallback synced to {latest.get('contentType', '')}: {latest.get('title', '')}")


if __name__ == "__main__":
    main()
