#!/usr/bin/env python3
"""Discover due scheduled releases from the public NextGen Sessions channel uploads.

The central schedule never stores a YouTube/video identifier. Once release time has
passed, this script resolves the channel's uploads playlist, finds a matching public
full-length video by artist/title, and promotes it into releases.json. The normal
release renderer then creates URLs, pages, schema and downstream discovery.
"""

from __future__ import annotations

import importlib.util
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE_PATH = ROOT / "releases.json"
SCHEDULE_PATH = ROOT / "scheduled-releases.json"
YOUTUBE_HANDLE = "NextGenSessions"

spec = importlib.util.spec_from_file_location("update_catalogue", ROOT / "scripts" / "update-catalogue.py")
if spec is None or spec.loader is None:
    raise SystemExit("Could not load catalogue utilities")
catalogue_tools = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalogue_tools)


def normalise(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("’", "'").replace("‘", "'").strip()).casefold()


def scheduled_at(item: dict, default_timezone: str) -> datetime:
    local = datetime.fromisoformat(str(item.get("releaseLocal", "")))
    if local.tzinfo is not None:
        raise ValueError("releaseLocal must be timezone-free local wall time")
    zone = ZoneInfo(str(item.get("timezone") or default_timezone))
    first = local.replace(tzinfo=zone, fold=0)
    second = local.replace(tzinfo=zone, fold=1)
    if first.utcoffset() != second.utcoffset():
        raise ValueError(f"Ambiguous scheduled local time: {item.get('releaseLocal')}")
    instant = first.astimezone(timezone.utc)
    if instant.astimezone(zone).replace(tzinfo=None) != local:
        raise ValueError(f"Non-existent scheduled local time: {item.get('releaseLocal')}")
    return instant


def same_release(left: dict, right: dict) -> bool:
    return normalise(left.get("artist", "")) == normalise(right.get("artist", "")) and normalise(left.get("title", "")) == normalise(right.get("title", ""))


def uploads_playlist_id() -> str:
    payload = catalogue_tools.youtube_api(
        "channels",
        part="contentDetails",
        forHandle=YOUTUBE_HANDLE,
        maxResults="1",
    )
    items = payload.get("items", [])
    if not items:
        raise RuntimeError(f"Could not resolve YouTube channel handle @{YOUTUBE_HANDLE}")
    return str(items[0].get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads", ""))


def recent_uploads(playlist_id: str) -> list[dict]:
    payload = catalogue_tools.youtube_api(
        "playlistItems",
        part="snippet,contentDetails,status",
        playlistId=playlist_id,
        maxResults="50",
    )
    return payload.get("items", [])


def main() -> None:
    if not os.environ.get("YT_KEY"):
        raise SystemExit("YT_KEY is required")

    schedule_payload = json.loads(SCHEDULE_PATH.read_text(encoding="utf-8"))
    catalogue = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    releases = list(catalogue.get("releases", []))
    default_timezone = str(schedule_payload.get("defaultTimezone", "Europe/London"))
    now = datetime.now(timezone.utc)

    due = []
    for item in schedule_payload.get("releases", []):
        if scheduled_at(item, default_timezone) > now:
            continue
        if any(same_release(release, item) for release in releases):
            continue
        due.append(item)

    if not due:
        print("No due scheduled releases require channel discovery.")
        return

    playlist_id = uploads_playlist_id()
    if not playlist_id:
        raise RuntimeError("YouTube uploads playlist ID is unavailable")

    upload_items = recent_uploads(playlist_id)
    candidates: list[tuple[dict, str, str]] = []
    for item in upload_items:
        snippet = item.get("snippet", {})
        video_id = str(item.get("contentDetails", {}).get("videoId", ""))
        raw_title = str(snippet.get("title", "")).strip()
        if not re.fullmatch(r"[\w-]{11}", video_id) or not raw_title or catalogue_tools.EXCLUDED.search(raw_title):
            continue
        artist, title = catalogue_tools.split_artist_title(raw_title)
        for scheduled in due:
            if normalise(artist) == normalise(scheduled.get("artist")) and normalise(title) == normalise(scheduled.get("title")):
                candidates.append((scheduled, video_id, raw_title))
                break

    if not candidates:
        print(f"{len(due)} scheduled release(s) are due, but no matching public channel upload is available yet.")
        return

    details = catalogue_tools.video_details([video_id for _, video_id, _ in candidates])
    added = 0
    for scheduled, video_id, raw_title in candidates:
        video = details.get(video_id)
        if not video:
            continue
        status = video.get("status", {})
        snippet = video.get("snippet", {})
        published = str(snippet.get("publishedAt", ""))
        duration = catalogue_tools.duration_seconds(video.get("contentDetails", {}).get("duration", ""))
        if status.get("privacyStatus") not in ("public", "unlisted"):
            continue
        if not catalogue_tools.is_published(published) or duration < catalogue_tools.MINIMUM_FULL_RELEASE_SECONDS:
            continue
        if any(str(release.get("id")) == video_id for release in releases):
            continue

        releases.append({
            "id": video_id,
            "contentType": catalogue_tools.FULL_RELEASE_CONTENT_TYPE,
            "artist": scheduled["artist"],
            "title": scheduled["title"],
            "group": scheduled["group"],
            "published": published,
            "durationSeconds": duration,
            "rawTitle": raw_title,
        })
        added += 1

    if not added:
        print("Matching scheduled uploads were found but none passed full-release validation yet.")
        return

    releases.sort(key=lambda item: item.get("published", ""), reverse=True)
    counts: dict[str, int] = {}
    for release in releases:
        group = str(release.get("group", "NextGen Sessions"))
        counts[group] = counts.get(group, 0) + 1

    catalogue["releases"] = releases
    catalogue["total"] = len(releases)
    catalogue["counts"] = counts
    catalogue["generatedAt"] = now.isoformat().replace("+00:00", "Z")
    catalogue["scheduledDiscovery"] = int(catalogue.get("scheduledDiscovery", 0)) + added
    CATALOGUE_PATH.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Promoted {added} due scheduled release(s) from public channel uploads into releases.json.")


if __name__ == "__main__":
    main()
