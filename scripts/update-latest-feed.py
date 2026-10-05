#!/usr/bin/env python3
"""Maintain a tiny, quota-free Latest payload from the public YouTube channel feed.

This is deliberately independent of the YouTube Data API. It is the homepage's
recovery lane when API quota, credentials or playlist endpoints are unavailable.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = "UCJdBLa1mf6yxk7xaOzSpBjg"
FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
BLOCKED = re.compile(
    r"\b(shorts?|teaser|trailer|promo|preview|coming soon|out tomorrow|out tonight|out now)\b|#shorts",
    re.IGNORECASE,
)
MIX_HINT = re.compile(r"\b(mash\s*up|mashup|riddim|mix)\b", re.IGNORECASE)
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
    """Best-effort Shorts guard. A trusted standard title remains usable if YouTube blocks this page."""
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


def discover() -> dict:
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
        minimum = 600 if kind == "long-mix" else 75
        if seconds and seconds < minimum:
            continue

        artist, title = artist_title(item["rawTitle"])
        return {
            "id": item["id"],
            "contentType": kind,
            "artist": artist,
            "title": title,
            "rawTitle": item["rawTitle"],
            "published": item["published"],
            "durationSeconds": seconds,
            "url": destination(kind),
            "discoverySource": "public-youtube-channel-feed",
        }

    raise RuntimeError("No eligible full-length NextGen Sessions upload found in the public channel feed")


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
        if existing.get("latest", {}).get("id"):
            print(f"Warning: public YouTube feed unavailable; retaining last-known-good Latest: {error}", file=sys.stderr)
            return
        raise

    previous = existing.get("latest", {})
    if (
        previous.get("id") == latest["id"]
        and previous.get("published") == latest["published"]
        and previous.get("rawTitle") == latest["rawTitle"]
    ):
        print(f"Latest feed unchanged: {latest['id']}")
        return

    payload = {
        "source": "public-youtube-channel-feed",
        "policy": "full-length-standard-title-no-shorts",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "latest": latest,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Latest feed updated: {latest['contentType']} — {latest['artist']} — {latest['title']}")


if __name__ == "__main__":
    main()
