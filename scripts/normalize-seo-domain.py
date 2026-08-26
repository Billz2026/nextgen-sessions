#!/usr/bin/env python3
"""Normalize the canonical production origin and search metadata across public site surfaces."""

from __future__ import annotations

import html
import json
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
    "mixes/index.html": {
        "title": "UK Rap, Dancehall & Hip-Hop Mixes | NextGen Sessions",
        "description": "Play UK rap, dancehall, grime and hip-hop mixes on NextGen Sessions, including long-form mashups, summer sessions and curated genre collections.",
    },
    "mixes/dancehall-mashups/index.html": {
        "title": "Dancehall Mix 2026 | Mashup Series | NextGen Sessions",
        "description": "Play three Dancehall Mashup mixes from 2026, including the 1-hour Gullyside Takeover. Discover original NextGen dancehall releases and artists.",
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
ARTIST_GENRE_CTA_RE = re.compile(
    r'\s*<a\s+class="button button-secondary"\s+href="/genres/[^"]+/">Explore [^<]+</a>',
    re.IGNORECASE,
)


def load_roster() -> list[dict[str, object]]:
    source = (ROOT / "artists.js").read_text(encoding="utf-8")
    match = re.search(r"window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);", source)
    if not match:
        raise AssertionError("artists.js must expose window.NGS_ARTISTS")
    roster = json.loads(match.group(1))
    if not isinstance(roster, list) or not roster:
        raise AssertionError("Artist roster is empty")
    return roster


def load_catalogue() -> list[dict[str, object]]:
    payload = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
    releases = payload.get("releases", [])
    if not isinstance(releases, list):
        raise AssertionError("releases.json must expose a releases list")
    return releases


ROSTER = load_roster()
ROSTER_BY_SLUG = {str(item.get("slug", "")): item for item in ROSTER if item.get("slug")}
CATALOGUE = load_catalogue()


def normalise(value: object) -> str:
    return (
        str(value or "")
        .replace("’", "'")
        .replace("‘", "'")
        .strip()
        .lower()
    )


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
    rule = CTR_METADATA.get(relative.as_posix())
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


def artist_lane(genre: object) -> dict[str, str] | None:
    value = normalise(genre)
    if "uk rap" in value or "grime" in value:
        return {
            "href": "/genres/uk-rap-grime/",
            "label": "Explore UK Rap & Grime",
            "name": "UK Rap & Grime",
            "seo_genre": "UK Rap",
        }
    if "dancehall" in value:
        return {
            "href": "/genres/dancehall/",
            "label": "Explore Dancehall",
            "name": "Dancehall",
            "seo_genre": "Jamaican Dancehall" if "jamaican" in value else "Dancehall",
        }
    if "reggae" in value or "lovers rock" in value:
        return {
            "href": "/genres/reggae-lovers-rock/",
            "label": "Explore Reggae & Lovers Rock",
            "name": "Reggae & Lovers Rock",
            "seo_genre": "Reggae",
        }
    if "r&b" in value:
        return {
            "href": "/genres/rnb-soul/",
            "label": "Explore R&B & Soul",
            "name": "R&B & Soul",
            "seo_genre": "R&B",
        }
    if "hip-hop" in value or "g-funk" in value:
        if "west coast" in value:
            seo_genre = "West Coast Hip-Hop"
        elif "new york" in value:
            seo_genre = "New York Hip-Hop"
        else:
            seo_genre = "Hip-Hop"
        return {
            "href": "/genres/hip-hop-g-funk/",
            "label": "Explore Hip-Hop & G-Funk",
            "name": "Hip-Hop & G-Funk",
            "seo_genre": seo_genre,
        }
    if any(term in value for term in ("punjabi", "south asian", "arabic", "afro")):
        if "punjabi" in value or "south asian" in value:
            seo_genre = "Punjabi"
        elif "arabic" in value:
            seo_genre = "Arabic Soul"
        elif "afro" in value:
            seo_genre = "Afro-Swing"
        else:
            seo_genre = "Global Music"
        return {
            "href": "/genres/global-sounds/",
            "label": "Explore Global Sounds",
            "name": "Global Sounds",
            "seo_genre": seo_genre,
        }
    return None


def release_matches_artist(release: dict[str, object], artist_name: str) -> bool:
    release_artist = normalise(release.get("artist"))
    artist = normalise(artist_name)
    if not release_artist or not artist:
        return False
    if release_artist == artist:
        return True
    escaped = re.escape(artist)
    return re.search(rf"(^|\s){escaped}(\s|$|,|&|x|feat\.?|ft\.?)", release_artist, flags=re.IGNORECASE) is not None


def artist_releases(artist_name: str) -> list[dict[str, object]]:
    releases = [item for item in CATALOGUE if release_matches_artist(item, artist_name)]
    return sorted(
        releases,
        key=lambda item: (
            str(item.get("published", "")),
            str(item.get("title", "")),
        ),
        reverse=True,
    )


def article_for(seo_genre: str) -> str:
    lowered = seo_genre.lower()
    return "an" if lowered.startswith(("r&b", "arabic")) else "a"


def artist_description(name: str, lane: dict[str, str], releases: list[dict[str, object]]) -> str:
    seo_genre = lane["seo_genre"]
    base = f"Discover {name}, {article_for(seo_genre)} {seo_genre} artist on NextGen Sessions."
    latest_titles = [str(item.get("title", "")).strip() for item in releases[:2] if item.get("title")]
    release_text = ""
    if latest_titles:
        joined = latest_titles[0] if len(latest_titles) == 1 else f"{latest_titles[0]} and {latest_titles[1]}"
        release_text = f" Listen to {joined}."
    tail = f" Explore more {lane['name'].lower()} releases."
    candidate = base + release_text + tail
    if len(candidate) <= 160:
        return candidate
    if len(latest_titles) > 1:
        candidate = base + f" Listen to {latest_titles[0]}." + tail
        if len(candidate) <= 160:
            return candidate
    candidate = base + (f" Listen to {latest_titles[0]}." if latest_titles else "")
    if len(candidate) <= 160:
        return candidate
    return candidate[:157].rstrip(" .,:;-") + "..."


def replace_metadata(source: str, title: str, description: str) -> str:
    title_html = html.escape(title, quote=False)
    description_html = html.escape(description, quote=True)
    replacements = (
        (TITLE_RE, f"<title>{title_html}</title>"),
        (DESCRIPTION_RE, f'<meta name="description" content="{description_html}">'),
        (OG_TITLE_RE, f'<meta property="og:title" content="{title_html}">'),
        (OG_DESCRIPTION_RE, f'<meta property="og:description" content="{description_html}">'),
        (TWITTER_TITLE_RE, f'<meta name="twitter:title" content="{title_html}">'),
        (TWITTER_DESCRIPTION_RE, f'<meta name="twitter:description" content="{description_html}">'),
    )
    next_source = source
    for pattern, replacement in replacements:
        if pattern.search(next_source):
            next_source = pattern.sub(replacement, next_source, count=1)
    return next_source


def apply_artist_catalogue_seo(relative: Path, source: str) -> str:
    parts = relative.parts
    if len(parts) != 3 or parts[0] != "artists" or parts[2] != "index.html":
        return source

    slug = parts[1]
    artist = ROSTER_BY_SLUG.get(slug)
    if not artist:
        return source

    name = str(artist.get("name", "")).strip()
    genre = artist.get("genre", "")
    lane = artist_lane(genre)
    if not lane:
        raise AssertionError(f"No genre hub mapping for artist {name}: {genre}")

    releases = artist_releases(name)
    title = f"{name} | {lane['seo_genre']} Artist | NextGen Sessions"
    description = artist_description(name, lane, releases)
    next_source = replace_metadata(source, title, description)

    next_source = ARTIST_GENRE_CTA_RE.sub("", next_source)
    genre_label = html.escape(lane["label"], quote=False)
    genre_cta = f'<a class="button button-secondary" href="{lane["href"]}">{genre_label}</a>'
    all_artists = '<a class="button button-secondary" href="/artists/">All artists</a>'
    if all_artists not in next_source:
        raise AssertionError(f"Artist page missing All artists CTA: {relative.as_posix()}")
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
    next_source = apply_artist_catalogue_seo(relative, next_source)

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
        f"Canonical production origin, CTR metadata and catalogue-aware artist metadata normalized across "
        f"{scanned} HTML pages; changed {changed} file(s)."
    )


if __name__ == "__main__":
    main()
