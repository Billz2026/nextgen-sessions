#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


# 1) Add Zion Daley to the public artist roster.
path = "artists.js"
text = read(path)
if '"slug": "zion-daley"' not in text:
    marker = "\n];\n\n(function"
    if marker not in text:
        raise SystemExit("Could not find artists.js array terminator")
    record = '''\n  {\n    "name": "Zion Daley",\n    "slug": "zion-daley",\n    "genre": "Reggae",\n    "summary": "Straight reggae with grounded Jamaican street perspective, conscious writing and heavyweight roots energy.",\n    "featured": false\n  }'''
    text = text.replace(marker, "," + record + marker, 1)
    write(path, text)


# 2) Register the generated portrait in the shared artist image library.
path = "artist-images.js"
text = read(path)
if '"zion-daley"' not in text:
    marker = text.rfind("\n};")
    if marker < 0:
        raise SystemExit("Could not find artist-images.js object terminator")
    record = '''\n  "zion-daley": {\n    src: "/assets/artists/zion-daley-portrait.webp?v=20260824-zion1",\n    portrait: "/assets/artists/zion-daley-portrait.webp?v=20260824-zion1",\n    fallback: "/assets/artists/zion-daley-portrait.webp?v=20260824-zion1",\n    position: "50% 32%"\n  }'''
    text = text[:marker] + "," + record + text[marker:]
    write(path, text)


# 3) Update the full roster page count and cache-bust the artist data/image files.
path = "artists/index.html"
text = read(path)
text = text.replace("Thirty-two distinct artists", "Thirty-three distinct artists")
text = text.replace("Explore 32 NextGen Sessions artists", "Explore 33 NextGen Sessions artists")
text = text.replace(">32 artists<", ">33 artists<")
text = text.replace('/artists.js?v=20260809-clean1', '/artists.js?v=20260824-zion1')
text = text.replace('/artist-images.js?v=20260807-final3', '/artist-images.js?v=20260824-zion1')
write(path, text)


# 4) Ensure the automated YouTube catalogue knows Zion Daley by name.
path = "scripts/update-catalogue.py"
text = read(path)
if '"Zion Daley"' not in text:
    start = text.find("KNOWN_ARTISTS = [")
    end = text.find("\n]", start)
    if start < 0 or end < 0:
        raise SystemExit("Could not find KNOWN_ARTISTS")
    segment = text[start:end]
    segment += '\n    "Zion Daley",'
    text = text[:start] + segment + text[end:]
    write(path, text)


# 5) Create Zion Daley profile data. The YouTube ID will be added when supplied.
profile_js = r'''window.NGS_ARTIST_PROFILES = Object.assign(window.NGS_ARTIST_PROFILES || {}, {
  "zion-daley": {
    "name": "Zion Daley",
    "path": "/artists/zion-daley/",
    "genre": "Reggae",
    "location": "Jamaica",
    "eyebrow": "NextGen Sessions artist",
    "headline": "Straight reggae shaped by grounded Jamaican street perspective, conscious writing and heavyweight roots energy. Debut release Where We Live arrives 4 September 2026.",
    "bio": [
      "Zion Daley represents a straight reggae lane within NextGen Sessions, centred on grounded Jamaican perspective, social observation and a roots-weight sound.",
      "His debut release, Where We Live, introduces that identity through street-level realism and conscious writing. The official release is coming 4 September 2026."
    ],
    "imageKey": "zion-daley",
    "image": "/assets/artists/zion-daley-portrait.webp?v=20260824-zion1",
    "imagePosition": "50% 32%",
    "featuredVideo": {
      "title": "Where We Live",
      "label": "Zion Daley — Where We Live",
      "releaseDate": "4 September 2026"
    },
    "catalogueAliases": ["Zion Daley"],
    "youtubeUrl": "https://www.youtube.com/results?search_query=NextGen+Sessions+Zion+Daley",
    "related": [
      { "name": "Darian Gayle", "genre": "Reggae" },
      { "name": "Omari V", "genre": "Jamaican Lovers Rock / Reggae" }
    ]
  }
});
'''
write("artists/zion-daley/profile.js", profile_js)


# 6) Keep a clear Coming Soon state until the scheduled YouTube release is supplied.
coming_soon_js = r'''(function () {
  "use strict";
  const root = document.getElementById("artistProfile");
  if (!root || root.dataset.artist !== "zion-daley") return;

  function applyComingSoon() {
    const frame = root.querySelector("[data-featured-frame]");
    const tag = root.querySelector("[data-featured-tag]");
    const title = root.querySelector("[data-featured-title]");
    const copy = root.querySelector("[data-featured-copy]");
    const status = root.querySelector("[data-discography-status]");
    const latest = root.querySelector("[data-latest-release]");
    const grid = root.querySelector("[data-discography-grid]");
    const count = root.querySelector("[data-discography-count]");

    if (frame && !frame.querySelector("iframe")) {
      frame.innerHTML = '<div class="profile-video-unavailable"><strong>Coming soon</strong><br>Where We Live releases 4 September 2026.</div>';
    }
    if (tag && !/now playing/i.test(tag.textContent || "")) tag.textContent = "Coming soon";
    if (title && !root.querySelector("iframe")) title.textContent = "Where We Live";
    if (copy && !root.querySelector("iframe")) copy.textContent = "Reggae · 4 September 2026";
    if (status) status.textContent = "Coming soon";
    if (latest && !latest.querySelector("[data-release-id]")) {
      latest.innerHTML = '<div class="discography-empty"><strong>Coming soon</strong><br>Where We Live — 4 September 2026</div>';
    }
    if (grid && !grid.querySelector("[data-release-id]")) {
      grid.innerHTML = '<div class="discography-empty">Zion Daley’s debut release will be added automatically when it goes public.</div>';
    }
    if (count && !root.querySelector("[data-release-id]")) count.textContent = "0 releases";
  }

  [300, 1000, 2500].forEach(delay => window.setTimeout(applyComingSoon, delay));
})();
'''
write("artists/zion-daley/coming-soon.js", coming_soon_js)


# 7) Publish the crawlable profile page with SEO/social metadata.
index_html = '''<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Zion Daley | Reggae Artist | NextGen Sessions</title>
  <meta name="description" content="Meet Zion Daley, a straight reggae artist on NextGen Sessions. Debut release Where We Live arrives 4 September 2026.">
  <link rel="canonical" href="https://nextgensessions.com/artists/zion-daley/">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="Zion Daley | Reggae Artist | NextGen Sessions">
  <meta property="og:description" content="Straight reggae with grounded Jamaican street perspective. Where We Live arrives 4 September 2026.">
  <meta property="og:url" content="https://nextgensessions.com/artists/zion-daley/">
  <meta property="og:image" content="https://nextgensessions.com/assets/artists/zion-daley-portrait.webp?v=20260824-zion1">
  <meta property="og:image:alt" content="Zion Daley artist portrait">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Zion Daley | Reggae Artist | NextGen Sessions">
  <meta name="twitter:description" content="Where We Live — coming 4 September 2026.">
  <meta name="twitter:image" content="https://nextgensessions.com/assets/artists/zion-daley-portrait.webp?v=20260824-zion1">
  <meta name="theme-color" content="#080808">
  <link rel="icon" type="image/svg+xml" href="/assets/nextgen-favicon.svg">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://www.youtube-nocookie.com">
  <link rel="stylesheet" href="/styles.css?v=20260809-header1">
  <link rel="stylesheet" href="/artist-profile.css?v=20260810-playerfirst1">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"MusicGroup","name":"Zion Daley","genre":"Reggae","url":"https://nextgensessions.com/artists/zion-daley/","image":"https://nextgensessions.com/assets/artists/zion-daley-portrait.webp?v=20260824-zion1","description":"Straight reggae shaped by grounded Jamaican street perspective, conscious writing and heavyweight roots energy.","memberOf":{"@type":"Organization","name":"NextGen Sessions","url":"https://nextgensessions.com/"}}</script>
</head>
<body>
  <a class="skip-link" href="#artistProfile">Skip to artist profile</a>
  <header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="NextGen Sessions home"><img src="/assets/nextgen-header-wordmark-2026.webp" width="1600" height="663" alt="NextGen Sessions"></a><nav class="nav" aria-label="Primary navigation"><a href="/">Home</a><a aria-current="page" href="/artists/">Artists</a><a href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="/#about">About</a><a href="/submit.html">Submit</a><a class="nav-cta" href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></nav></div></header>
  <main class="profile-main" id="artistProfile" data-artist="zion-daley">
    <section class="profile-error"><p class="eyebrow">Loading artist profile</p><h1>Zion Daley</h1></section>
  </main>
  <footer class="site-footer"><div class="footer-inner"><div>© 2026 NextGen Sessions. Original music and independent artists.</div><div class="footer-links"><a href="/">Home</a><a href="/artists/">Artists</a><a href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a><a href="mailto:contact@nextgensessions.com">Contact</a></div></div></footer>
  <script src="/artist-images.js?v=20260824-zion1" defer></script>
  <script src="/artist-profiles.js" defer></script>
  <script src="/artist-profiles-expanded.js" defer></script>
  <script src="/artists/zion-daley/profile.js?v=20260824-zion1" defer></script>
  <script src="/artist-profile.js?v=20260810-playerfirst1" defer></script>
  <script src="/artists/zion-daley/coming-soon.js?v=20260824-zion1" defer></script>
</body>
</html>
'''
write("artists/zion-daley/index.html", index_html)


# 8) Add the artist page to the sitemap without disturbing generated release URLs.
path = "sitemap.xml"
text = read(path)
url = "https://nextgensessions.com/artists/zion-daley/"
if url not in text:
    entry = f"  <url><loc>{url}</loc></url>\n"
    if "</urlset>" not in text:
        raise SystemExit("Could not find sitemap urlset terminator")
    text = text.replace("</urlset>", entry + "</urlset>", 1)
    write(path, text)

print("Zion Daley profile prepared")
