#!/usr/bin/env python3
"""Static safeguards for scheduled-release source files."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMING_SOON = ROOT / "artists" / "zion-daley" / "coming-soon.js"
source = COMING_SOON.read_text(encoding="utf-8")

assert 'Date.parse("2026-09-04T17:00:00Z")' in source, "Zion releaseAt changed unexpectedly"
assert "youtube.com/watch?v=" not in source, "Scheduled source must not hardcode a YouTube watch URL"
assert "youtube-nocookie.com/embed/" in source, "Live-state renderer is missing"
assert "releaseWindowOpen()" in source, "Scheduled source must gate activation by releaseAt"
assert "if (!releaseWindowOpen())" in source, "Scheduled source must default to embargoed state"

print("Scheduled-release source contains no pre-release YouTube watch URL and retains releaseAt gating.")
