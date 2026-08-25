#!/usr/bin/env python3
"""Static safeguards for scheduled-release source files."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMING_SOON = ROOT / "artists" / "zion-daley" / "coming-soon.js"
source = COMING_SOON.read_text(encoding="utf-8")

assert 'Date.parse("2026-09-04T17:00:00Z")' in source, "Zion releaseAt changed unexpectedly"
assert not re.search(r"youtube\.com/watch\?v=[A-Za-z0-9_-]{11}", source), (
    "Scheduled source must not hardcode a YouTube video ID in a watch URL"
)
assert not re.search(r"youtube-nocookie\.com/embed/[A-Za-z0-9_-]{11}", source), (
    "Scheduled source must not hardcode a YouTube video ID in an embed URL"
)
assert "youtube-nocookie.com/embed/${escapeHtml(videoId)}" in source, "Live-state renderer must use catalogue-provided videoId"
assert "releaseWindowOpen()" in source, "Scheduled source must gate activation by releaseAt"
assert "if (!releaseWindowOpen())" in source, "Scheduled source must default to embargoed state"

print("Scheduled-release source has no hardcoded YouTube ID and retains releaseAt gating.")
