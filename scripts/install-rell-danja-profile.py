from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE_VERSION = "20260804-rell1"

IMAGE_ENTRY = '''  "rell-danja": {
    src: "/assets/artists/rell-danja-card.webp?v=20260804-rell1",
    srcset: "/assets/artists/rell-danja-card-640.webp?v=20260804-rell1 640w, /assets/artists/rell-danja-card.webp?v=20260804-rell1 1024w",
    portrait: "/assets/artists/rell-danja-portrait.webp?v=20260804-rell1",
    fallback: "/assets/artists/rell-danja-card-640.webp?v=20260804-rell1",
    position: "50% 31%"
  },
'''

PROFILE_JS = '''window.NGS_ARTIST_PROFILES = Object.assign(window.NGS_ARTIST_PROFILES || {}, {
  "rell-danja": {
    "name": "Rell Danja",
    "path": "/artists/rell-danja/",
    "genre": "Jamaican Dancehall",
    "location": "Jamaica",
    "eyebrow": "NextGen Sessions featured artist",
    "headline": "Hard-edged gullyside dancehall shaped by survival, loyalty, sleepless pressure and consequences.",
    "bio": [
      "Rell Danja represents a hard-edged Jamaican dancehall lane within NextGen Sessions, using direct writing and controlled delivery to explore survival, loyalty, pressure and consequences.",
      "His current catalogue moves from betrayal and retaliation on Cross Me, Regret It to sleepless tension on No Sleep Fi Di Wicked and isolation on Nuh Friend In The Street."
    ],
    "imageKey": "rell-danja",
    "imagePosition": "50% 31%",
    "featuredVideo": {
      "id": "919KvYLP_OQ",
      "title": "Cross Me, Regret It",
      "label": "Rell Danja — Cross Me, Regret It",
      "published": "2026-07-01T18:01:56Z"
    },
    "catalogueAliases": ["Rell Danja"],
    "additionalReleases": [
      {
        "id": "919KvYLP_OQ",
        "artist": "Rell Danja",
        "title": "Cross Me, Regret It",
        "group": "Dancehall",
        "published": "2026-07-01T18:01:56Z"
      },
      {
        "id": "4mu5NVxUeII",
        "artist": "Rell Danja",
        "title": "No Sleep Fi Di Wicked",
        "group": "Dancehall",
        "published": "2026-05-29T07:46:03Z"
      },
      {
        "id": "i2xhycshXEg",
        "artist": "Rell Danja",
        "title": "Nuh Friend In The Street (No Friends Left)",
        "group": "Dancehall",
        "published": "2026-04-20T15:39:04Z"
      }
    ],
    "youtubeUrl": "https://www.youtube.com/results?search_query=NextGen+Sessions+Rell+Danja",
    "related": [
      { "name": "Reeko", "genre": "Jamaican Dancehall" },
      { "name": "Rudii Marka", "genre": "Jamaican Dancehall" },
      { "name": "Kemarco", "genre": "Dark Melodic Dancehall" }
    ]
  }
});
'''

PROFILE_HTML = '''<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rell Danja | Jamaican Dancehall | NextGen Sessions</title>
  <meta name="description" content="Explore Rell Danja and his hard-edged Jamaican dancehall catalogue on NextGen Sessions.">
  <link rel="canonical" href="https://nextgensessions.com/artists/rell-danja/">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="Rell Danja | NextGen Sessions">
  <meta property="og:description" content="Hard-edged Jamaican dancehall shaped by survival, loyalty, pressure and consequences.">
  <meta property="og:url" content="https://nextgensessions.com/artists/rell-danja/">
  <meta property="og:image" content="https://nextgensessions.com/assets/artists/rell-danja-portrait.webp?v=20260804-rell1">
  <meta property="og:image:alt" content="Rell Danja portrait">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Rell Danja | NextGen Sessions">
  <meta name="twitter:description" content="Explore Rell Danja and his official dancehall releases.">
  <meta name="twitter:image" content="https://nextgensessions.com/assets/artists/rell-danja-portrait.webp?v=20260804-rell1">
  <meta name="theme-color" content="#080808">
  <link rel="icon" type="image/svg+xml" href="/assets/nextgen-favicon.svg">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://www.youtube-nocookie.com">
  <link rel="preconnect" href="https://i.ytimg.com">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/artist-profile.css">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"MusicGroup","name":"Rell Danja","genre":"Jamaican Dancehall","url":"https://nextgensessions.com/artists/rell-danja/","image":"https://nextgensessions.com/assets/artists/rell-danja-portrait.webp?v=20260804-rell1","subjectOf":[{"@type":"MusicVideoObject","name":"Cross Me, Regret It","url":"https://www.youtube.com/watch?v=919KvYLP_OQ"},{"@type":"MusicVideoObject","name":"No Sleep Fi Di Wicked","url":"https://www.youtube.com/watch?v=4mu5NVxUeII"},{"@type":"MusicVideoObject","name":"Nuh Friend In The Street (No Friends Left)","url":"https://www.youtube.com/watch?v=i2xhycshXEg"}],"memberOf":{"@type":"Organization","name":"NextGen Sessions","url":"https://nextgensessions.com/"}}</script>
</head>
<body>
  <a class="skip-link" href="#artistProfile">Skip to artist profile</a>
  <header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="NextGen Sessions home"><img src="/assets/nextgen-wordmark.webp" width="1000" height="425" alt="NextGen Sessions"></a><nav class="nav" aria-label="Primary navigation"><a href="/#featured-artists">Featured</a><a href="/artists/">Roster</a><a href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="/#about">About</a><a class="nav-cta" href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></nav></div></header>
  <main class="profile-main" id="artistProfile" data-artist="rell-danja"><section class="profile-error"><p class="eyebrow">Loading artist profile</p><h1>Rell Danja</h1></section></main>
  <footer class="site-footer"><div class="footer-inner"><div>© 2026 NextGen Sessions. Original music and independent artists.</div><div class="footer-links"><a href="/">Home</a><a href="/artists/">Artists</a><a href="/releases/">Releases</a><a href="/mixes/">Mixes</a><a href="https://www.youtube.com/@NextGenSessions" target="_blank" rel="noopener">YouTube</a></div></div></footer>
  <script src="/artist-images.js?v=20260804-rell1" defer></script>
  <script src="/artist-profiles.js" defer></script>
  <script src="/artist-profiles-expanded.js?v=20260803-reiss3" defer></script>
  <script src="/artists/rell-danja/profile.js?v=20260804-rell1" defer></script>
  <script src="/artist-profile.js?v=20260803-autoplay1" defer></script>
</body>
</html>
'''

SITEMAP_ENTRY = '''  <url>
    <loc>https://nextgensessions.com/artists/rell-danja/</loc>
    <lastmod>2026-08-04</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
'''

REQUIRED_RELEASES = {
    "919KvYLP_OQ": "Cross Me, Regret It",
    "4mu5NVxUeII": "No Sleep Fi Di Wicked",
    "i2xhycshXEg": "Nuh Friend In The Street (No Friends Left)",
}


def install_image_mapping() -> None:
    path = ROOT / "artist-images.js"
    text = path.read_text(encoding="utf-8")
    if '"rell-danja"' not in text:
        marker = '  "alonzo-ray": {'
        if marker not in text:
            raise RuntimeError("Unable to locate artist image insertion point")
        text = text.replace(marker, IMAGE_ENTRY + marker, 1)
    path.write_text(text, encoding="utf-8")


def bust_page_cache() -> None:
    for relative in ("index.html", "artists/index.html"):
        path = ROOT / relative
        text = path.read_text(encoding="utf-8")
        text = text.replace("/artist-images.js?v=20260803-reiss3", f"/artist-images.js?v={CACHE_VERSION}")
        if f"/artist-images.js?v={CACHE_VERSION}" not in text:
            raise RuntimeError(f"Unable to update image-map cache in {relative}")
        path.write_text(text, encoding="utf-8")


def write_profile() -> None:
    directory = ROOT / "artists" / "rell-danja"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "profile.js").write_text(PROFILE_JS, encoding="utf-8")
    (directory / "index.html").write_text(PROFILE_HTML, encoding="utf-8")


def update_sitemap() -> None:
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    if "https://nextgensessions.com/artists/rell-danja/" not in text:
        if "</urlset>" not in text:
            raise RuntimeError("Invalid sitemap")
        text = text.replace("</urlset>", SITEMAP_ENTRY + "</urlset>", 1)
    path.write_text(text, encoding="utf-8")


def validate_catalogue() -> None:
    payload = json.loads((ROOT / "releases.json").read_text(encoding="utf-8"))
    releases = payload.get("releases", [])
    indexed = {str(item.get("id", "")): str(item.get("title", "")) for item in releases}
    for video_id, title in REQUIRED_RELEASES.items():
        if indexed.get(video_id) != title:
            raise RuntimeError(f"Verified Rell Danja release missing or changed: {video_id} {indexed.get(video_id)!r}")


def validate_assets() -> None:
    for filename in (
        "rell-danja-portrait.webp",
        "rell-danja-card.webp",
        "rell-danja-card-640.webp",
    ):
        path = ROOT / "assets" / "artists" / filename
        data = path.read_bytes()
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP" or len(data) < 35_000:
            raise RuntimeError(f"Invalid Rell Danja portrait asset: {filename}")


if __name__ == "__main__":
    validate_assets()
    validate_catalogue()
    install_image_mapping()
    bust_page_cache()
    write_profile()
    update_sitemap()
    print("Rell Danja profile installation complete")
