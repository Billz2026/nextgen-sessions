#!/usr/bin/env python3
"""Validate crawlable mix catalogue rendering, schema and search coverage."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIXES_ROOT = ROOT / "mixes"


def page_group(source: str) -> str:
    for tag in re.findall(r"<[^>]+>", source):
        if 'data-source="/mixes.json"' not in tag or 'data-source-type="mixes"' not in tag:
            continue
        match = re.search(r'data-group="([^"]+)"', tag)
        if match:
            return match.group(1).strip()
    return ""


def lead_title(item: dict) -> str:
    raw = str(item.get("rawTitle", "")).strip()
    return raw.split("|")[0].strip() if raw else str(item.get("title", "")).strip()


mix_payload = json.loads((ROOT / "mixes.json").read_text(encoding="utf-8"))
mixes = mix_payload.get("mixes", [])
search = json.loads((ROOT / "search-index.json").read_text(encoding="utf-8"))
search_text = json.dumps(search, ensure_ascii=False)

bound_pages = 0
for page in sorted(MIXES_ROOT.glob("*/index.html")):
    source = page.read_text(encoding="utf-8")
    group = page_group(source)
    if not group:
        continue

    items = [item for item in mixes if str(item.get("collection", "")).strip() == group]
    if not items:
        continue

    bound_pages += 1
    assert source.count("<!-- MIX-STATIC-CATALOGUE:START -->") == 1, page
    assert source.count("<!-- MIX-STATIC-CATALOGUE:END -->") == 1, page

    for item in items:
        video_id = str(item.get("id", "")).strip()
        title = lead_title(item)
        assert video_id in source, f"{video_id} missing from static HTML: {page}"
        assert title in source.replace("&amp;", "&"), f"{title} missing from static HTML: {page}"
        assert title in search_text, f"{title} missing from search index"

    graph_match = re.search(
        r'<script type="application/ld\+json" data-schema-graph="nextgen">(.*?)</script>',
        source,
        re.S,
    )
    assert graph_match, f"Schema graph missing: {page}"
    graph = json.loads(graph_match.group(1))
    playlists = [node for node in graph.get("@graph", []) if node.get("@type") == "MusicPlaylist"]
    assert playlists, f"MusicPlaylist schema missing: {page}"
    playlist = playlists[0]
    assert playlist.get("numTracks") == len(items), f"Schema count drift: {page}"
    schema_text = json.dumps(playlist, ensure_ascii=False)
    for item in items:
        assert str(item.get("id", "")) in schema_text, f"Schema missing mix {item.get('id')}: {page}"

assert bound_pages >= 5, f"Unexpectedly few data-bound mix pages: {bound_pages}"

mix_index = (MIXES_ROOT / "index.html").read_text(encoding="utf-8")
for group in ("grime", "hip-hop", "uk-rap", "dancehall", "summer"):
    count = sum(1 for item in mixes if item.get("collection") == group)
    noun = "mix" if count == 1 else "mixes"
    assert re.search(
        rf'data-mix-count="{re.escape(group)}"[^>]*>{count} {noun}<',
        mix_index,
    ), f"Static mix-index count stale for {group}"

print(f"Crawlable mix catalogue validated across {bound_pages} collection pages.")
