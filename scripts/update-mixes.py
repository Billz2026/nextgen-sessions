#!/usr/bin/env python3
"""Build the public long-mix catalogue from NextGen YouTube sources."""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


# Dedicated public archive playlists. The uploads feed is also scanned so a
# correctly titled long mix is discovered even before it is filed in an archive.
MIX_PLAYLISTS = [
    ("PL7VCdVWElIJHmKbRC991uECD-bzjqL0Xf", "dancehall"),
    ("PL7VCdVWElIJGzKTCsH1bYUWYeuJ3TLH80", "hip-hop"),
    ("PL7VCdVWElIJFBW8boYLO9Y9c5O3zgUxYi", "uk-rap"),
    ("PL7VCdVWElIJEOeOol8I7b6oN_rjgxS4vu", "summer"),
]
UPLOADS_PLAYLIST_ID = "UUJdBLa1mf6yxk7xaOzSpBjg"
MINIMUM_MIX_SECONDS = 10 * 60

COLLECTIONS = {
    "grime": {
        "name": "Grime Mashup",
        "match": re.compile(r"(?:\bgrime\b.*\b(?:mash(?:\s*up)?|mix)\b|\b(?:mash(?:\s*up)?|mix)\b.*\bgrime\b)", re.I),
    },
    "hip-hop": {
        "name": "Hip-Hop Mashup",
        "match": re.compile(r"(?:\bhip[\s-]?hop\b.*\b(?:mash(?:\s*up)?|mix)\b|\b(?:mash(?:\s*up)?|mix)\b.*\bhip[\s-]?hop\b)", re.I),
    },
    "uk-rap": {
        "name": "UK Rap Mashup",
        "match": re.compile(r"(?:\buk\s+rap\b.*\b(?:mash(?:\s*up)?|mix)\b|\b(?:mash(?:\s*up)?|mix)\b.*\buk\s+rap\b)", re.I),
    },
    "dancehall": {
        "name": "Dancehall Mashup",
        "match": re.compile(r"(?:\bdancehall\b.*\b(?:mash(?:\s*up)?|mix)\b|\b(?:mash(?:\s*up)?|mix)\b.*\bdancehall\b)", re.I),
    },
    "summer": {
        "name": "The Sound of Summer",
        "match": re.compile(r"\b(?:the\s+)?sound\s+of\s+summer\b|\bsummer\s+mix\b", re.I),
    },
}

EXCLUDED = re.compile(
    r"\b(shorts?|teaser|trailer|promo|preview|coming soon|out tomorrow|out tonight|out now)\b|#shorts",
    re.I,
)


def youtube_api(resource: str, **params: str) -> dict:
    params["key"] = os.environ["YT_KEY"]
    url = "https://www.googleapis.com/youtube/v3/" + resource + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "NextGenSessionsMixCatalogue/1.0"})
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


def classify_title(title: str) -> str:
    # Specific UK Rap is checked before the broader Grime lane.
    for key in ("uk-rap", "hip-hop", "dancehall", "grime", "summer"):
        if COLLECTIONS[key]["match"].search(title or ""):
            return key
    return ""


def roman_to_int(value: str) -> int:
    value = value.upper()
    if not value or not re.fullmatch(r"[IVXLCDM]+", value):
        return 0
    total = 0
    previous = 0
    numerals = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    for character in reversed(value):
        current = numerals[character]
        if current < previous:
            total -= current
        else:
            total += current
            previous = current
    return total


def series_number(title: str) -> int:
    match = re.search(r"\b(?:series|season|s)\s*[-:#]?\s*(\d+|[ivxlcdm]+)\b", title or "", re.I)
    if not match:
        return 0
    value = match.group(1)
    return int(value) if value.isdigit() else roman_to_int(value)


def int_to_roman(value: int) -> str:
    if value <= 0 or value > 3999:
        return str(value)
    result = []
    for number, numeral in (
        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"),
        (90, "XC"), (50, "L"), (40, "XL"), (10, "X"), (9, "IX"),
        (5, "V"), (4, "IV"), (1, "I"),
    ):
        while value >= number:
            result.append(numeral)
            value -= number
    return "".join(result)


def clean_raw_title(value: str) -> str:
    segments = [segment.strip() for segment in (value or "").split("|") if segment.strip()]
    return segments[0] if segments else (value or "").strip()


def display_fields(collection: str, raw_title: str) -> tuple[str, str, int]:
    number = series_number(raw_title)
    name = str(COLLECTIONS[collection]["name"])
    if number:
        label = f"Series {int_to_roman(number)}"
        return f"{name} — {label}", label, number
    if collection == "summer":
        year_match = re.search(r"\b(20\d{2})\b", raw_title or "")
        if year_match:
            year = int(year_match.group(1))
            return f"The Sound of Summer {year}", f"Summer Mix {year}", year
    return clean_raw_title(raw_title) or name, "Full-length mix", 0


def existing_collection_candidates(existing_catalogue: dict, collection: str) -> list[dict]:
    mixes = existing_catalogue.get("mixes", []) if isinstance(existing_catalogue, dict) else []
    return [
        {**item, "fixedCollection": collection, "fallback": True}
        for item in mixes
        if item.get("collection") == collection and re.fullmatch(r"[\w-]{11}", item.get("id", ""))
    ]


def add_playlist_candidates(
    candidates: list[dict],
    seen: set[str],
    items: list[dict],
    fixed_collection: str = "",
) -> None:
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
        collection = fixed_collection or classify_title(raw_title)
        if not collection:
            continue
        candidates.append({"id": video_id, "fixedCollection": collection, "rawTitle": raw_title})
        seen.add(video_id)


def build_mix_catalogue(existing_catalogue: dict | None = None) -> dict:
    existing_catalogue = existing_catalogue or {}
    candidates: list[dict] = []
    seen: set[str] = set()

    for playlist_id, collection in MIX_PLAYLISTS:
        try:
            items = playlist_items(playlist_id)
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            items = []
            fallbacks = existing_collection_candidates(existing_catalogue, collection)
            print(
                f"Warning: mix playlist {playlist_id} for {collection} returned 404; "
                f"retaining {len(fallbacks)} existing entries.",
                file=sys.stderr,
            )
            for fallback in fallbacks:
                if fallback["id"] not in seen:
                    candidates.append(fallback)
                    seen.add(fallback["id"])
        add_playlist_candidates(candidates, seen, items, collection)

    try:
        uploads = playlist_items(UPLOADS_PLAYLIST_ID)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        uploads = []
        print("Warning: channel uploads feed returned 404; dedicated mix archives remain active.", file=sys.stderr)
    add_playlist_candidates(candidates, seen, uploads)

    videos = video_details([candidate["id"] for candidate in candidates])
    mixes: list[dict] = []
    for candidate in candidates:
        video = videos.get(candidate["id"])
        if not video:
            continue
        status = video.get("status", {})
        if status.get("privacyStatus", "") not in ("public", "unlisted"):
            continue
        snippet = video.get("snippet", {})
        raw_title = snippet.get("title", "").strip() or candidate.get("rawTitle", "")
        published = snippet.get("publishedAt", "")
        duration = duration_seconds(video.get("contentDetails", {}).get("duration", ""))
        collection = candidate.get("fixedCollection", "") or classify_title(raw_title)
        if (
            collection not in COLLECTIONS
            or not raw_title
            or EXCLUDED.search(raw_title)
            or not is_published(published)
            or duration < MINIMUM_MIX_SECONDS
        ):
            continue
        title, label, sequence = display_fields(collection, raw_title)
        mixes.append(
            {
                "id": candidate["id"],
                "contentType": "long-mix",
                "collection": collection,
                "title": title,
                "label": label,
                "name": str(COLLECTIONS[collection]["name"]),
                "sequence": sequence,
                "published": published,
                "durationSeconds": duration,
                "rawTitle": raw_title,
                "thumbnail": f"https://i.ytimg.com/vi/{candidate['id']}/hqdefault.jpg",
            }
        )

    collection_order = {key: index for index, key in enumerate(COLLECTIONS)}
    mixes.sort(
        key=lambda item: (
            collection_order[item["collection"]],
            item.get("sequence") or 999999,
            item.get("published", ""),
            item["id"],
        )
    )
    counts = {key: 0 for key in COLLECTIONS}
    for item in mixes:
        counts[item["collection"]] += 1
    return {
        "source": "youtube-mix-archives-and-channel-uploads",
        "contentPolicy": {
            "contentType": "long-mix",
            "minimumDurationSeconds": MINIMUM_MIX_SECONDS,
            "shortsAllowed": False,
        },
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "total": len(mixes),
        "counts": counts,
        "mixes": mixes,
    }


def main() -> None:
    if not os.environ.get("YT_KEY"):
        raise SystemExit("YT_KEY is required")
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "mixes.json")
    try:
        existing = json.loads(output.read_text(encoding="utf-8")) if output.exists() else {}
    except (OSError, json.JSONDecodeError):
        existing = {}
    output.write_text(
        json.dumps(build_mix_catalogue(existing), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
