#!/usr/bin/env python3
"""Exercise classification, ordering, duration and playlist-fallback rules."""

from __future__ import annotations

import importlib.util
import json
import urllib.error
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("update_mixes", ROOT / "scripts" / "update-mixes.py")
assert SPEC and SPEC.loader
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def playlist_item(video_id: str, title: str) -> dict:
    return {
        "snippet": {"title": title},
        "contentDetails": {"videoId": video_id},
        "status": {"privacyStatus": "public"},
    }


sources = {
    "dancehall-source": [
        playlist_item("dancehall04", "Dancehall Mashup IV (Full Dancehall Mix) | NextGen Sessions"),
        playlist_item("dancehall01", "Dancehall Mashup Series I | NextGen Sessions"),
    ],
    "hiphop-source": [playlist_item("hiphopmix01", "Hip-Hop Mash Up Series 1 | NextGen Sessions")],
    "ukrap-source": [playlist_item("ukrapmix001", "UK Rap Mashup Series 1 | NextGen Sessions")],
    "summer-source": [playlist_item("summermix26", "THE SOUND OF SUMMER 2026 | Summer Mix 2026")],
    "uploads-source": [
        playlist_item("grimemix001", "Grime Mash Up Series 1 | NextGen Sessions"),
        playlist_item("shortpromo1", "Grime Mashup Series 2 Teaser"),
        playlist_item("regularsong", "Reeko - A Regular Song | Dancehall 2026"),
    ],
}

module.MIX_PLAYLISTS = [
    ("dancehall-source", "dancehall"),
    ("hiphop-source", "hip-hop"),
    ("ukrap-source", "uk-rap"),
    ("summer-source", "summer"),
]
module.UPLOADS_PLAYLIST_ID = "uploads-source"
module.playlist_items = lambda playlist_id: sources[playlist_id]


def details(video_ids: list[str]) -> dict[str, dict]:
    output = {}
    for video_id in video_ids:
        seconds = 240 if video_id == "regularsong" else 2400
        output[video_id] = {
            "id": video_id,
            "snippet": {
                "title": next(
                    item["snippet"]["title"]
                    for items in sources.values()
                    for item in items
                    if item["contentDetails"]["videoId"] == video_id
                ),
                "publishedAt": "2026-08-01T18:00:00Z",
            },
            "status": {"privacyStatus": "public"},
            "contentDetails": {"duration": f"PT{seconds // 60}M"},
        }
    return output


module.video_details = details
catalogue = module.build_mix_catalogue({})
assert catalogue["total"] == 6, json.dumps(catalogue, indent=2)
assert catalogue["counts"] == {
    "grime": 1,
    "hip-hop": 1,
    "uk-rap": 1,
    "dancehall": 2,
    "summer": 1,
}
assert [item["id"] for item in catalogue["mixes"] if item["collection"] == "dancehall"] == [
    "dancehall01",
    "dancehall04",
]
assert "shortpromo1" not in {item["id"] for item in catalogue["mixes"]}
assert "regularsong" not in {item["id"] for item in catalogue["mixes"]}
assert all(item["contentType"] == "long-mix" for item in catalogue["mixes"])
assert all(item["durationSeconds"] >= 600 for item in catalogue["mixes"])


existing = json.loads((ROOT / "mixes.json").read_text(encoding="utf-8"))
module.MIX_PLAYLISTS = [("missing", "dancehall")]
module.UPLOADS_PLAYLIST_ID = "uploads-source"


def unavailable(playlist_id: str) -> list[dict]:
    if playlist_id == "missing":
        raise urllib.error.HTTPError("https://example.test", 404, "Not found", {}, None)
    return []


module.playlist_items = unavailable


def fallback_details(video_ids: list[str]) -> dict[str, dict]:
    return {
        item["id"]: {
            "id": item["id"],
            "snippet": {
                "title": item["title"],
                "publishedAt": "2026-07-01T18:00:00Z",
            },
            "status": {"privacyStatus": "public"},
            "contentDetails": {"duration": "PT40M"},
        }
        for item in existing["mixes"]
        if item["id"] in video_ids
    }


module.video_details = fallback_details
fallback = module.build_mix_catalogue(existing)
assert fallback["counts"]["dancehall"] == 3
assert [item["sequence"] for item in fallback["mixes"]] == [1, 2, 3]
print("Mix catalogue automation tests passed.")
