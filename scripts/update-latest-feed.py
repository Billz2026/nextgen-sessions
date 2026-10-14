#!/usr/bin/env python3
"""Update Latest automatically using verified YouTube metadata.

Read the channel uploads playlist through the YouTube Data API when available.
Fall back to the public RSS feed, and retain the last verified release when
YouTube cannot supply duration. Shorts are never accepted as Latest.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = "UCJdBLa1mf6yxk7xaOzSpBjg"
FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
UPLOADS_PLAYLIST_ID = "UU" + CHANNEL_ID[2:]
MINIMUM_REGULAR_SECONDS = 181
MINIMUM_MIX_SECONDS = 600
BLOCKED = re.compile(
    r"\b(shorts?|teaser|trailer|promo|preview|incoming|announcement|announcing|new\s+drop|coming soon|out tomorrow|out tonight|out now)\b|#shorts",
    re.IGNORECASE,
)
MIX_HINT = re.compile(r"\b(mash\s*up|mashup|riddim|mix|qawwali\s+nights?|desi\s+junction)\b", re.IGNORECASE)
ALBUM_HINT = re.compile(r"\balbum\b", re.IGNORECASE)
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
SEPARATOR = re.compile(r"^(.*?)\s+[-–—]\s+(.+)$")
UA = "Mozilla/5.0 (compatible; NextGenSessionsLatestFeed/2.0)"


def request_text(url: str, timeout: int = 25) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/atom+xml,application/xml,text/xml,text/html;q=0.9,*/*;q=0.8",
            "User-Agent": UA,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def feed_entries(xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    atom = "{http://www.w3.org/2005/Atom}"
    yt = "{http://www.youtube.com/xml/schemas/2015}"
    entries: list[dict] = []
    for entry in root.findall(f"{atom}entry"):
        video_id = (entry.findtext(f"{yt}videoId") or "").strip()
        title = (entry.findtext(f"{atom}title") or "").strip()
        published = (entry.findtext(f"{atom}published") or "").strip()
        if VIDEO_ID.fullmatch(video_id) and title and published:
            entries.append({"id": video_id, "rawTitle": title, "published": published})
    return entries


def trusted_title(raw_title: str) -> bool:
    parts = [part.strip() for part in raw_title.split("|") if part.strip()]
    return bool(
        "nextgen sessions" in raw_title.casefold()
        and not BLOCKED.search(raw_title)
        and (len(parts) >= 3 or ALBUM_HINT.search(raw_title) or MIX_HINT.search(raw_title))
    )


def content_type(raw_title: str) -> str:
    if ALBUM_HINT.search(raw_title):
        return "album"
    if MIX_HINT.search(raw_title):
        return "long-mix"
    return "full-release"


def artist_title(raw_title: str) -> tuple[str, str]:
    parts = [part.strip() for part in raw_title.split("|") if part.strip()]
    for part in parts:
        match = SEPARATOR.match(part)
        if match and match.group(1).strip() and match.group(2).strip():
            return match.group(1).strip(), match.group(2).strip()
    return "NextGen Sessions", parts[0] if parts else raw_title.strip()


def duration_seconds(video_id: str) -> int:
    """Return verified duration or zero. Unknown duration must never qualify as Latest."""
    try:
        html = request_text(f"https://www.youtube.com/watch?v={video_id}", timeout=20)
    except (OSError, urllib.error.URLError, urllib.error.HTTPError):
        return 0

    direct = re.search(r'"lengthSeconds":"(\d+)"', html)
    if direct:
        return int(direct.group(1))
    approx = re.search(r'"approxDurationMs":"(\d+)"', html)
    if approx:
        return round(int(approx.group(1)) / 1000)
    return 0


def released(published: str) -> bool:
    try:
        instant = datetime.fromisoformat(published.replace("Z", "+00:00"))
    except ValueError:
        return False
    return instant <= datetime.now(timezone.utc)


def destination(kind: str) -> str:
    if kind == "album":
        return "/mixes/full-albums/"
    if kind == "long-mix":
        return "/mixes/"
    return "/releases/"


def iso_duration_seconds(value: str) -> int:
    """Decode YouTube Data API's contentDetails.duration field."""
    match = re.fullmatch(r"PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?", str(value or ""))
    if not match:
        return 0
    hours, minutes, seconds = (int(part or 0) for part in match.groups())
    return hours * 3600 + minutes * 60 + seconds


def youtube_json(resource: str, **params) -> dict:
    params["key"] = os.environ["YT_KEY"]
    url = "https://www.googleapis.com/youtube/v3/" + resource + "?" + urllib.parse.urlencode(params)
    return json.loads(request_text(url, timeout=25))


def eligible_entry(item: dict, seconds: int) -> bool:
    raw_title = item.get("rawTitle", "")
    kind = content_type(raw_title)
    minimum = MINIMUM_MIX_SECONDS if kind == "long-mix" else MINIMUM_REGULAR_SECONDS
    return (
        trusted_title(raw_title)
        and released(item.get("published", ""))
        and seconds >= minimum
    )


def make_latest(item: dict, seconds: int, source: str) -> dict:
    artist, title = artist_title(item["rawTitle"])
    kind = content_type(item["rawTitle"])
    return {
        "id": item["id"],
        "contentType": kind,
        "artist": artist,
        "title": title,
        "rawTitle": item["rawTitle"],
        "published": item["published"],
        "durationSeconds": seconds,
        "url": destination(kind),
        "discoverySource": source,
    }


def discover_via_api() -> dict:
    """The official API supplies verifiable length even when watch-page scraping fails."""
    uploads = youtube_json(
        "playlistItems", part="contentDetails", playlistId=UPLOADS_PLAYLIST_ID, maxResults=50
    ).get("items", [])
    ids = [
        str(entry.get("contentDetails", {}).get("videoId", "")).strip()
        for entry in uploads
    ]
    ids = list(dict.fromkeys(video_id for video_id in ids if VIDEO_ID.fullmatch(video_id)))
    if not ids:
        raise RuntimeError("YouTube uploads playlist contained no available videos")
    videos = youtube_json(
        "videos", part="snippet,status,contentDetails", id=",".join(ids)
    ).get("items", [])

    candidates = []
    for video in videos:
        if video.get("status", {}).get("privacyStatus") != "public":
            continue
        snippet = video.get("snippet", {})
        if snippet.get("liveBroadcastContent") in ("live", "upcoming"):
            continue
        item = {
            "id": str(video.get("id", "")),
            "rawTitle": str(snippet.get("title", "")).strip(),
            "published": str(snippet.get("publishedAt", "")).strip(),
        }
        if not VIDEO_ID.fullmatch(item["id"]):
            continue
        seconds = iso_duration_seconds(video.get("contentDetails", {}).get("duration", ""))
        if eligible_entry(item, seconds):
            candidates.append((item, seconds))
    if not candidates:
        raise RuntimeError("No verified non-Short uploads returned by YouTube Data API")
    item, seconds = max(candidates, key=lambda row: row[0]["published"])
    return make_latest(item, seconds, "youtube-channel-feed")


def discover_via_rss() -> dict:
    """Quota-free recovery: duration must still be verifiable, never guessed."""
    entries = sorted(
        (
            item
            for item in feed_entries(request_text(FEED_URL))
            if trusted_title(item["rawTitle"]) and released(item["published"])
        ),
        key=lambda item: item["published"],
        reverse=True,
    )

    for item in entries[:10]:
        kind = content_type(item["rawTitle"])
        seconds = duration_seconds(item["id"])
        # Shorts can run up to three minutes. Only >180-second public-feed videos qualify.
        # Shorter genuine singles remain eligible via the verified releases catalogue.
        if not eligible_entry(item, seconds):
            continue
        return make_latest(item, seconds, "public-youtube-channel-feed")

    raise RuntimeError("No eligible full-length NextGen Sessions upload found in the public channel feed")


def discover() -> dict:
    if os.environ.get("YT_KEY"):
        try:
            return discover_via_api()
        except Exception as error:
            print(f"Warning: YouTube Data API unavailable: {error}", file=sys.stderr)
    return discover_via_rss()


def load_existing(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def main() -> None:
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "latest-feed.json")
    existing = load_existing(output)

    try:
        latest = discover()
    except Exception as error:
        previous = existing.get("latest") or {}
        previous_seconds = int(previous.get("durationSeconds") or 0)
        previous_minimum = 600 if previous.get("contentType") == "long-mix" else 181
        if (
            VIDEO_ID.fullmatch(str(previous.get("id", "")))
            and trusted_title(str(previous.get("rawTitle", "")))
            and previous_seconds >= previous_minimum
        ):
            print(f"Warning: public YouTube feed unavailable; retaining last-known-good Latest: {error}", file=sys.stderr)
            return
        raise

    previous = existing.get("latest", {})
    # A temporarily lagging YouTube feed must never roll back a verified release.
    if (
        previous.get("id") != latest["id"]
        and trusted_title(str(previous.get("rawTitle", "")))
        and int(previous.get("durationSeconds") or 0) >= (
            MINIMUM_MIX_SECONDS if previous.get("contentType") == "long-mix" else MINIMUM_REGULAR_SECONDS
        )
        and str(previous.get("published", "")) > latest["published"]
    ):
        print(f"Latest discovery is older than verified release {previous['id']}; retaining newer release")
        return
    if (
        previous.get("id") == latest["id"]
        and previous.get("published") == latest["published"]
        and previous.get("rawTitle") == latest["rawTitle"]
    ):
        print(f"Latest feed unchanged: {latest['id']}")
        return

    payload = {
        "source": "verified-youtube-channel-uploads",
        "policy": "full-length-standard-title-no-shorts",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "latest": latest,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Latest feed updated: {latest['contentType']} — {latest['artist']} — {latest['title']}")


if __name__ == "__main__":
    main()
