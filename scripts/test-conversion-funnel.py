#!/usr/bin/env python3
"""Validate the Listen / Subscribe / Follow conversion layer and analytics contract."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
metrics = (ROOT / "site-metrics.js").read_text(encoding="utf-8")
css = (ROOT / "conversion-funnel.css").read_text(encoding="utf-8")
events = (ROOT / "functions" / "api" / "events.js").read_text(encoding="utf-8")

for token in (
    "installConversionFunnel",
    "data-ngs-conversion",
    "youtube-subscribe",
    "tiktok-follow",
    "instagram-follow",
    "funnel_listen",
    "youtube_subscribe_click",
    "social_follow_click",
    "https://www.youtube.com/@NextGenSessions?sub_confirmation=1",
    'listenHref: "#latestVideoFrame"',
    'listenHref: "#watch-title"',
    'listenHref: "#artist-discography"',
    'listenHref: "#listen"',
    'path === "/privacy"',
    'path === "/submit"',
):
    assert token in metrics, f"Conversion runtime missing: {token}"

for event in (
    "genre_click",
    "funnel_listen",
    "youtube_subscribe_click",
    "social_follow_click",
):
    assert f'"{event}"' in events, f"Analytics API does not allow {event}"

for token in (
    ".ngs-conversion",
    ".ngs-conversion-actions",
    ".ngs-conversion-action.is-primary",
    "@media(max-width:560px)",
):
    assert token in css, f"Conversion CSS missing: {token}"

runtime_files = (
    "site.js",
    "release-player.js",
    "mix-player.js",
    "artist-profile.js",
    "genre-hubs.js",
    "releases.js",
)
for filename in runtime_files:
    source = (ROOT / filename).read_text(encoding="utf-8")
    assert "/site-metrics.js" in source, f"{filename} does not load the shared conversion/metrics runtime"

homepage = (ROOT / "index.html").read_text(encoding="utf-8")
release = (ROOT / "releases" / "rudii-marka-top-shotta" / "index.html").read_text(encoding="utf-8")
artist = (ROOT / "artists" / "rudii-marka" / "index.html").read_text(encoding="utf-8")
mix = (ROOT / "mixes" / "uk-rap-mashup-series-1" / "index.html").read_text(encoding="utf-8")

assert 'id="releases"' in homepage and 'id="latestVideoFrame"' in homepage
assert 'id="watch-title"' in release
assert 'id="artist-discography"' in artist
assert 'id="listen"' in mix

print("Listen / Subscribe / Follow funnel QA passed across homepage, release, artist, mix and analytics surfaces.")
