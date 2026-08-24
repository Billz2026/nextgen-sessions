#!/usr/bin/env python3
"""Validate Privacy coverage and the canonical NextGen footer runtime."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOOTER_RE = re.compile(r'<footer\s+class="site-footer"[\s\S]*?</footer>', re.I)
PRIVACY_RE = re.compile(r'href=["\']/privacy/["\']', re.I)
SKIP_PARTS = {".git", "node_modules"}
RUNTIME_MARKERS = (
    '/site-metrics.js',
    '/site.js',
    '/releases.js',
    '/artist-profile.js',
    '/release-player.js',
    '/mix-player.js',
    '/genre-hubs.js',
)

checked: list[Path] = []
missing: list[Path] = []

for path in sorted(ROOT.rglob("*.html")):
    if any(part in SKIP_PARTS for part in path.parts):
        continue
    source = path.read_text(encoding="utf-8")
    footers = FOOTER_RE.findall(source)
    if not footers:
        continue
    checked.append(path)

    direct = all(PRIVACY_RE.search(footer) for footer in footers)
    runtime_covered = any(marker in source for marker in RUNTIME_MARKERS)
    if not direct and not runtime_covered:
        missing.append(path)

if not checked:
    raise SystemExit("No site footers found to validate")

if missing:
    rendered = "\n".join(f" - {path.relative_to(ROOT)}" for path in missing)
    raise SystemExit(
        f"Privacy link has no direct or shared-runtime coverage on {len(missing)} footer page(s):\n{rendered}"
    )

metrics = (ROOT / "site-metrics.js").read_text(encoding="utf-8")
assert "standardizeFooter" in metrics, "site-metrics.js no longer standardizes the global footer"
for href in (
    "/artists/",
    "/releases/",
    "/genres/",
    "/mixes/",
    "/submit.html",
    "/privacy/",
    "https://www.youtube.com/@NextGenSessions",
    "https://www.tiktok.com/@nextgensessions",
    "https://www.instagram.com/next.gensessions/",
    "mailto:contact@nextgensessions.com",
):
    assert href in metrics, f"Canonical footer runtime missing {href}"

assert 'metrics.src = "/site-metrics.js"' in (ROOT / "release-player.js").read_text(encoding="utf-8"), "release pages lost footer runtime"
assert 'metrics.src = "/site-metrics.js"' in (ROOT / "mix-player.js").read_text(encoding="utf-8"), "mix pages lost footer runtime"

print(f"Validated Privacy/canonical footer coverage across {len(checked)} site footer page(s)")
