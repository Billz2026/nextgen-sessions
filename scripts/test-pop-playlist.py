#!/usr/bin/env python3
"""Verify that the Pop playlist classifies public singles and excludes embargoed uploads."""
from __future__ import annotations
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("catalogue", ROOT / "scripts/update-catalogue.py")
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert ("PLQBcrDvzxhtM", "Pop") in module.PLAYLISTS
assert "Dean Lawson" in module.KNOWN_ARTISTS

def item(video_id, title, privacy):
    return {
        "contentDetails": {"videoId": video_id},
        "snippet": {"title": title},
        "status": {"privacyStatus": privacy},
    }

videos = [
    item("y_gADQbXSho", "Dean Lawson - Dangerous Love | Pop 2026 | NextGen Sessions", "public"),
    item("BBBBBBBBBBB", "Dean Lawson - New Pop Song | NextGen Sessions", "unlisted"),
    item("CCCCCCCCCCC", "Dean Lawson - Future Pop Song | NextGen Sessions", "private"),
]
module.PLAYLISTS = [("PLQBcrDvzxhtM", "Pop")]
module.VERIFIED_EXTRA_RELEASES = []
module.playlist_items = lambda _id: videos

def details(ids):
    return {
        video_id: {
            "snippet": {
                "title": next(item["snippet"]["title"] for item in videos if item["contentDetails"]["videoId"] == video_id),
                "publishedAt": "2026-10-01T17:00:00Z",
            },
            "contentDetails": {"duration": "PT4M30S"},
            "status": {"privacyStatus": "public" if video_id == "y_gADQbXSho" else "unlisted"},
        }
        for video_id in ids
    }

module.video_details = details
result = module.build_catalogue()
assert result["total"] == 1, json.dumps(result, indent=2)
release = result["releases"][0]
assert release["id"] == "y_gADQbXSho"
assert release["artist"] == "Dean Lawson", release
assert release["title"] == "Dangerous Love", release
assert release["group"] == "Pop", release
assert result["counts"]["Pop"] == 1

module.playlist_items = lambda _id: [
    item("y_gADQbXSho", "Dean Lawson - Dangerous Love | Pop 2026 | NextGen Sessions", "unlisted")
]
assert module.build_catalogue()["total"] == 0

page = (ROOT / "releases/index.html").read_text(encoding="utf-8")
assert 'data-filter="Pop"' in page
pop_control = page.split('data-filter="Pop"', 1)[1].split("</button>", 1)[0]
public_pop_exists = any(
    x.get("group") == "Pop"
    for x in json.loads((ROOT / "releases.json").read_text(encoding="utf-8")).get("releases", [])
)
assert ("hidden" not in pop_control) == public_pop_exists
print("Pop playlist classification, embargo and archive visibility passed.")
