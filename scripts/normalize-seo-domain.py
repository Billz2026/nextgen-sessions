#!/usr/bin/env python3
"""Normalize the canonical production origin across rendered site surfaces."""

from __future__ import annotations

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

CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>', re.IGNORECASE)
OG_URL_RE = re.compile(r'<meta\s+property="og:url"\s+content="[^"]*"\s*/?>', re.IGNORECASE)


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


def normalize_html(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    source = path.read_text(encoding="utf-8")
    if 'class="site-header"' not in source or relative.as_posix() == "404.html":
        return False

    expected = canonical_url(relative)
    next_source = normalize_absolute_origin(source)

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

    for relative in ("sitemap.xml", "robots.txt"):
        if normalize_text_file(ROOT / relative):
            changed += 1

    if normalize_worker_bundle():
        changed += 1

    if not scanned:
        raise SystemExit("No public site HTML pages were found for canonical normalization")
    print(f"Canonical production origin normalized across {scanned} HTML pages; changed {changed} file(s).")


if __name__ == "__main__":
    main()
