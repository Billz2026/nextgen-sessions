#!/usr/bin/env python3
"""Prevent album metadata, static list, player and SEO schema drift."""
from __future__ import annotations
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
albums = json.loads((ROOT / "albums.json").read_text(encoding="utf-8"))["albums"]
source = (ROOT / "mixes/full-albums/index.html").read_text(encoding="utf-8")
assert all(a.get("artist") and a.get("albumTitle") for a in albums), "Album metadata incomplete"
assert '<!-- ALBUM-OPTIONS:START -->' in source
assert '<!-- ALBUM-OPTIONS:END -->' in source
assert f'>{len(albums)} full albums<' in source, "Static album count is stale"

options_block = source.split("<!-- ALBUM-OPTIONS:START -->", 1)[1].split("<!-- ALBUM-OPTIONS:END -->", 1)[0]
ids = re.findall(r'<button\b[^>]*data-mix-option[^>]*data-id="([^"]+)"', options_block)
assert ids == [a["id"] for a in albums], "Static options do not match album catalogue"
for album in albums:
    display = html.escape(f'{album["artist"]} — {album["albumTitle"]}', quote=True)
    assert f'data-title="{display}"' in options_block, f"Wrong album label: {album['id']}"

frame = re.search(r'<div\s+class="mix-player-frame"[\s\S]*?data-id="([^"]+)"', source)
assert frame and frame.group(1) == albums[0]["id"], "First-play poster not in sync"

graph_match = re.search(
    r'<script type="application/ld\+json" data-schema-graph="nextgen">([\s\S]*?)</script>', source
)
assert graph_match, "Missing MusicPlaylist schema"
graph = json.loads(graph_match.group(1))
playlist = next(node for node in graph["@graph"] if node.get("@type") == "MusicPlaylist")
assert playlist["numTracks"] == len(albums), "Schema count mismatch"
assert [track["url"].split("v=", 1)[1] for track in playlist["track"]] == ids, "Schema track order mismatch"
for artist, title in (("Alia Bleu", "Bleu Armour"), ("Rudii Marka", "Marked Rudeboi")):
    assert any(a["artist"] == artist and a["albumTitle"] == title for a in albums), f"Missing {artist} album"
print(f"Album metadata, static page, player and schema validated for {len(albums)} albums.")
