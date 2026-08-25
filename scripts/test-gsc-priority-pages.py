#!/usr/bin/env python3
"""Regression checks for priority pages surfaced by Google Search Console."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

release = (ROOT / "releases" / "asif-sultaan-tor-wakhri" / "index.html").read_text(encoding="utf-8")
artist = (ROOT / "artists" / "asif-sultaan" / "index.html").read_text(encoding="utf-8")
mix = (ROOT / "mixes" / "sound-of-summer" / "index.html").read_text(encoding="utf-8")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
mix_sitemap = (ROOT / "sitemap-mixes.xml").read_text(encoding="utf-8")

assert 'rel="canonical" href="https://nextgensessions.com/releases/asif-sultaan-tor-wakhri/"' in release
assert 'data-release-editorial="true"' in release
assert 'MusicRecording' in release and 'VideoObject' in release
assert '/artists/asif-sultaan/' in release and '/genres/global-sounds/' in release

assert 'rel="canonical" href="https://nextgensessions.com/artists/asif-sultaan/"' in artist
assert 'Latest release: Tor Wakhri' in artist
assert '/assets/artists/asif-sultaan-portrait-final.webp' in artist, "Asif schema/profile lost the canonical portrait"
assert artist.count('class="discography-card"') >= 3
assert 'data-static-bio' in artist

assert 'rel="canonical" href="https://nextgensessions.com/mixes/sound-of-summer/"' in mix
assert '65-minute' in mix
assert 'dancehall' in mix.lower() and 'uk rap' in mix.lower() and 'r&amp;b' in mix.lower() and 'hip-hop' in mix.lower()
assert 'id="summer-about-title"' in mix
for href in (
    '/genres/dancehall/',
    '/genres/uk-rap-grime/',
    '/genres/rnb-soul/',
    '/genres/hip-hop-g-funk/',
    '/mixes/uk-rap-mashup-series-1/',
    '/mixes/hip-hop-mashup-series-1/',
    '/mixes/dancehall-mashups/',
):
    assert f'href="{href}"' in mix, f"Sound of Summer missing internal discovery link {href}"
assert 'VideoObject' in mix and 'PT1H5M28S' in mix

assert '/api/andre-portrait' not in sitemap
assert '/api/andre-portrait' not in mix_sitemap

print("Search Console priority page QA passed: Tor Wakhri, Asif Sultaan and Sound of Summer are index-ready; portrait API is not sitemap-listed.")
