#!/usr/bin/env python3
"""Render crawlable release cards, detail pages and release sitemap URLs."""

from __future__ import annotations

import html
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_START = "<!-- RELEASES:STATIC:START -->"
ARCHIVE_END = "<!-- RELEASES:STATIC:END -->"
SITEMAP_START = "<!-- RELEASES:SITEMAP:START -->"
SITEMAP_END = "<!-- RELEASES:SITEMAP:END -->"
JSON_LD_PATTERN = re.compile(
    r'(<script\s+type="application/ld\+json">)([\s\S]*?)(</script>)',
    re.IGNORECASE,
)


def slugify(value: str) -> str:
    value = value.replace("’", "'").replace("‘", "'")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = value.replace("'", "")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or "release"


def format_date(value: str) -> str:
    if not value:
        return "Official release"
    try:
        date = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return "Official release"
    return f"{date.day} {date.strftime('%B %Y')}"


def date_only(value: str) -> str:
    if not value:
        return ""
    return value[:10]


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def artist_slugs() -> dict[str, str]:
    source = (ROOT / "artists.js").read_text(encoding="utf-8")
    start = source.find("[")
    end = source.find("];", start)
    artists = json.loads(source[start:end + 1])
    return {artist["name"].casefold(): artist["slug"] for artist in artists}


def primary_artist_slug(artist: str, slugs: dict[str, str]) -> str:
    direct = slugs.get(artist.casefold())
    if direct:
        return direct
    for separator in (" x ", " & ", " feat. ", " ft. "):
        first = artist.casefold().split(separator, 1)[0].strip()
        if first in slugs:
            return slugs[first]
    return ""


def assign_urls(releases: list[dict]) -> list[dict]:
    used: dict[str, str] = {}
    output: list[dict] = []
    for release in releases:
        base = slugify(f"{release.get('artist', '')}-{release.get('title', '')}")
        slug = base
        if slug in used and used[slug] != release.get("id"):
            slug = f"{base}-{release.get('id', '')[:6].lower()}"
        used[slug] = release.get("id", "")
        output.append({**release, "slug": slug, "url": f"/releases/{slug}/"})
    return output


def release_card(release: dict) -> str:
    artist = esc(release["artist"])
    title = esc(release["title"])
    group = esc(release["group"])
    published = esc(format_date(release.get("published", "")))
    url = esc(release["url"])
    video_id = esc(release["id"])
    initials = "".join(part[:1] for part in release["artist"].split()[:2]).upper() or "NG"
    return (
        f'<article class="archive-release-card" data-release-card data-video-id="{video_id}" '
        f'data-video-title="{artist} — {title}" data-release-url="{url}" '
        f'data-image-src="/api/release-image?id={video_id}&amp;size=card" data-image-alt="{title} by {artist}">'
        f'<div class="archive-release-art" data-monogram="{esc(initials)}">'
        f'<a class="archive-release-art-link archive-release-detail-link" href="{url}" aria-label="View details for {title} by {artist}">'
        f'<img loading="lazy" decoding="async" src="/api/release-image?id={video_id}&amp;size=card" alt="{title} by {artist}"></a>'
        f'<button class="archive-release-play" type="button" data-archive-play aria-label="Play {title} by {artist}"></button></div>'
        '<div class="archive-release-body">'
        f'<span class="archive-release-genre">{group}</span><a class="archive-release-title archive-release-detail-link" href="{url}"><h3>{title}</h3></a>'
        f'<p class="archive-release-artist">{artist}</p>'
        f'<div class="archive-release-footer"><span>{published}</span><a class="archive-release-watch archive-release-detail-link" href="{url}">View details</a></div>'
        '</div></article>'
    )


def render_archive(releases: list[dict]) -> None:
    path = ROOT / "releases" / "index.html"
    source = path.read_text(encoding="utf-8")
    if ARCHIVE_START not in source or ARCHIVE_END not in source:
        raise SystemExit("Release archive markers are missing")
    cards = "\n      ".join(release_card(release) for release in releases)
    block = f"{ARCHIVE_START}\n      {cards}\n      {ARCHIVE_END}"
    source = re.sub(
        re.escape(ARCHIVE_START) + r"[\s\S]*?" + re.escape(ARCHIVE_END),
        block,
        source,
        count=1,
    )
    source = re.sub(
        r'<p class="archive-count" id="releaseCount" aria-live="polite">.*?</p>',
        f'<p class="archive-count" id="releaseCount" aria-live="polite">{len(releases)} releases in the catalogue</p>',
        source,
        count=1,
    )
    path.write_text(source, encoding="utf-8")


def release_page(release: dict, related: list[dict], slugs: dict[str, str]) -> str:
    artist = esc(release["artist"])
    title = esc(release["title"])
    group = esc(release["group"])
    video_id = esc(release["id"])
    canonical = f"https://nextgensessions.com{release['url']}"
    published = format_date(release.get("published", ""))
    published_iso = date_only(release.get("published", ""))
    artist_slug = primary_artist_slug(release["artist"], slugs)
    artist_link = (
        f'<a href="/artists/{esc(artist_slug)}/">{artist}</a>'
        if artist_slug else artist
    )
    related_markup = "".join(
        f'<a class="release-related-card" href="{esc(item["url"])}"><span>{esc(item["group"])}</span><strong>{esc(item["title"])}</strong></a>'
        for item in related
    ) or '<a class="release-related-card" href="/releases/"><span>Catalogue</span><strong>Explore all releases</strong></a>'
    schema = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        "name": release["title"],
        "url": canonical,
        "datePublished": published_iso or None,
        "genre": release["group"],
        "byArtist": {"@type": "MusicGroup", "name": release["artist"]},
        "subjectOf": {
            "@type": "VideoObject",
            "name": f"{release['artist']} – {release['title']}",
            "embedUrl": f"https://www.youtube-nocookie.com/embed/{release['id']}",
            "contentUrl": f"https://www.youtube.com/watch?v={release['id']}",
            "thumbnailUrl": f"https://i.ytimg.com/vi/{release['id']}/hqdefault.jpg",
            "uploadDate": published_iso or None,
        },
        "publisher": {"@type": "Organization", "name": "NextGen Sessions", "url": "https://nextgensessions.com/"},
    }
    schema = json.loads(json.dumps(schema))
    if not published_iso:
        schema.pop("datePublished", None)
        schema["subjectOf"].pop("uploadDate", None)
    schema_json = json.dumps(schema, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    description = f"Listen to {release['title']} by {release['artist']}, an official {release['group']} release from NextGen Sessions."
    return f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title} | {artist} | NextGen Sessions</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{esc(canonical)}">
  <meta property="og:type" content="music.song">
  <meta property="og:title" content="{title} | {artist}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{esc(canonical)}">
  <meta property="og:image" content="https://i.ytimg.com/vi/{video_id}/hqdefault.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title} | {artist}">
  <meta name="twitter:description" content="{esc(description)}">
  <meta name="twitter:image" content="https://i.ytimg.com/vi/{video_id}/hqdefault.jpg">
  <meta name="theme-color" content="#080808">
  <link rel="icon" type="image/svg+xml" href="/assets/nextgen-favicon.svg">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/releases.css?v=20260807-r2">
  <link rel="stylesheet" href="/release-detail.css?v=20260807-r2">
  <script type="application/ld+json">{schema_json}</script>
</head>
<body>
<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="NextGen Sessions home"><img src="/assets/nextgen-header.webp" width="256" height="212" alt="NextGen Sessions"></a><nav class="nav" aria-label="Primary navigation"><a href="/">Home</a><a href="/artists/">Artists</a><a href="/releases/" aria-current="page">Releases</a><a href="/mixes/">Mixes</a><a href="/submit.html">Submit</a><a class="nav-cta" href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></nav></div></header>
<main id="main-content" class="release-detail-page">
  <a class="profile-back" href="/releases/">← Back to all releases</a>
  <section class="release-detail-hero">
    <div class="release-detail-art"><img src="/api/release-image?id={video_id}" alt="{title} by {artist}" width="1280" height="720"></div>
    <div class="release-detail-copy"><p class="eyebrow">Official NextGen Sessions release</p><span class="profile-genre">{group}</span><h1>{title}</h1><p class="release-detail-artist">By {artist_link}</p><p class="release-detail-date">Released {esc(published)}</p><div class="button-row"><a class="button button-primary" href="https://www.youtube.com/watch?v={video_id}" target="_blank" rel="noopener">Watch on YouTube</a>{f'<a class="button button-secondary" href="/artists/{esc(artist_slug)}/">View {artist}</a>' if artist_slug else ''}</div></div>
  </section>
  <section class="release-video-section" aria-labelledby="watch-title"><div class="section-heading"><p class="eyebrow">Official video</p><h2 id="watch-title">Watch {title}</h2></div><div class="release-video-frame" data-release-player data-video-id="{video_id}" data-video-title="{artist} — {title}"><button class="video-poster" type="button" data-release-play aria-label="Play {artist} — {title}"><img loading="lazy" decoding="async" src="/api/release-image?id={video_id}" alt=""><span class="video-poster-overlay" aria-hidden="true"><span class="video-play-icon"></span><span class="video-play-copy">Play official video</span></span></button><noscript><a class="video-no-script" href="https://www.youtube.com/watch?v={video_id}">Watch {title} on YouTube</a></noscript></div></section>
  <section class="release-related" aria-labelledby="related-title"><div class="section-heading"><p class="eyebrow">Keep listening</p><h2 id="related-title">More from {artist}</h2></div><div class="release-related-grid">{related_markup}</div></section>
</main>
<footer class="site-footer"><div class="footer-inner"><div>© 2026 NextGen Sessions. Original music and independent artists.</div><div class="footer-links"><a href="/artists/">Artists</a><a href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></div></div></footer>
<script src="/release-player.js?v=20260807-perf1" defer></script>
</body>
</html>
'''


def render_pages(releases: list[dict]) -> None:
    slugs = artist_slugs()
    by_artist: dict[str, list[dict]] = {}
    for release in releases:
        by_artist.setdefault(release["artist"].casefold(), []).append(release)
    for release in releases:
        related = [item for item in by_artist.get(release["artist"].casefold(), []) if item["id"] != release["id"]][:3]
        directory = ROOT / "releases" / release["slug"]
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "index.html").write_text(release_page(release, related, slugs), encoding="utf-8")


def render_sitemap(releases: list[dict]) -> None:
    path = ROOT / "sitemap.xml"
    source = path.read_text(encoding="utf-8")
    if SITEMAP_START not in source or SITEMAP_END not in source:
        raise SystemExit("Release sitemap markers are missing")
    entries = []
    for release in releases:
        lastmod = date_only(release.get("published", "")) or "2026-08-07"
        entries.append(
            f'  <url><loc>https://nextgensessions.com{esc(release["url"])}</loc><lastmod>{esc(lastmod)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>'
        )
    block = f"{SITEMAP_START}\n" + "\n".join(entries) + f"\n  {SITEMAP_END}"
    source = re.sub(
        re.escape(SITEMAP_START) + r"[\s\S]*?" + re.escape(SITEMAP_END),
        block,
        source,
        count=1,
    )
    path.write_text(source, encoding="utf-8")


def schema_video_id(item: dict) -> str:
    for key in ("url", "contentUrl", "embedUrl"):
        value = str(item.get(key, ""))
        match = re.search(r"(?:[?&]v=|/embed/)([A-Za-z0-9_-]{11})", value)
        if match:
            return match.group(1)
    return ""


def sync_artist_schema_dates(releases: list[dict]) -> None:
    published_by_id = {
        release["id"]: date_only(release.get("published", ""))
        for release in releases
        if date_only(release.get("published", ""))
    }

    def update_node(node: object) -> None:
        if isinstance(node, dict):
            video_id = schema_video_id(node)
            if video_id in published_by_id and "VideoObject" in str(node.get("@type", "")):
                node["datePublished"] = published_by_id[video_id]
            for value in node.values():
                update_node(value)
        elif isinstance(node, list):
            for value in node:
                update_node(value)

    def update_script(match: re.Match[str]) -> str:
        try:
            payload = json.loads(match.group(2))
        except json.JSONDecodeError:
            return match.group(0)
        update_node(payload)
        rendered = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        return match.group(1) + rendered + match.group(3)

    for path in sorted((ROOT / "artists").glob("*/index.html")):
        source = path.read_text(encoding="utf-8")
        updated = JSON_LD_PATTERN.sub(update_script, source)
        if updated != source:
            path.write_text(updated, encoding="utf-8")


def sync_profile_config_dates(releases: list[dict]) -> None:
    published_by_id = {
        release["id"]: release.get("published", "")
        for release in releases
        if release.get("published")
    }
    paths = [ROOT / "artist-profiles.js", ROOT / "artist-profiles-expanded.js"]
    paths.extend(sorted((ROOT / "artists").glob("*/profile.js")))
    for path in paths:
        source = path.read_text(encoding="utf-8")
        updated = source
        for video_id, published in published_by_id.items():
            pattern = re.compile(
                rf'(\{{\s*"id"\s*:\s*"{re.escape(video_id)}"(?:(?!\n\s*\}})[\s\S])*?"published"\s*:\s*")[^"]*(")'
            )
            updated = pattern.sub(lambda match: match.group(1) + published + match.group(2), updated)
        if updated != source:
            path.write_text(updated, encoding="utf-8")


def main() -> None:
    catalogue_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "releases.json"
    if not catalogue_path.is_absolute():
        catalogue_path = ROOT / catalogue_path
    payload = json.loads(catalogue_path.read_text(encoding="utf-8"))
    releases = assign_urls(payload.get("releases", []))
    payload["releases"] = releases
    payload["total"] = len(releases)
    catalogue_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    render_archive(releases)
    render_pages(releases)
    render_sitemap(releases)
    sync_artist_schema_dates(releases)
    sync_profile_config_dates(releases)
    print(f"Rendered {len(releases)} crawlable release pages")


if __name__ == "__main__":
    main()
