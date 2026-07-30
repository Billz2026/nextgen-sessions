#!/usr/bin/env python3
"""Build the public NextGen Sessions release catalogue from curated playlists."""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


PLAYLISTS = [
    ("PL7VCdVWElIJERYe7FVFG8mMYSop0QLSvC", "Dancehall & Reggae"),
    ("PL7VCdVWElIJFlaABZj5HED-EWEGY8nugN", "UK Rap & Grime"),
    ("PL7VCdVWElIJEjRtwnQnL4OO3pwV9GZ9bM", "Hip-Hop / G-Funk"),
    ("PL7VCdVWElIJH_WnZxMJPpIp9LCJr3qxpS", "Asian"),
    ("PL7VCdVWElIJFUIdoyQtMVSaoAXWXsQnrF", "Lovers Rock"),
    ("PL7VCdVWElIJFSw31x4J4WL7zSPR3jdeGe", "R&B & Soul"),
    ("PL7VCdVWElIJFzJpuLDIUuOnct9uwEQ1Dr", "Late Night Afro"),
    ("PL7VCdVWElIJF7tTj0IPyNXsy7KejDrnjk", "Arabic"),
]

EXCLUDED = re.compile(
    r"\b(shorts?|teaser|trailer|promo|preview|coming soon|out tomorrow|out tonight)\b|#shorts",
    re.IGNORECASE,
)

KNOWN_ARTISTS = [
    "Rudii Marka", "Rell Danja", "Rell Danger", "Kemar Ranka", "Jahmari Danza",
    "Yung Tafari", "Ragga Blaze", "Javon Ranks", "Kemarco", "Kastro", "Reeko",
    "Mizzy G", "Mace K", "Renz Cole", "Killa K", "Andre Kadeem", "Reiss", "Rafe",
    "Rookz", "Voss Carter", "Jay Starks", "Karvell Reign", "Alonzo Ray",
    "Deon Creed", "Manny Virk", "Asif Sultaan", "Alia Bleu", "Zara Veli",
    "Nyah Rae", "Keisha", "Marlo Saint", "Mariana Lo", "Tayo Wray", "Omari V",
    "Darian Gayle", "Isaac Grey", "Leila Nour",
]


def youtube_api(resource: str, **params: str) -> dict:
    params["key"] = os.environ["YT_KEY"]
    url = "https://www.googleapis.com/youtube/v3/" + resource + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "NextGenSessionsCatalogue/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def playlist_items(playlist_id: str) -> list[dict]:
    items: list[dict] = []
    token = ""
    while True:
        params = {
            "part": "snippet,contentDetails,status",
            "playlistId": playlist_id,
            "maxResults": "50",
        }
        if token:
            params["pageToken"] = token
        payload = youtube_api("playlistItems", **params)
        items.extend(payload.get("items", []))
        token = payload.get("nextPageToken", "")
        if not token:
            return items


def split_artist_title(raw_title: str) -> tuple[str, str]:
    segments = [segment.strip() for segment in raw_title.split("|") if segment.strip()]
    for segment in segments:
        for artist in KNOWN_ARTISTS:
            match = re.search(
                rf"\b{re.escape(artist)}\s*[-–—]\s*(.+)$",
                segment,
                flags=re.IGNORECASE,
            )
            if match:
                return artist, clean_title(match.group(1))

    if segments:
        for artist in KNOWN_ARTISTS:
            if segments[0].casefold() == artist.casefold() and len(segments) > 1:
                return artist, clean_title(segments[1])

    if len(segments) > 1:
        credited = [
            artist for artist in KNOWN_ARTISTS
            if re.search(rf"\b{re.escape(artist)}\b", segments[1], flags=re.IGNORECASE)
        ]
        if credited:
            return " x ".join(credited), clean_title(segments[0])

    candidates = segments[1:2] + segments[:1] + segments[2:]
    for candidate in candidates:
        match = re.match(r"^(.*?)\s+[-–—]\s+(.+)$", candidate)
        if match:
            artist = match.group(1).strip()
            title = match.group(2).strip()
            if artist and title:
                return artist, clean_title(title)
    return "NextGen Sessions", clean_title(segments[0] if segments else raw_title)


def clean_title(value: str) -> str:
    cleaned = re.sub(
        r"\s+(official\s+(music\s+)?video|official\s+audio|visuali[sz]er|lyric\s+video)$",
        "",
        value,
        flags=re.IGNORECASE,
    ).strip()
    return re.sub(
        r"\s+(single|uk rap|grime|dancehall|reggae|hip-?hop|r&b|rnb|soul|"
        r"afro swing)(?:\s+20\d{2})?$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()


def build_catalogue() -> dict:
    releases: list[dict] = []
    seen: set[str] = set()
    playlist_counts: dict[str, int] = {}

    for playlist_id, group in PLAYLISTS:
        count = 0
        for item in playlist_items(playlist_id):
            snippet = item.get("snippet", {})
            video_id = item.get("contentDetails", {}).get("videoId", "")
            raw_title = snippet.get("title", "").strip()
            privacy = item.get("status", {}).get("privacyStatus", "")
            if (
                not re.fullmatch(r"[\w-]{11}", video_id)
                or video_id in seen
                or privacy not in ("public", "unlisted")
                or raw_title in ("Private video", "Deleted video")
                or EXCLUDED.search(raw_title)
            ):
                continue

            artist, title = split_artist_title(raw_title)
            releases.append(
                {
                    "id": video_id,
                    "artist": artist,
                    "title": title,
                    "group": group,
                    "published": snippet.get("publishedAt", ""),
                    "rawTitle": raw_title,
                }
            )
            seen.add(video_id)
            count += 1
        playlist_counts[group] = count

    releases.sort(key=lambda item: item.get("published", ""), reverse=True)
    return {
        "source": "curated-youtube-playlists",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "total": len(releases),
        "counts": playlist_counts,
        "releases": releases,
    }


def main() -> None:
    if not os.environ.get("YT_KEY"):
        raise SystemExit("YT_KEY is required")
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "releases.json")
    output.write_text(json.dumps(build_catalogue(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
