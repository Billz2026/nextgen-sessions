#!/usr/bin/env python3
"""Test that an unavailable playlist retains its verified catalogue entries."""

from urllib.error import HTTPError
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


spec = spec_from_file_location(
    "update_catalogue",
    Path(__file__).with_name("update-catalogue.py"),
)
assert spec and spec.loader
catalogue_module = module_from_spec(spec)
spec.loader.exec_module(catalogue_module)


catalogue = {
    "releases": [
        {
            "id": "AAAAAAAAAAA",
            "group": "Late Night Vibes",
            "artist": "Test Artist",
            "title": "Test Release",
            "rawTitle": "Test Artist - Test Release",
        },
        {
            "id": "BBBBBBBBBBB",
            "group": "Dancehall & Reggae",
            "artist": "Other Artist",
            "title": "Other Release",
        },
    ]
}

fallback = catalogue_module.existing_playlist_candidates(catalogue, "Late Night Vibes")
assert fallback == [
    {
        "id": "AAAAAAAAAAA",
        "group": "Late Night Vibes",
        "rawTitle": "Test Artist - Test Release",
        "artist": "Test Artist",
        "title": "Test Release",
    }
]
assert catalogue_module.existing_playlist_candidates(catalogue, "Missing Group") == []


def unavailable_playlist(_playlist_id: str) -> list[dict]:
    raise HTTPError("https://example.invalid", 404, "Not Found", None, None)


catalogue_module.PLAYLISTS = [("missing-playlist", "Late Night Vibes")]
catalogue_module.VERIFIED_EXTRA_RELEASES = []
catalogue_module.playlist_items = unavailable_playlist
catalogue_module.video_details = lambda _ids: {
    "AAAAAAAAAAA": {
        "status": {"privacyStatus": "public"},
        "snippet": {
            "title": "Test Artist - Test Release",
            "publishedAt": "2026-08-01T17:00:00Z",
        },
        "contentDetails": {"duration": "PT3M20S"},
    }
}

built = catalogue_module.build_catalogue(catalogue)
assert built["total"] == 1
assert built["releases"][0]["id"] == "AAAAAAAAAAA"
assert built["releases"][0]["contentType"] == "full-release"
assert built["releases"][0]["durationSeconds"] == 200

catalogue_module.video_details = lambda _ids: {}
empty_built = catalogue_module.build_catalogue({"releases": []})
assert empty_built["total"] == 0

print("Unavailable playlists retain their verified catalogue entries.")
