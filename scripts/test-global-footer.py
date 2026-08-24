#!/usr/bin/env python3
"""Validate that every rendered NextGen site footer exposes the Privacy page.

A footer may carry the link directly in HTML or through one of the shared
site runtimes that loads site-metrics.js, whose first responsibility is to
insert the Privacy link idempotently when it is missing.
"""

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
assert 'privacyLink.href = "/privacy/"' in metrics, "site-metrics.js no longer inserts Privacy"
assert 'metrics.src = "/site-metrics.js"' in (ROOT / "release-player.js").read_text(encoding="utf-8"), "release pages lost footer runtime"
assert 'metrics.src = "/site-metrics.js"' in (ROOT / "mix-player.js").read_text(encoding="utf-8"), "mix pages lost footer runtime"

print(f"Validated Privacy coverage across {len(checked)} site footer page(s)")
