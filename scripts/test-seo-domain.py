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

sitemap_path = ROOT / "sitemap.xml"
sitemap = sitemap_path.read_text(encoding="utf-8")
assert_no_forbidden(sitemap_path, sitemap)
locations = LOC_RE.findall(sitemap)
assert locations, "Sitemap contains no <loc> entries"
for location in locations:
    assert location.startswith(ORIGIN + "/") or location == ORIGIN, f"Non-canonical sitemap URL: {location}"

robots_path = ROOT / "robots.txt"
if robots_path.exists():
    assert_no_forbidden(robots_path, robots_path.read_text(encoding="utf-8"))

runtime_files: list[Path] = []
for pattern in ("*.js", "*.json", "*.jsonc"):
    for path in ROOT.rglob(pattern):
        relative = path.relative_to(ROOT)
        if ".git" in path.parts or relative.parts[:1] == ("scripts",):
            continue
        runtime_files.append(path)

for path in sorted(set(runtime_files)):
    assert_no_forbidden(path, path.read_text(encoding="utf-8"))

worker = (ROOT / ".worker" / "index.js").read_text(encoding="utf-8")
assert 'hostname === "nextgensessions.com"' in worker, "Production Worker does not recognise the canonical hostname"
assert 'hostname === "www.nextgensessions.com"' in worker, "Production Worker does not recognise the www hostname"

print(
    f"SEO domain audit passed: {checked} canonical HTML pages, {len(locations)} sitemap URLs, "
    f"and {len(set(runtime_files))} runtime text files use the canonical production domain."
)
