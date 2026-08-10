#!/usr/bin/env python3
"""Validate that release cards stay crawlable while playing inline."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
archive = (ROOT / "releases" / "index.html").read_text(encoding="utf-8")
renderer = (ROOT / "scripts" / "render-releases.py").read_text(encoding="utf-8")
player = (ROOT / "releases.js").read_text(encoding="utf-8")

card_count = archive.count('class="archive-release-card"')
assert card_count >= 80, f"Unexpectedly small rendered archive: {card_count}"
assert archive.count("data-archive-play") >= card_count
assert archive.count("archive-release-detail-link") >= card_count * 3
assert "<article class=\"archive-release-card\"" in archive
assert "<a class=\"archive-release-card\"" not in archive

assert "data-archive-play" in renderer
assert "archive-release-detail-link" in renderer
assert "data-video-id" in renderer

assert "youtube-nocookie.com/embed/" in player
assert "autoplay=1" in player
assert "playsinline=1" in player
assert "activeCard" in player
assert "restoreCard(activeCard)" in player
assert 'grid.addEventListener("click"' in player

print(f"Validated {card_count} inline-play release cards.")
