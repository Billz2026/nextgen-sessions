#!/usr/bin/env python3
"""Regression checks for the single canonical NextGen Sessions production domain."""

from __future__ import annotations

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

CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>', re.IGNORECASE)
OG_URL_RE = re.compile(r'<meta\s+property="og:url"\s+content="([^"]+)"\s*/?>', re.IGNORECASE)
LOC_RE = re.compile(r'<loc>([^<]+)</loc>', re.IGNORECASE)
ROBOTS_SITEMAP_RE = re.compile(r'^Sitemap:\s*(\S+)\s*$', re.IGNORECASE | re.MULTILINE)


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


checked = 0
for path in sorted(ROOT.rglob("*.html")):
    if ".git" in path.parts:
        continue
    source = path.read_text(encoding="utf-8")
    if 'class="site-header"' not in source:
        continue
    assert_no_forbidden(path, source)
    if path.relative_to(ROOT).as_posix() == "404.html":
        continue

    expected = ORIGIN + public_path(path.relative_to(ROOT))
    canonical = CANONICAL_RE.findall(source)
    og_urls = OG_URL_RE.findall(source)
    assert canonical == [expected], f"Canonical mismatch in {path.relative_to(ROOT)}: {canonical}, expected {expected}"
    assert og_urls == [expected], f"og:url mismatch in {path.relative_to(ROOT)}: {og_urls}, expected {expected}"
    checked += 1

assert checked >= 100, f"Unexpectedly few canonical pages checked: {checked}"

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
    "the old Pages hostname remains only as a 301 redirect target detector."
)
