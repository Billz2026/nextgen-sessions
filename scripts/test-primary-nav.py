#!/usr/bin/env python3
"""Regression checks for the shared NextGen Sessions primary navigation."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAV_PATTERN = re.compile(
    r'<nav\s+class="nav"\s+aria-label="Primary navigation">([\s\S]*?)</nav>',
    re.IGNORECASE,
)
ANCHOR_PATTERN = re.compile(r'<a\b([^>]*)>([^<]+)</a>', re.IGNORECASE)
HREF_PATTERN = re.compile(r'\bhref="([^"]+)"', re.IGNORECASE)

EXPECTED = [
    ("Home", "/"),
    ("Artists", "/artists/"),
    ("Releases", "/releases/"),
    ("Genres", "/genres/"),
    ("Mixes", "/mixes/"),
    ("About", "/#about"),
    ("Submit", "/submit.html"),
    ("YouTube", "https://www.youtube.com/@NextGenSessions"),
]


def expected_current(relative: Path) -> str | None:
    value = relative.as_posix()
    if value == "index.html":
        return "Home"
    if value.startswith("artists/"):
        return "Artists"
    if value.startswith("releases/"):
        return "Releases"
    if value.startswith("genres/"):
        return "Genres"
    if value.startswith("mixes/"):
        return "Mixes"
    if value == "submit.html":
        return "Submit"
    return None


checked = 0
for path in sorted(ROOT.rglob("*.html")):
    relative = path.relative_to(ROOT)
    html = path.read_text(encoding="utf-8")
    if 'class="site-header"' not in html and 'aria-label="Primary navigation"' not in html:
        continue

    match = NAV_PATTERN.search(html)
    assert match, f"Primary navigation missing or malformed in {relative}"
    checked += 1

    links = []
    current_labels = []
    for attrs, label in ANCHOR_PATTERN.findall(match.group(1)):
        href = HREF_PATTERN.search(attrs)
        assert href, f"Navigation link without href in {relative}: {label}"
        links.append((label.strip(), href.group(1)))
        if 'aria-current="page"' in attrs:
            current_labels.append(label.strip())

    assert links == EXPECTED, f"Primary navigation drift in {relative}: {links}"

    active = expected_current(relative)
    if active:
        assert current_labels == [active], f"Wrong aria-current in {relative}: {current_labels}, expected {active}"
    else:
        assert not current_labels, f"Unexpected aria-current in {relative}: {current_labels}"

    youtube_attrs = next(attrs for attrs, label in ANCHOR_PATTERN.findall(match.group(1)) if label.strip() == "YouTube")
    assert 'class="nav-cta"' in youtube_attrs, f"YouTube CTA class missing in {relative}"
    assert 'target="_blank"' in youtube_attrs, f"YouTube target missing in {relative}"
    assert 'rel="noopener"' in youtube_attrs, f"YouTube rel missing in {relative}"

assert checked >= 10, f"Unexpectedly few navigable pages checked: {checked}"
print(f"Primary navigation validated across {checked} HTML pages.")
