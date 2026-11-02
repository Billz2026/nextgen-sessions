#!/usr/bin/env python3
"""Regression tests: new public singles should not require playlist or schedule entries."""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("public_channel_catalogue", ROOT / "scripts/update-catalogue.py")
assert spec and spec.loader
catalogue = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalogue)

existing = {
    "releases": [{
        "id": "OldDeon2026",
        "artist": "Deon Creed",
        "title": "Earlier Song",
        "group": "Hip-Hop / G-Funk",
        "rawTitle": "Deon Creed - Earlier Song | Hip-Hop 2026 | NextGen Sessions",
        "discoverySource": catalogue.CHANNEL_DISCOVERY_SOURCE,
    }]
}

def upload(video_id, title, privacy="public"):
    return {
        "contentDetails": {"videoId": video_id},
        "snippet": {"title": title},
        "status": {"privacyStatus": privacy},
    }

uploads = [
    upload("NewDeon2026", "Deon Creed - New Single | Hip-Hop 2026 | NextGen Sessions"),
    upload("NoBrand1111", "Deon Creed - Unbranded Song"),
    upload("AlbumVid001", "Deon Creed - Hood Flashbacks | Full Album | NextGen Sessions"),
    upload("Private1234", "Deon Creed - Hidden Song | Hip-Hop 2026 | NextGen Sessions", "private"),
    upload("WrongOwn001", "Deon Creed - Other Channel | Hip-Hop 2026 | NextGen Sessions"),
    upload("ShortSong01", "Deon Creed - Short Song | Hip-Hop 2026 | NextGen Sessions"),
    upload("FutureSong1", "Deon Creed - Future Song | Hip-Hop 2026 | NextGen Sessions"),
    upload("Unlisted001", "Deon Creed - Unlisted Song | Hip-Hop 2026 | NextGen Sessions"),
    upload("Unclass0001", "Unknown New Artist - Untagged Song | NextGen Sessions"),
]
candidates = catalogue.public_channel_candidates(uploads, existing, {"OldDeon2026"})
ids = {c["id"] for c in candidates}
assert "NoBrand1111" in ids, "Channel-owned uploads must work without the brand written in the title"
assert "NewDeon2026" in ids, "A Deon Creed single must be found without a playlist/schedule entry"
assert "AlbumVid001" not in ids, "Album videos are not singles"
assert "Private1234" not in ids, "Private uploads must remain hidden"
assert "Unclass0001" not in ids, "Unknown category cannot be guessed"
assert catalogue.group_for_channel_release("Deon Creed", "Deon Creed - New Single", existing) == "Hip-Hop / G-Funk"
assert catalogue.group_for_channel_release("Brand New Artist", "Brand New Artist - First Song | Dancehall 2026 | NextGen Sessions", existing) == "Dancehall"

def video(video_id, duration="PT4M3S", owner=catalogue.YOUTUBE_CHANNEL_ID, privacy="public", published="2026-11-02T18:00:00Z"):
    return {
        "id": video_id,
        "status": {"privacyStatus": privacy},
        "snippet": {
            "title": next((u["snippet"]["title"] for u in uploads if u["contentDetails"]["videoId"] == video_id),
                          "Deon Creed - Earlier Song | Hip-Hop 2026 | NextGen Sessions"),
            "publishedAt": published,
            "channelId": owner,
            "liveBroadcastContent": "none",
        },
        "contentDetails": {"duration": duration},
    }

details = {
    "OldDeon2026": video("OldDeon2026", published="2026-09-01T18:00:00Z"),
    "NewDeon2026": video("NewDeon2026"),
    "NoBrand1111": video("NoBrand1111"),
    "WrongOwn001": video("WrongOwn001", owner="UCnot-the-real-channel"),
    "ShortSong01": video("ShortSong01", duration="PT2M20S"),
    "FutureSong1": video("FutureSong1", published="2099-11-02T18:00:00Z"),
    "Unlisted001": video("Unlisted001", privacy="unlisted"),
}
catalogue.PLAYLISTS = [("unused-playlist", "Hip-Hop / G-Funk")]
catalogue.VERIFIED_EXTRA_RELEASES = []
catalogue.playlist_items = lambda _playlist_id: []
catalogue.recent_public_channel_uploads = lambda: uploads
catalogue.video_details = lambda video_ids: {key: val for key, val in details.items() if key in video_ids}

previous_key = os.environ.get("YT_KEY")
try:
    os.environ["YT_KEY"] = "synthetic-test-value"
    built = catalogue.build_catalogue(existing)
finally:
    if previous_key is None:
        os.environ.pop("YT_KEY", None)
    else:
        os.environ["YT_KEY"] = previous_key

releases = {r["id"]: r for r in built["releases"]}
assert set(releases) == {"OldDeon2026", "NewDeon2026", "NoBrand1111"}, releases.keys()
assert releases["NewDeon2026"]["group"] == "Hip-Hop / G-Funk"
assert releases["NewDeon2026"]["discoverySource"] == catalogue.CHANNEL_DISCOVERY_SOURCE
assert releases["NewDeon2026"]["contentType"] == "full-release"
assert len(catalogue.persistent_scheduled_candidates(built)) == 3, "Channel-discovered singles must persist across runs"

workflow = (ROOT / ".github/workflows/update-catalogue.yml").read_text(encoding="utf-8")
assert "Validate public channel release discovery" in workflow
assert "scripts/test-public-channel-discovery.py" in workflow
assert "Build catalogue from public playlists" in workflow

print("Public channel discovery validated: new single, persistence, artist group and private/short/future/album/ownership filters.")
