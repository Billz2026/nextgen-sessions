#!/usr/bin/env python3
"""Synchronise the server-rendered full-album page with albums.json."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "mixes/full-albums/index.html"
START = "<!-- ALBUM-OPTIONS:START -->"
END = "<!-- ALBUM-OPTIONS:END -->"


def safe(value: object) -> str:
    return html.escape(str(value), quote=True)


def albums_from_catalogue() -> list[dict]:
    payload = json.loads((ROOT / "albums.json").read_text(encoding="utf-8"))
    albums = payload.get("albums", [])
    if not isinstance(albums, list) or not albums:
        raise ValueError("Album catalogue is empty; refusing to remove existing albums")
    if payload.get("total") != len(albums):
        raise ValueError("Album catalogue count does not match album entries")
    ids = set()
    for album in albums:
        video_id = str(album.get("id", ""))
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            raise ValueError(f"Invalid album video ID: {video_id!r}")
        if video_id in ids:
            raise ValueError(f"Duplicate album ID: {video_id}")
        ids.add(video_id)
        if not str(album.get("artist", "")).strip() or not str(album.get("albumTitle", "")).strip():
            raise ValueError(f"Missing curated artist/title metadata: {video_id}")
    return albums


def album_display(album: dict) -> str:
    return f'{album["artist"]} — {album["albumTitle"]}'


def option_html(album: dict, active: bool) -> str:
    video_id = safe(album["id"])
    full = safe(album_display(album))
    artist = safe(album["artist"])
    title = safe(album["albumTitle"])
    poster = safe(album.get("thumbnail") or f'https://i.ytimg.com/vi/{album["id"]}/maxresdefault.jpg')
    thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    css = "mix-option is-active" if active else "mix-option"
    pressed = "true" if active else "false"
    status = "Selected" if active else "Play album"
    return (
        f'              <button class="{css}" type="button" data-mix-option data-kind="video" '
        f'data-id="{video_id}" data-title="{full}" data-poster="{poster}" aria-pressed="{pressed}">'
        f'<img src="{thumbnail}" alt="" loading="lazy">'
        f'<span class="mix-option-copy"><span class="mix-option-number">{artist}</span>'
        f'<strong>{title}</strong><span class="mix-option-status" data-option-status>{status}</span>'
        f'</span></button>'
    )


def main() -> None:
    albums = albums_from_catalogue()
    source = PAGE.read_text(encoding="utf-8")
    first = albums[0]
    name = safe(album_display(first))
    poster = safe(first.get("thumbnail") or f'https://i.ytimg.com/vi/{first["id"]}/maxresdefault.jpg')

    # The pre-JavaScript list must be useful even if albums.json cannot load.
    controls = "\n".join(option_html(album, i == 0) for i, album in enumerate(albums))
    block = f"{START}\n{controls}\n              {END}"
    if START in source and END in source:
        source, count = re.subn(
            re.escape(START) + r"[\s\S]*?" + re.escape(END),
            lambda _: block, source, count=1
        )
    else:
        pattern = (
            r'(<div class="mix-option-grid" data-mix-options>)([\s\S]*?)'
            r'(\n\s*</div>\n\s*</div>\n\s*</div>\n\s*<p class="mix-listen-note")'
        )
        source, count = re.subn(
            pattern, lambda m: m.group(1) + "\n              " + block + m.group(3),
            source, count=1
        )
    if count != 1:
        raise ValueError("Could not locate the album fallback selector")

    source, count = re.subn(
        r'(<span class="mix-type" data-collection-count>)[^<]*(</span>)',
        lambda m: m.group(1) + f"{len(albums)} full albums" + m.group(2),
        source, count=1
    )
    if count != 1:
        raise ValueError("Album count marker missing")

    # Keep the first-play poster, accessible label and player metadata in sync.
    frame_pattern = re.compile(
        r'(<div\s+class="mix-player-frame"[\s\S]*?)(?=\n\s*</div>\n\s*<div class="mix-selector)',
        re.I
    )
    match = frame_pattern.search(source)
    if not match:
        raise ValueError("Initial album player not found")
    frame = match.group(1)
    values = {
        r'data-id="[^"]*"': f'data-id="{safe(first["id"])}"',
        r'data-title="[^"]*"': f'data-title="{name}"',
        r'data-poster="[^"]*"': f'data-poster="{poster}"',
        r'aria-label="Play [^"]*"': f'aria-label="Play {name}"',
    }
    for pattern, replacement in values.items():
        frame, changed = re.subn(pattern, lambda _: replacement, frame, count=1)
        if changed != 1:
            raise ValueError(f"Missing player attribute {pattern}")
    frame, changed = re.subn(
        r'(<img src=")[^"]*(" alt=""\s*/>)',
        lambda m: m.group(1) + poster + m.group(2),
        frame, count=1
    )
    if changed != 1:
        raise ValueError("Initial album poster missing")
    source = source[:match.start(1)] + frame + source[match.end(1):]

    # The JSON-LD playlist must match the human-readable choices.
    schema_pattern = re.compile(
        r'(<script type="application/ld\+json" data-schema-graph="nextgen">)([\s\S]*?)(</script>)'
    )
    schema_match = schema_pattern.search(source)
    if not schema_match:
        raise ValueError("Full-albums structured data missing")
    graph = json.loads(schema_match.group(2))
    playlists = [node for node in graph.get("@graph", []) if node.get("@type") == "MusicPlaylist"]
    if len(playlists) != 1:
        raise ValueError("Expected one MusicPlaylist")
    playlist = playlists[0]
    playlist["numTracks"] = len(albums)
    playlist["track"] = [
        {
            "@type": "MusicRecording",
            "name": album_display(album),
            "url": f'https://www.youtube.com/watch?v={album["id"]}',
        }
        for album in albums
    ]
    encoded = json.dumps(graph, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    source = source[:schema_match.start(2)] + encoded + source[schema_match.end(2):]

    if source != PAGE.read_text(encoding="utf-8"):
        PAGE.write_text(source, encoding="utf-8")
    print(f"Full albums: {len(albums)} properly named projects, player and schema synchronised")


if __name__ == "__main__":
    main()
