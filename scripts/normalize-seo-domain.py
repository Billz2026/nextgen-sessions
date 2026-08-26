#!/usr/bin/env python3
"""Normalize the canonical production origin across rendered site surfaces."""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://nextgensessions.com"
OLD_ORIGINS = (
    "https://nextgensessions.pages.dev",
    "http://nextgensessions.pages.dev",
    "https://www.nextgensessions.com",
    "http://www.nextgensessions.com",
    "http://nextgensessions.com",
)

CTR_METADATA = {
    "index.html": {
        "title": "NextGen Sessions | New UK Rap, Dancehall, Hip-Hop & R&B",
        "description": "Discover and listen to new UK rap, dancehall, hip-hop, R&B and reggae from independent NextGen Sessions artists, releases and mixes.",
    },
    "releases/reeko-after-di-party/index.html": {
        "title": "Reeko – After Di Party | Dancehall 2026 | NextGen Sessions",
        "description": "Listen to Reeko – After Di Party, a 2026 dancehall release on NextGen Sessions. Watch the full video, explore Reeko and discover more dancehall.",
    },
    "artists/alonzo-ray/index.html": {
        "title": "Alonzo Ray | West Coast Hip-Hop Artist | NextGen Sessions",
        "description": "Discover Alonzo Ray, a West Coast hip-hop artist on NextGen Sessions. Explore the Seasoned project and releases including Pasadena and All In My Name.",
    },
    "mixes/index.html": {
        "title": "UK Rap, Dancehall & Hip-Hop Mixes | NextGen Sessions",
        "description": "Play UK rap, dancehall, grime and hip-hop mixes on NextGen Sessions, including long-form mashups, summer sessions and curated genre collections.",
    },
    "mixes/dancehall-mashups/index.html": {
        "title": "Dancehall Mix 2026 | Mashup Series | NextGen Sessions",
        "description": "Play three Dancehall Mashup mixes from 2026, including the 1-hour Gullyside Takeover. Discover original NextGen dancehall releases and artists.",
    },
}

ENTITY_METADATA = {
    "artists/kemarco/index.html": {
        "title": "Kemarco | Jamaican Dancehall Artist | NextGen Sessions",
        "description": "Discover Kemarco, a Jamaican dancehall artist on NextGen Sessions. Listen to Ghetto Blessings and Badman Don’t Rush and explore more dancehall releases.",
    },
    "artists/nyah-rae/index.html": {
        "title": "Nyah Rae | R&B Artist | NextGen Sessions",
        "description": "Discover Nyah Rae, a contemporary R&B artist on NextGen Sessions. Listen to I’m Not Surprised, You Can’t Afford Me and No Reply.",
    },
}

ARTIST_ENTITY_UI = {
    "artists/kemarco/index.html": {
        "override": "/artists/kemarco/profile.js?v=20260826-entity1",
        "genre_href": "/genres/dancehall/",
        "genre_label": "Explore Dancehall",
    },
    "artists/nyah-rae/index.html": {
        "override": "/artists/nyah-rae/profile.js?v=20260826-entity1",
        "genre_href": "/genres/rnb-soul/",
        "genre_label": "Explore R&B & Soul",
    },
}

CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>', re.IGNORECASE)
OG_URL_RE = re.compile(r'<meta\s+property="og:url"\s+content="[^"]*"\s*/?>', re.IGNORECASE)
TITLE_RE = re.compile(r'<title>[\s\S]*?</title>', re.IGNORECASE)
DESCRIPTION_RE = re.compile(r'<meta\s+name="description"\s+content="[^"]*"\s*/?>', re.IGNORECASE)
OG_TITLE_RE = re.compile(r'<meta\s+property="og:title"\s+content="[^"]*"\s*/?>', re.IGNORECASE)
OG_DESCRIPTION_RE = re.compile(r'<meta\s+property="og:description"\s+content="[^"]*"\s*/?>', re.IGNORECASE)
TWITTER_TITLE_RE = re.compile(r'<meta\s+name="twitter:title"\s+content="[^"]*"\s*/?>', re.IGNORECASE)
TWITTER_DESCRIPTION_RE = re.compile(r'<meta\s+name="twitter:description"\s+content="[^"]*"\s*/?>', re.IGNORECASE)


def public_path(relative: Path) -> str:
    value = relative.as_posix()
    if value == "index.html":
        return "/"
    if relative.name == "index.html":
        parent = relative.parent.as_posix().strip("/")
        return f"/{parent}/"
    return f"/{value}"


def canonical_url(relative: Path) -> str:
    return ORIGIN + public_path(relative)


def normalize_absolute_origin(source: str) -> str:
    for old in OLD_ORIGINS:
        source = source.replace(old, ORIGIN)
    return source


def insert_after_description(source: str, tag: str) -> str:
    description = re.search(r'<meta\s+name="description"[^>]*>', source, flags=re.IGNORECASE)
    if description:
        return source[: description.end()] + "\n  " + tag + source[description.end() :]
    head = re.search(r'<head[^>]*>', source, flags=re.IGNORECASE)
    if not head:
        raise AssertionError("HTML page is missing <head>")
    return source[: head.end()] + "\n  " + tag + source[head.end() :]


def apply_search_metadata(relative: Path, source: str) -> str:
    rule = CTR_METADATA.get(relative.as_posix()) or ENTITY_METADATA.get(relative.as_posix())
    if not rule:
        return source

    title = html.escape(rule["title"], quote=False)
    description = html.escape(rule["description"], quote=True)
    replacements = (
        (TITLE_RE, f"<title>{title}</title>"),
        (DESCRIPTION_RE, f'<meta name="description" content="{description}">'),
        (OG_TITLE_RE, f'<meta property="og:title" content="{title}">'),
        (OG_DESCRIPTION_RE, f'<meta property="og:description" content="{description}">'),
        (TWITTER_TITLE_RE, f'<meta name="twitter:title" content="{title}">'),
        (TWITTER_DESCRIPTION_RE, f'<meta name="twitter:description" content="{description}">'),
    )
    next_source = source
    for pattern, replacement in replacements:
        if pattern.search(next_source):
            next_source = pattern.sub(replacement, next_source, count=1)
    return next_source


def apply_artist_entity_ui(relative: Path, source: str) -> str:
    rule = ARTIST_ENTITY_UI.get(relative.as_posix())
    if not rule:
        return source

    next_source = source
    override_tag = f'<script src="{rule["override"]}" defer></script>'
    if override_tag not in next_source:
        marker = '<script src="/artist-profile.js?v=20260810-playerfirst1" defer></script>'
        if marker in next_source:
            next_source = next_source.replace(marker, override_tag + "\n  " + marker, 1)

    genre_label = html.escape(rule["genre_label"], quote=False)
    genre_cta = f'<a class="button button-secondary" href="{rule["genre_href"]}">{genre_label}</a>'
    if genre_cta not in next_source:
        all_artists = '<a class="button button-secondary" href="/artists/">All artists</a>'
        if all_artists in next_source:
            next_source = next_source.replace(all_artists, genre_cta + "\n          " + all_artists, 1)

    return next_source


def normalize_html(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    source = path.read_text(encoding="utf-8")
    if 'class="site-header"' not in source:
        return False

    next_source = normalize_absolute_origin(source)
    if relative.as_posix() == "404.html":
        if next_source == source:
            return False
        path.write_text(next_source, encoding="utf-8")
        return True

    expected = canonical_url(relative)
    canonical_tag = f'<link rel="canonical" href="{expected}">'
    if CANONICAL_RE.search(next_source):
        next_source = CANONICAL_RE.sub(canonical_tag, next_source, count=1)
    else:
        next_source = insert_after_description(next_source, canonical_tag)

    og_tag = f'<meta property="og:url" content="{expected}">'
    if OG_URL_RE.search(next_source):
        next_source = OG_URL_RE.sub(og_tag, next_source, count=1)
    else:
        canonical_match = CANONICAL_RE.search(next_source)
        if canonical_match:
            next_source = next_source[: canonical_match.end()] + "\n  " + og_tag + next_source[canonical_match.end() :]
        else:
            next_source = insert_after_description(next_source, og_tag)

    next_source = apply_search_metadata(relative, next_source)
    next_source = apply_artist_entity_ui(relative, next_source)

    if next_source == source:
        return False
    path.write_text(next_source, encoding="utf-8")
    return True


def normalize_text_file(path: Path) -> bool:
    if not path.exists():
        return False
    source = path.read_text(encoding="utf-8")
    next_source = normalize_absolute_origin(source)
    if next_source == source:
        return False
    path.write_text(next_source, encoding="utf-8")
    return True


def normalize_worker_bundle() -> bool:
    path = ROOT / ".worker" / "index.js"
    if not path.exists():
        return False
    source = path.read_text(encoding="utf-8")
    old = 'const environment = hostname.includes("nextgen-sessions-staging") ? "staging" : hostname === "nextgensessions.pages.dev" ? "production" : hostname.endsWith(".nextgensessions.pages.dev") ? "preview" : "custom-domain";'
    new = 'const environment = hostname === "nextgensessions.com" || hostname === "www.nextgensessions.com" ? "production" : hostname.includes("nextgen-sessions-staging") ? "staging" : hostname.endsWith(".workers.dev") ? "preview" : "custom-domain";'
    next_source = source.replace(old, new)
    if next_source == source:
        return False
    path.write_text(next_source, encoding="utf-8")
    return True


def main() -> None:
    scanned = 0
    changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        if ".git" in path.parts:
            continue
        source = path.read_text(encoding="utf-8")
        if 'class="site-header"' not in source:
            continue
        scanned += 1
        if normalize_html(path):
            changed += 1

    for path in sorted(ROOT.glob("sitemap*.xml")):
        if normalize_text_file(path):
            changed += 1
    if normalize_text_file(ROOT / "robots.txt"):
        changed += 1

    if normalize_worker_bundle():
        changed += 1

    if not scanned:
        raise SystemExit("No public site HTML pages were found for canonical normalization")
    print(
        f"Canonical production origin, CTR metadata and search-entity metadata normalized across "
        f"{scanned} HTML pages; changed {changed} file(s)."
    )


if __name__ == "__main__":
    main()
