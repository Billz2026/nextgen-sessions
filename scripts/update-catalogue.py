#!/usr/bin/env python3
"""Build the public NextGen Sessions release catalogue from curated playlists."""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


PLAYLISTS = [
    ("PL7VCdVWElIJERYe7FVFG8mMYSop0QLSvC", "Dancehall"),
    ("PLDcaKFpn_7V8", "Reggae"),
    ("PL7VCdVWElIJFlaABZj5HED-EWEGY8nugN", "UK Rap & Grime"),
    ("PL7VCdVWElIJEjRtwnQnL4OO3pwV9GZ9bM", "Hip-Hop / G-Funk"),
    ("PL7VCdVWElIJH_WnZxMJPpIp9LCJr3qxpS", "Asian"),
    ("PL7VCdVWElIJFUIdoyQtMVSaoAXWXsQnrF", "Lovers Rock"),
    ("PL7VCdVWElIJFSw31x4J4WL7zSPR3jdeGe", "R&B & Soul"),
    ("PL7VCdVWElIJFzJpuLDIUuOnct9uwEQ1Dr", "Late Night Afro"),
    ("PL7VCdVWElIJH04lRndw-W9eIEmikl2xfZ", "Late Night Vibes"),
    ("PL7VCdVWElIJF7tTj0IPyNXsy7KejDrnjk", "Arabic"),
]

FULL_RELEASE_CONTENT_TYPE = "full-release"
MINIMUM_FULL_RELEASE_SECONDS = 75

# Verified full releases that are not currently present in a genre playlist.
# Only the identity/group are pinned here; title/status/publication time are
# still refreshed from the YouTube videos endpoint on every catalogue build.
VERIFIED_EXTRA_RELEASES = [
    {
        "id": "6H6yq_1bEsQ",
        "artist": "Reeko",
        "title": "After Di Party",
        "group": "Dancehall",
    },
    {
        "id": "ZSjRD_3B5uk",
        "artist": "Deon Creed",
        "title": "Days Like These",
        "group": "Hip-Hop / G-Funk",
    },
]

EXCLUDED = re.compile(
    r"\b(shorts?|teaser|trailer|promo|preview|coming soon|out tomorrow|out tonight|out now)\b|"
    r"#shorts|"
    r"\b\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|"
    r"september|october|november|december)(?:\s+20\d{2})?\b",
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


def video_details(video_ids: list[str]) -> dict[str, dict]:
    details: dict[str, dict] = {}
    for offset in range(0, len(video_ids), 50):
        batch = video_ids[offset:offset + 50]
        if not batch:
            continue
        payload = youtube_api(
            "videos",
            part="snippet,status,contentDetails",
            id=",".join(batch),
            maxResults="50",
        )
        for item in payload.get("items", []):
            video_id = item.get("id", "")
            if video_id:
                details[video_id] = item
    return details


def duration_seconds(value: str) -> int:
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value or "")
    if not match:
        return 0
    hours, minutes, seconds = (int(part or 0) for part in match.groups())
    return hours * 3600 + minutes * 60 + seconds


def is_published(value: str) -> bool:
    if not value:
        return True
    try:
        published = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return True
    return published <= datetime.now(timezone.utc)


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
    cleaned = re.sub(r"\s+single$", "", cleaned, flags=re.IGNORECASE).strip()
    return re.sub(
        r"\s+(uk rap|grime|dancehall|reggae|hip-?hop|r&b|rnb|soul|"
        r"afro swing)\s+20\d{2}$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()


def existing_playlist_candidates(existing_catalogue: dict, group: str) -> list[dict]:
    releases = existing_catalogue.get("releases", []) if isinstance(existing_catalogue, dict) else []
    return [
        {
            "id": release.get("id", ""),
            "group": group,
            "rawTitle": release.get("rawTitle", ""),
            "artist": release.get("artist", ""),
            "title": release.get("title", ""),
        }
        for release in releases
        if release.get("group") == group and re.fullmatch(r"[\w-]{11}", release.get("id", ""))
    ]


def build_catalogue(existing_catalogue: dict | None = None) -> dict:
    candidates: list[dict] = []
    seen: set[str] = set()
    existing_catalogue = existing_catalogue or {}

    for playlist_id, group in PLAYLISTS:
        try:
            items = playlist_items(playlist_id)
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            items = []
            fallback_candidates = existing_playlist_candidates(existing_catalogue, group)
            print(
                f"Warning: playlist {playlist_id} for {group} returned 404; "
                + (
                    f"retaining {len(fallback_candidates)} verified catalogue entries."
                    if fallback_candidates
                    else "no verified catalogue entries require retention."
                ),
                file=sys.stderr,
            )
            for candidate in fallback_candidates:
                if candidate["id"] not in seen:
                    candidates.append(candidate)
                    seen.add(candidate["id"])

        for item in items:
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

            candidates.append(
                {
                    "id": video_id,
                    "group": group,
                    "rawTitle": raw_title,
                }
            )
            seen.add(video_id)

    for extra in VERIFIED_EXTRA_RELEASES:
        video_id = extra["id"]
        if video_id in seen:
            continue
        candidates.append({**extra, "rawTitle": ""})
        seen.add(video_id)

    videos = video_details([candidate["id"] for candidate in candidates])
    releases: list[dict] = []
    for candidate in candidates:
        video_id = candidate["id"]
        video = videos.get(video_id)
        if not video:
            continue
        status = video.get("status", {})
        if status.get("privacyStatus", "") not in ("public", "unlisted"):
            continue

        snippet = video.get("snippet", {})
        raw_title = snippet.get("title", "").strip() or candidate.get("rawTitle", "")
        published = snippet.get("publishedAt", "")
        duration = duration_seconds(video.get("contentDetails", {}).get("duration", ""))
        if (
            not raw_title
            or EXCLUDED.search(raw_title)
            or not is_published(published)
            or duration < MINIMUM_FULL_RELEASE_SECONDS
        ):
            continue

        if candidate.get("artist") and candidate.get("title"):
            artist = candidate["artist"]
            title = candidate["title"]
        else:
            artist, title = split_artist_title(raw_title)

        releases.append(
            {
                "id": video_id,
                "contentType": FULL_RELEASE_CONTENT_TYPE,
                "artist": artist,
                "title": title,
                "group": candidate["group"],
                "published": published,
                "durationSeconds": duration,
                "rawTitle": raw_title,
            }
        )

    releases.sort(key=lambda item: item.get("published", ""), reverse=True)
    catalogue_counts = {group: 0 for _, group in PLAYLISTS}
    for release in releases:
        catalogue_counts[release["group"]] = catalogue_counts.get(release["group"], 0) + 1
    return {
        "source": "curated-youtube-playlists",
        "contentPolicy": {
            "latest": FULL_RELEASE_CONTENT_TYPE,
            "minimumDurationSeconds": MINIMUM_FULL_RELEASE_SECONDS,
            "shortsAllowed": False,
        },
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "total": len(releases),
        "counts": catalogue_counts,
        "verifiedExtras": len(VERIFIED_EXTRA_RELEASES),
        "releases": releases,
    }


def main() -> None:
    if not os.environ.get("YT_KEY"):
        raise SystemExit("YT_KEY is required")
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "releases.json")
    try:
        existing_catalogue = json.loads(output.read_text(encoding="utf-8")) if output.exists() else {}
    except (OSError, json.JSONDecodeError):
        existing_catalogue = {}
    output.write_text(
        json.dumps(build_catalogue(existing_catalogue), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
