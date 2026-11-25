#!/usr/bin/env python3
"""Render published album shelves from the verified catalogue."""
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def render():
    payload = json.loads((ROOT / "albums.json").read_text())
    assert payload["source"] == "youtube-album-playlist"
    albums = []
    seen = set()
    for item in payload["albums"]:
        ident = item["id"]
        try:
            published = datetime.fromisoformat(item["published"].replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue
        if published.tzinfo is None or published > datetime.now(timezone.utc) or not re.fullmatch(r"[A-Za-z0-9_-]{11}", ident) or ident in seen:
            continue
        if not item.get("artist") or not item.get("albumTitle"):
            continue
        seen.add(ident)
        albums.append((published, item))
    albums.sort(key=lambda pair: pair[0], reverse=True)
    assert albums, "Refusing to replace album shelves with empty data"
    for path, limit in [("index.html", 4), ("albums/index.html", len(albums))]:
        cards = []
        for _, item in albums[:limit]:
            ident = item["id"]
            title = html.escape(item["albumTitle"], quote=True)
            artist = html.escape(item["artist"], quote=True)
            watch = f"https://www.youtube.com/watch?v={ident}"
            image = f"https://i.ytimg.com/vi/{ident}/maxresdefault.jpg"
            cards.append(f'<article class="ngs-album-card" data-album-id="{ident}"><a class="ngs-album-art" href="{watch}" aria-label="Open {title} on YouTube"><img loading="lazy" decoding="async" src="{image}" alt="{artist} — {title} official album thumbnail"></a><div class="ngs-album-copy"><h3>{title}</h3><p>{artist}</p><button class="ngs-album-play" type="button" hidden>Play album</button><a href="{watch}">Watch on YouTube ↗</a></div></article>')
        page = ROOT / path
        source = page.read_text(encoding="utf-8")
        updated, count = re.subn(r"<!-- NGS-ALBUMS:START -->[\s\S]*?<!-- NGS-ALBUMS:END -->", lambda _: "<!-- NGS-ALBUMS:START -->" + "".join(cards) + "<!-- NGS-ALBUMS:END -->", source)
        assert count == 1, path
        page.write_text(updated, encoding="utf-8")
    print(f"Published album shelves synchronized: {len(albums)} albums")
if __name__ == "__main__":
    render()
