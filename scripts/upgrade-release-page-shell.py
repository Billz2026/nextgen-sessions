#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "scripts" / "render-releases.py"
source = path.read_text(encoding="utf-8")

old_style = '<link rel="stylesheet" href="/styles.css">'
new_style = '<link rel="stylesheet" href="/styles.css?v=20260809-header1">'
if old_style in source:
    source = source.replace(old_style, new_style, 1)
elif new_style not in source:
    raise SystemExit("Could not locate global stylesheet link in release template")

old_header = '<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="NextGen Sessions home"><img src="/assets/nextgen-header.webp" width="256" height="212" alt="NextGen Sessions"></a><nav class="nav" aria-label="Primary navigation"><a href="/">Home</a><a href="/artists/">Artists</a><a href="/releases/" aria-current="page">Releases</a><a href="/mixes/">Mixes</a><a href="/submit.html">Submit</a><a class="nav-cta" href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></nav></div></header>'
new_header = '<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="NextGen Sessions home"><img src="/assets/nextgen-header-wordmark-2026.webp" width="1600" height="663" alt="NextGen Sessions"></a><nav class="nav" aria-label="Primary navigation"><a href="/">Home</a><a href="/artists/">Artists</a><a aria-current="page" href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="/#about">About</a><a href="/submit.html">Submit</a><a class="nav-cta" href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></nav></div></header>'
if old_header in source:
    source = source.replace(old_header, new_header, 1)
elif new_header not in source:
    raise SystemExit("Could not locate release page header template")

old_footer = '<footer class="site-footer"><div class="footer-inner"><div>© 2026 NextGen Sessions. Original music and independent artists.</div><div class="footer-links"><a href="/artists/">Artists</a><a href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></div></div></footer>'
new_footer = '<footer class="site-footer"><div class="footer-inner"><div>© 2026 NextGen Sessions. Original music and independent artists.</div><div class="footer-links"><a href="/artists/">Artists</a><a href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a><a href="https://www.tiktok.com/@nextgensessions" target="_blank" rel="noopener">TikTok</a><a href="https://www.instagram.com/next.gensessions/" target="_blank" rel="noopener">Instagram</a><a href="mailto:contact@nextgensessions.com">Contact</a></div></div></footer>'
if old_footer in source:
    source = source.replace(old_footer, new_footer, 1)
elif new_footer not in source:
    raise SystemExit("Could not locate release page footer template")

path.write_text(source, encoding="utf-8")
print("Release page generator upgraded to the premium global shell")
