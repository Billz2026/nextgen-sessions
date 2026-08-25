#!/usr/bin/env python3
"""Normalize the global primary navigation across every rendered HTML page."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAV_PATTERN = re.compile(
    r'<nav\s+class="nav"\s+aria-label="Primary navigation">[\s\S]*?</nav>',
    re.IGNORECASE,
)

ITEMS = [
    ("Home", "/"),
    ("Artists", "/artists/"),
    ("Releases", "/releases/"),
    ("Genres", "/genres/"),
    ("Mixes", "/mixes/"),
    ("About", "/#about"),
    ("Submit", "/submit.html"),
]


def current_section(relative: Path) -> str | None:
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


def build_nav(relative: Path) -> str:
    active = current_section(relative)
    anchors: list[str] = []
    for label, href in ITEMS:
        current = ' aria-current="page"' if label == active else ""
        anchors.append(f'<a{current} href="{href}">{label}</a>')
    anchors.append(
        '<a class="nav-cta" href="https://www.youtube.com/@NextGenSessions" '
        'target="_blank" rel="noopener">YouTube</a>'
    )
    return '<nav class="nav" aria-label="Primary navigation">' + "".join(anchors) + "</nav>"


def main() -> None:
    scanned = 0
    changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        relative = path.relative_to(ROOT)
        source = path.read_text(encoding="utf-8")
        if 'aria-label="Primary navigation"' not in source:
            continue
        scanned += 1
        if not NAV_PATTERN.search(source):
            raise SystemExit(f"Could not parse primary navigation in {relative}")
        replacement = build_nav(relative)
        next_source = NAV_PATTERN.sub(replacement, source, count=1)
        if next_source != source:
            path.write_text(next_source, encoding="utf-8")
            changed += 1

    if not scanned:
        raise SystemExit("No primary navigation blocks were found")
    print(f"Normalized primary navigation on {scanned} pages; changed {changed}.")


if __name__ == "__main__":
    main()
