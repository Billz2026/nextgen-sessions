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
    for path, limit in [("index.html", 8), ("albums/index.html", len(albums))]:
        cards = []
        for published, item in albums[:limit]:
            ident = item["id"]
            title = html.escape(item["albumTitle"], quote=True)
            artist = html.escape(item["artist"], quote=True)
            watch = f"https://www.youtube.com/watch?v={ident}"
            cover = ROOT / "assets" / "albums" / f"{ident}.webp"
            image = f"/assets/albums/{ident}.webp" if cover.is_file() else f"https://i.ytimg.com/vi/{ident}/maxresdefault.jpg"
            image_label = "official album cover" if cover.is_file() else "album video thumbnail"
            cards.append(f'<article class="ngs-album-card" data-album-id="{ident}"><div class="ngs-album-art"><a href="{watch}" aria-label="Open {title} on YouTube"><img loading="lazy" decoding="async" src="{image}" alt="{artist} — {title} {image_label}"></a><button class="ngs-album-play" type="button" aria-label="Play album: {title}" aria-pressed="false" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l12-7z"/></svg></button></div><div class="ngs-album-copy"><h3>{title}</h3><p>{artist}</p><p class="ngs-album-meta">{published.year} · Full album</p><a class="ngs-album-link" href="{watch}" aria-label="Watch {title} on YouTube" title="Watch on YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C2 9 2 12 2 12s0 3 .4 4.8a2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg></a></div></article>')
        page = ROOT / path
        source = page.read_text(encoding="utf-8")
        updated, count = re.subn(r"<!-- NGS-ALBUMS:START -->[\s\S]*?<!-- NGS-ALBUMS:END -->", lambda _: "<!-- NGS-ALBUMS:START -->" + "".join(cards) + "<!-- NGS-ALBUMS:END -->", source)
        assert count == 1, path
        page.write_text(updated, encoding="utf-8")
    print(f"Published album shelves synchronized: {len(albums)} albums")
if __name__ == "__main__":
    render()
