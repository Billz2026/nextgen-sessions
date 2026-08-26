#!/usr/bin/env python3
"""Regression checks for the single canonical NextGen Sessions production domain."""

from __future__ import annotations

import html
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
    "artists/alonzo-ray/index.html": (
        "Alonzo Ray | West Coast Hip-Hop Artist | NextGen Sessions",
        "Discover Alonzo Ray, a West Coast hip-hop artist on NextGen Sessions. Explore the Seasoned project and releases including Pasadena and All In My Name.",
    ),
    "mixes/index.html": (
        "UK Rap, Dancehall & Hip-Hop Mixes | NextGen Sessions",
        "Play UK rap, dancehall, grime and hip-hop mixes on NextGen Sessions, including long-form mashups, summer sessions and curated genre collections.",
    ),
}

ENTITY_EXPECTED = {
    "artists/kemarco/index.html": (
        "Kemarco | Jamaican Dancehall Artist | NextGen Sessions",
        "Discover Kemarco, a Jamaican dancehall artist on NextGen Sessions. Listen to Ghetto Blessings and Badman Don’t Rush and explore more dancehall releases.",
    ),
    "artists/nyah-rae/index.html": (
        "Nyah Rae | R&B Artist | NextGen Sessions",
        "Discover Nyah Rae, a contemporary R&B artist on NextGen Sessions. Listen to I’m Not Surprised, You Can’t Afford Me and No Reply.",
    ),
}

CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>', re.IGNORECASE)
OG_URL_RE = re.compile(r'<meta\s+property="og:url"\s+content="([^"]+)"\s*/?>', re.IGNORECASE)
LOC_RE = re.compile(r'<loc>([^<]+)</loc>', re.IGNORECASE)
ROBOTS_SITEMAP_RE = re.compile(r'^Sitemap:\s*(\S+)\s*$', re.IGNORECASE | re.MULTILINE)
TITLE_RE = re.compile(r'<title>([\s\S]*?)</title>', re.IGNORECASE)
DESCRIPTION_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]*)"\s*/?>', re.IGNORECASE)
OG_TITLE_RE = re.compile(r'<meta\s+property="og:title"\s+content="([^"]*)"\s*/?>', re.IGNORECASE)
TWITTER_TITLE_RE = re.compile(r'<meta\s+name="twitter:title"\s+content="([^"]*)"\s*/?>', re.IGNORECASE)


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


checked = 0
for path in sorted(ROOT.rglob("*.html")):
    if ".git" in path.parts:
        continue
    source = path.read_text(encoding="utf-8")
    if 'class="site-header"' not in source:
        continue
    assert_no_forbidden(path, source)
    relative = path.relative_to(ROOT).as_posix()
    if relative == "404.html":
        continue

    expected = ORIGIN + public_path(path.relative_to(ROOT))
    canonical = CANONICAL_RE.findall(source)
    og_urls = OG_URL_RE.findall(source)
    assert canonical == [expected], f"Canonical mismatch in {path.relative_to(ROOT)}: {canonical}, expected {expected}"
    assert og_urls == [expected], f"og:url mismatch in {path.relative_to(ROOT)}: {og_urls}, expected {expected}"

    search_expected = CTR_EXPECTED.get(relative) or ENTITY_EXPECTED.get(relative)
    if search_expected:
        expected_title, expected_description = search_expected
        title = decoded_match(TITLE_RE, source, "title", relative)
        description = decoded_match(DESCRIPTION_RE, source, "meta description", relative)
        og_title = decoded_match(OG_TITLE_RE, source, "og:title", relative)
        twitter_title = decoded_match(TWITTER_TITLE_RE, source, "twitter:title", relative)
        assert title == expected_title, f"Search title reverted in {relative}: {title!r}"
        assert description == expected_description, f"Search description reverted in {relative}: {description!r}"
        assert og_title == expected_title, f"Search og:title reverted in {relative}: {og_title!r}"
        assert twitter_title == expected_title, f"Search twitter:title reverted in {relative}: {twitter_title!r}"

    if relative == "artists/kemarco/index.html":
        assert "Kemarco is a Jamaican dancehall artist from Jamaica" in source, "Kemarco entity-first bio is missing"
        assert 'href="/releases/kemarco-ghetto-blessings/">Latest release: Ghetto Blessings</a>' in source, "Kemarco latest release signal is stale"
        assert 'href="/genres/dancehall/">Explore Dancehall</a>' in source, "Kemarco Dancehall hub link is missing"
        assert '/artists/kemarco/profile.js?v=20260826-entity1' in source, "Kemarco browser profile override is missing"

    if relative == "artists/nyah-rae/index.html":
        assert "Nyah Rae is a contemporary R&B artist on NextGen Sessions" in source, "Nyah Rae entity-first bio is missing"
        assert 'href="/releases/nyah-rae-im-not-surprised/">Latest release: I’m Not Surprised</a>' in source, "Nyah Rae latest release signal is stale"
        assert 'href="/genres/rnb-soul/">Explore R&amp;B &amp; Soul</a>' in source, "Nyah Rae R&B & Soul hub link is missing"
        assert '/artists/nyah-rae/profile.js?v=20260826-entity1' in source, "Nyah Rae browser profile override is missing"

    checked += 1

assert checked >= 100, f"Unexpectedly few canonical pages checked: {checked}"

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
    f"SEO domain audit passed: {checked} canonical HTML pages, {len(sitemap_files)} sitemap files / "
    f"{len(all_locations)} sitemap URLs, and {len(set(runtime_files))} runtime text files use the canonical production domain; "
    f"{len(CTR_EXPECTED)} CTR targets and {len(ENTITY_EXPECTED)} artist search entity targets are locked; "
    "the old Pages hostname remains only as a 301 redirect target detector."
)
