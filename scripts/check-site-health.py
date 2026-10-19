#!/usr/bin/env python3
"""Independent NextGen Sessions catalogue/deployment health check.

Runs on GitHub Actions without third-party packages. Never publishes data or
changes releases; it reports errors and leaves publication to verified jobs.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = os.environ.get("NEXTGEN_SITE_URL", "https://nextgensessions.com").rstrip("/") + "/"
DEPLOY_GRACE_SECONDS = 3600
RELEASE_GRACE_SECONDS = 7200
ERRORS: list[str] = []


def check(condition: bool, message: str) -> None:
    if condition:
        print("PASS:", message)
    else:
        ERRORS.append(message)
        print("FAIL:", message)


def load_json(relative: str) -> dict:
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def safe_id(value: object) -> bool:
    return re.fullmatch(r"[A-Za-z0-9_-]{11}", str(value or "")) is not None


def published_seconds(value: str) -> float | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError, AttributeError):
        return None


def repo_commit_age() -> float:
    try:
        stamp = subprocess.check_output(
            ["git", "log", "-1", "--format=%ct"], cwd=ROOT, text=True, timeout=8
        ).strip()
        return max(0, time.time() - int(stamp))
    except (OSError, ValueError, subprocess.SubprocessError):
        return 0


def fetch_live(relative: str) -> str:
    url = urljoin(BASE_URL, relative.lstrip("/"))
    for attempt in range(3):
        try:
            req = Request(
                url,
                headers={
                    "User-Agent": "NextGenSessionsSiteHealth/1.0",
                    "Accept": "text/html,application/json,text/css,*/*",
                    "Cache-Control": "no-cache",
                },
            )
            with urlopen(req, timeout=18) as response:
                result = response.read(4_000_000)
                if len(result) >= 4_000_000:
                    raise ValueError("Response exceeds safe health-check size limit")
                return result.decode("utf-8", "replace")
        except (HTTPError, URLError, OSError, ValueError) as exc:
            if attempt == 2:
                ERRORS.append(f"GET {url} failed after retries: {exc}")
                return ""
            time.sleep(3 * (attempt + 1))
    return ""


def run(local_only: bool = False) -> None:
    releases = load_json("releases.json").get("releases", [])
    mixes = load_json("mixes.json").get("mixes", [])
    albums = load_json("albums.json").get("albums", [])
    feed = load_json("latest-feed.json").get("latest") or {}
    index = read("index.html")

    check(bool(releases), "Verified releases catalogue is populated")
    check(len({r.get("id") for r in releases}) == len(releases),
          "Verified release IDs are unique")
    check(safe_id(feed.get("id")), "Latest upload has a valid YouTube ID")
    check(feed.get("contentType") in ("full-release", "long-mix", "album"),
          "Latest upload is a supported full-length content type")

    # Ensure the three newest content catalogues can agree with the independent
    # YouTube uploads feed. Respect feed/API propagation delays.
    by_type = {"full-release": releases, "long-mix": mixes, "album": albums}
    kind = feed.get("contentType")
    ident = str(feed.get("id") or "")
    pub = published_seconds(str(feed.get("published") or ""))
    is_due = pub is not None and time.time() - pub >= RELEASE_GRACE_SECONDS
    verified = next((r for r in by_type.get(kind, []) if r.get("id") == ident), None)
    if is_due:
        check(verified is not None,
              f"Latest published {kind} {ident} appears in its verified catalogue")
    else:
        print("INFO: Latest upload is within the 2-hour YouTube/playlist grace period")

    # Pure source checks are safe to run on every push, even before production deploys.
    count_match = re.search(r'id="rosterCount">(\d+) artists', read("artists/index.html"))
    check(count_match is not None, "Artist directory has a published roster count")
    check(".discography-art{display:block" in read("artist-discography.css"),
          "Artist artwork has an explicit visible layout")

    if verified and kind == "full-release":
        detail = str(verified.get("url") or "")
        if detail.startswith("/releases/") and detail.endswith("/"):
            local_path = detail.lstrip("/") + "index.html"
            check((ROOT / local_path).is_file() and ident in read(local_path),
                  f"Latest release page exists and links to video {ident}")

        # Only require a matched artist profile when the roster already has one.
        slug = re.sub(r"[^a-z0-9]+", "-", str(verified.get("artist") or "").lower()).strip("-")
        artist_relative = f"artists/{slug}/index.html"
        if (ROOT / artist_relative).is_file():
            artist_page = read(artist_relative)
            check(ident in artist_page and f"/embed/{ident}" in artist_page,
                  f"{verified.get('artist')} profile embeds its published track")
            check("/site-metrics.js" in artist_page,
                  f"{verified.get('artist')} profile loads mobile navigation")
        else:
            print(f"INFO: {verified.get('artist')} needs an onboarded artist profile: {slug}")

    if local_only:
        return

    # The main-branch commit may be newer than the Cloudflare deployment.
    # A newly uploaded video also needs time for playlist and Pages sync.
    homepage = fetch_live("/")
    live_releases_raw = fetch_live("/releases.json")
    live_feed_raw = fetch_live("/latest-feed.json")
    artist_directory = fetch_live("/artists/")
    check("<html" in homepage.lower(), "Production homepage returns HTML")
    check("<html" in artist_directory.lower(), "Production artist directory returns HTML")

    try:
        live_releases = json.loads(live_releases_raw).get("releases", [])
        check(isinstance(live_releases, list) and len(live_releases) >= 80,
              "Production release catalogue is readable and complete")
    except (ValueError, AttributeError):
        ERRORS.append("Production /releases.json is not valid release-catalogue JSON")
        live_releases = []
    try:
        live_feed = json.loads(live_feed_raw).get("latest") or {}
        check(safe_id(live_feed.get("id")), "Production Latest feed has a valid video ID")
    except (ValueError, AttributeError):
        ERRORS.append("Production /latest-feed.json is not valid Latest-feed JSON")
        live_feed = {}

    if repo_commit_age() >= DEPLOY_GRACE_SECONDS:
        if count_match:
            count = count_match.group(1)
            check(f'id="rosterCount">{count} artists' in artist_directory,
                  f"Production artist count matches the deployed roster ({count})")
        if is_due and verified and kind == "full-release":
            check(ident in {r.get("id") for r in live_releases},
                  f"Production catalogue includes published YouTube video {ident}")
            check(ident == live_feed.get("id"),
                  f"Production Latest feed matches verified GitHub feed ({ident})")
            # Only require the static home fallback when local generation picks this video.
            if f'data-video-id="{ident}"' in index:
                check(f'data-video-id="{ident}"' in homepage,
                      f"Production homepage advertises the latest release ({ident})")
            detail = str(verified.get("url") or "")
            if detail.startswith("/releases/") and detail.endswith("/"):
                remote_page = fetch_live(detail)
                check(f"/embed/{ident}" in remote_page or f'data-video-id="{ident}"' in remote_page,
                      f"Production release page can launch verified video {ident}")
            slug = re.sub(r"[^a-z0-9]+", "-", str(verified.get("artist") or "").lower()).strip("-")
            artist_relative = f"artists/{slug}/index.html"
            if (ROOT / artist_relative).is_file():
                live_artist = fetch_live(f"/artists/{slug}/")
                check(f"/embed/{ident}" in live_artist,
                      f"Production artist profile embeds latest verified video {ident}")
                check("/site-metrics.js" in live_artist,
                      f"Production artist profile loads responsive navigation")
    else:
        print("INFO: GitHub commit is younger than 60 minutes; allowing deployment propagation")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--local-only", action="store_true",
                        help="Validate checked-out files without calling the production domain")
    args = parser.parse_args()
    try:
        run(args.local_only)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        ERRORS.append(f"Health check could not complete: {exc}")
    if ERRORS:
        print("\nWEBSITE HEALTH FAILURES:")
        for message in ERRORS:
            print(" -", message)
        sys.exit(1)
    print("\nNextGen website health check passed.")
