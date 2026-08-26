#!/usr/bin/env python3
"""Regression checks for the canonical NextGen Sessions production domain and artist SEO."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://nextgensessions.com"
LEGACY_HOST = "nextgensessions" + ".pages.dev"
FORBIDDEN = (
    LEGACY_HOST,
    "http://nextgensessions.com",
    "https://www.nextgensessions.com",
    "http://www.nextgensessions.com",
)

CTR_EXPECTED = {
    "index.html": (
        "NextGen Sessions | New UK Rap, Dancehall, Hip-Hop & R&B",
        "Discover and listen to new UK rap, dancehall, hip-hop, R&B and reggae from independent NextGen Sessions artists, releases and mixes.",
    ),
    "releases/reeko-after-di-party/index.html": (
        "Reeko – After Di Party | Dancehall 2026 | NextGen Sessions",
        "Listen to Reeko – After Di Party, a 2026 dancehall release on NextGen Sessions. Watch the full video, explore Reeko and discover more dancehall.",
    ),
    "mixes/index.html": (
        "UK Rap, Dancehall & Hip-Hop Mixes | NextGen Sessions",
        "Play UK rap, dancehall, grime and hip-hop mixes on NextGen Sessions, including long-form mashups, summer sessions and curated genre collections.",
    ),
    "mixes/dancehall-mashups/index.html": (
        "Dancehall Mix 2026 | Mashup Series | NextGen Sessions",
        "Play three Dancehall Mashup mixes from 2026, including the 1-hour Gullyside Takeover. Discover original NextGen dancehall releases and artists.",
    ),
}

CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>', re.IGNORECASE)
OG_URL_RE = re.compile(r'<meta\s+property="og:url"\s+content="([^"]+)"\s*/?>', re.IGNORECASE)
LOC_RE = re.compile(r'<loc>([^<]+)</loc>', re.IGNORECASE)
ROBOTS_SITEMAP_RE = re.compile(r'^Sitemap:\s*(\S+)\s*$', re.IGNORECASE | re.MULTILINE)
TITLE_RE = re.compile(r'<title>([\s\S]*?)</title>', re.IGNORECASE)
DESCRIPTION_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]*)"\s*/?>', re.IGNORECASE)
OG_TITLE_RE = re.compile(r'<meta\s+property="og:title"\s+content="([^"]*)"\s*/?>', re.IGNORECASE)
OG_DESCRIPTION_RE = re.compile(r'<meta\s+property="og:description"\s+content="([^"]*)"\s*/?>', re.IGNORECASE)
TWITTER_TITLE_RE = re.compile(r'<meta\s+name="twitter:title"\s+content="([^"]*)"\s*/?>', re.IGNORECASE)
TWITTER_DESCRIPTION_RE = re.compile(r'<meta\s+name="twitter:description"\s+content="([^"]*)"\s*/?>', re.IGNORECASE)


def load_roster() -> list[dict[str, object]]:
    source = (ROOT / "artists.js").read_text(encoding="utf-8")
    match = re.search(r"window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);", source)
    assert match, "artists.js must expose window.NGS_ARTISTS"
    roster = json.loads(match.group(1))
    assert isinstance(roster, list) and roster, "Artist roster is empty"
    return roster


def load_catalogue() -> list[dict[str, object]]:
    payload = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
    releases = payload.get("releases", [])
    assert isinstance(releases, list), "releases.json must expose a releases list"
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


def assert_no_forbidden(path: Path, source: str) -> None:
    for value in FORBIDDEN:
        assert value not in source, f"Legacy/non-canonical production host found in {path.relative_to(ROOT)}: {value}"


def decoded_match(pattern: re.Pattern[str], source: str, label: str, relative: str) -> str:
    match = pattern.search(source)
    assert match, f"Missing {label} in {relative}"
    return html.unescape(match.group(1)).strip()


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


checked = 0
artist_checked = 0
for path in sorted(ROOT.rglob("*.html")):
    if ".git" in path.parts:
        continue
    source = path.read_text(encoding="utf-8")
    if 'class="site-header"' not in source:
        continue
    assert_no_forbidden(path, source)
    relative_path = path.relative_to(ROOT)
    relative = relative_path.as_posix()
    if relative == "404.html":
        continue

    expected = ORIGIN + public_path(relative_path)
    canonical = CANONICAL_RE.findall(source)
    og_urls = OG_URL_RE.findall(source)
    assert canonical == [expected], f"Canonical mismatch in {relative_path}: {canonical}, expected {expected}"
    assert og_urls == [expected], f"og:url mismatch in {relative_path}: {og_urls}, expected {expected}"

    search_expected = CTR_EXPECTED.get(relative)
    if search_expected:
        expected_title, expected_description = search_expected
        title = decoded_match(TITLE_RE, source, "title", relative)
        description = decoded_match(DESCRIPTION_RE, source, "meta description", relative)
        og_title = decoded_match(OG_TITLE_RE, source, "og:title", relative)
        og_description = decoded_match(OG_DESCRIPTION_RE, source, "og:description", relative)
        twitter_title = decoded_match(TWITTER_TITLE_RE, source, "twitter:title", relative)
        twitter_description = decoded_match(TWITTER_DESCRIPTION_RE, source, "twitter:description", relative)
        assert title == expected_title, f"Search title reverted in {relative}: {title!r}"
        assert description == expected_description, f"Search description reverted in {relative}: {description!r}"
        assert og_title == expected_title, f"Search og:title reverted in {relative}: {og_title!r}"
        assert og_description == expected_description, f"Search og:description reverted in {relative}: {og_description!r}"
        assert twitter_title == expected_title, f"Search twitter:title reverted in {relative}: {twitter_title!r}"
        assert twitter_description == expected_description, f"Search twitter:description reverted in {relative}: {twitter_description!r}"

    parts = relative_path.parts
    if len(parts) == 3 and parts[0] == "artists" and parts[2] == "index.html":
        slug = parts[1]
        artist = ROSTER_BY_SLUG.get(slug)
        assert artist, f"Artist page is not represented in artists.js: {relative}"
        name = str(artist.get("name", "")).strip()
        lane = artist_lane(artist.get("genre", ""))
        assert lane, f"No genre hub mapping for {name}: {artist.get('genre')}"
        releases = artist_releases(name)
        expected_title = f"{name} | {lane['seo_genre']} Artist | NextGen Sessions"
        expected_description = artist_description(name, lane, releases)

        title = decoded_match(TITLE_RE, source, "artist title", relative)
        description = decoded_match(DESCRIPTION_RE, source, "artist meta description", relative)
        og_title = decoded_match(OG_TITLE_RE, source, "artist og:title", relative)
        og_description = decoded_match(OG_DESCRIPTION_RE, source, "artist og:description", relative)
        twitter_title = decoded_match(TWITTER_TITLE_RE, source, "artist twitter:title", relative)
        twitter_description = decoded_match(TWITTER_DESCRIPTION_RE, source, "artist twitter:description", relative)

        assert title == expected_title, f"Catalogue-aware artist title is stale in {relative}: {title!r}"
        assert description == expected_description, f"Catalogue-aware artist description is stale in {relative}: {description!r}"
        assert og_title == expected_title, f"Artist og:title is stale in {relative}: {og_title!r}"
        assert og_description == expected_description, f"Artist og:description is stale in {relative}: {og_description!r}"
        assert twitter_title == expected_title, f"Artist twitter:title is stale in {relative}: {twitter_title!r}"
        assert twitter_description == expected_description, f"Artist twitter:description is stale in {relative}: {twitter_description!r}"
        assert len(description) <= 160, f"Artist meta description is too long in {relative}: {len(description)} chars"

        genre_label_html = html.escape(lane["label"], quote=False)
        genre_cta = f'href="{lane["href"]}">{genre_label_html}</a>'
        assert source.count(genre_cta) == 1, f"{name} must have exactly one mapped genre-hub CTA"
        if releases:
            latest_title = str(releases[0].get("title", "")).strip()
            assert latest_title and latest_title in description, f"{name} metadata must mention current latest release {latest_title}"
        artist_checked += 1

    if relative == "artists/kemarco/index.html":
        assert "Kemarco is a Jamaican dancehall artist from Jamaica" in source, "Kemarco entity-first bio is missing"
        assert 'href="/releases/kemarco-ghetto-blessings/">Latest release: Ghetto Blessings</a>' in source, "Kemarco latest release signal is stale"
        assert '/artists/kemarco/profile.js?v=20260826-entity1' in source, "Kemarco browser profile override is missing"

    if relative == "artists/nyah-rae/index.html":
        assert "Nyah Rae is a contemporary R&amp;B artist on NextGen Sessions" in source, "Nyah Rae entity-first bio is missing"
        assert 'href="/releases/nyah-rae-im-not-surprised/">Latest release: I’m Not Surprised</a>' in source, "Nyah Rae latest release signal is stale"
        assert '/artists/nyah-rae/profile.js?v=20260826-entity1' in source, "Nyah Rae browser profile override is missing"

    if relative == "mixes/dancehall-mashups/index.html":
        assert 'href="/genres/dancehall/">Explore Dancehall</a>' in source, "Dancehall mix genre link is missing"
        assert 'href="/artists/kemarco/"' in source, "Dancehall mix Kemarco link is missing"
        assert 'href="/artists/reeko/"' in source, "Dancehall mix Reeko link is missing"
        assert "more than 1 hour 45 minutes" in source, "Dancehall mix long-form context is missing"

    checked += 1

assert checked >= 100, f"Unexpectedly few canonical pages checked: {checked}"
assert artist_checked == len(ROSTER), f"Expected {len(ROSTER)} catalogue-aware artist pages, validated {artist_checked}"

kemarco_profile = (ROOT / "artists" / "kemarco" / "profile.js").read_text(encoding="utf-8")
assert 'title: "Ghetto Blessings"' in kemarco_profile, "Kemarco source still features an older release"
assert 'id: "JI_O7wnEtCc"' in kemarco_profile, "Kemarco Ghetto Blessings video ID is missing from source"
assert 'profile.genreUrl = "/genres/dancehall/"' in kemarco_profile, "Kemarco source is not connected to the Dancehall hub"

nyah_profile = (ROOT / "artists" / "nyah-rae" / "profile.js").read_text(encoding="utf-8")
assert 'title: "I’m Not Surprised"' in nyah_profile, "Nyah Rae source latest release is wrong"
assert 'id: "s4v_aLpMo4Q"' in nyah_profile, "Nyah Rae featured video ID is missing from source"
assert 'profile.genreUrl = "/genres/rnb-soul/"' in nyah_profile, "Nyah Rae source is not connected to the R&B & Soul hub"

sitemap_files = sorted(ROOT.glob("sitemap*.xml"))
assert sitemap_files, "No sitemap files found"
all_locations: list[str] = []
for sitemap_path in sitemap_files:
    sitemap = sitemap_path.read_text(encoding="utf-8")
    assert_no_forbidden(sitemap_path, sitemap)
    locations = LOC_RE.findall(sitemap)
    assert locations, f"Sitemap contains no <loc> entries: {sitemap_path.name}"
    for location in locations:
        assert location.startswith(ORIGIN + "/") or location == ORIGIN, f"Non-canonical sitemap URL in {sitemap_path.name}: {location}"
    all_locations.extend(locations)

robots_path = ROOT / "robots.txt"
if robots_path.exists():
    robots = robots_path.read_text(encoding="utf-8")
    assert_no_forbidden(robots_path, robots)
    advertised = ROBOTS_SITEMAP_RE.findall(robots)
    assert advertised, "robots.txt does not advertise a sitemap"
    for location in advertised:
        assert location.startswith(ORIGIN + "/"), f"robots.txt advertises non-canonical sitemap: {location}"
        assert (ROOT / location.removeprefix(ORIGIN + "/")).exists(), f"robots.txt advertises missing sitemap: {location}"

runtime_files: list[Path] = []
for pattern in ("*.js", "*.json", "*.jsonc"):
    for path in ROOT.rglob(pattern):
        relative = path.relative_to(ROOT)
        if ".git" in path.parts or relative.parts[:1] == ("scripts",):
            continue
        runtime_files.append(path)

redirect_source_path = ROOT / "functions" / "_middleware.js"
worker_path = ROOT / ".worker" / "index.js"
allowed_legacy_paths = {redirect_source_path, worker_path}

for path in sorted(set(runtime_files)):
    if path in allowed_legacy_paths:
        continue
    assert_no_forbidden(path, path.read_text(encoding="utf-8"))

redirect_source = redirect_source_path.read_text(encoding="utf-8")
assert f'const CANONICAL_ORIGIN = "{ORIGIN}"' in redirect_source, "Middleware canonical origin is wrong"
assert LEGACY_HOST in redirect_source, "Legacy Pages hostname redirect protection is missing"
assert 'Response.redirect(destination.toString(), 301)' in redirect_source, "Legacy hostname must 301 to the canonical origin"

worker = worker_path.read_text(encoding="utf-8")
assert worker.count(LEGACY_HOST) == 1, "Worker should retain the old hostname only for the 301 redirect allowlist"
assert 'hostname === "nextgensessions.com"' in worker, "Production Worker does not recognise the canonical hostname"
assert 'hostname === "www.nextgensessions.com"' in worker, "Production Worker does not recognise the www hostname"
assert 'hostname === "nextgensessions.pages.dev" ? "production"' not in worker, "Worker still treats the legacy Pages host as production analytics"

analytics_source = (ROOT / "functions" / "api" / "events.js").read_text(encoding="utf-8")
assert LEGACY_HOST not in analytics_source, "Analytics source still treats the legacy Pages hostname as production"
assert 'hostname === "nextgensessions.com"' in analytics_source, "Analytics source does not recognise the canonical production hostname"

print(
    f"SEO domain audit passed: {checked} canonical HTML pages, {artist_checked} catalogue-aware artist pages, "
    f"{len(sitemap_files)} sitemap files / {len(all_locations)} sitemap URLs, and {len(set(runtime_files))} runtime text files "
    f"use the canonical production domain; {len(CTR_EXPECTED)} non-artist CTR targets are locked; "
    "the old Pages hostname remains only as a 301 redirect target detector."
)
