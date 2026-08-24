#!/usr/bin/env python3
"""Validate that every rendered NextGen site footer exposes the Privacy page."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOOTER_RE = re.compile(r'<footer\s+class="site-footer"[\s\S]*?</footer>', re.I)
PRIVACY_RE = re.compile(r'href=["\']/privacy/["\']', re.I)
SKIP_PARTS = {".git", "node_modules"}

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
    if any(not PRIVACY_RE.search(footer) for footer in footers):
        missing.append(path)

if not checked:
    raise SystemExit("No site footers found to validate")

if missing:
    rendered = "\n".join(f" - {path.relative_to(ROOT)}" for path in missing)
    raise SystemExit(f"Privacy link missing from {len(missing)} footer page(s):\n{rendered}")

print(f"Validated Privacy link across {len(checked)} site footer page(s)")
