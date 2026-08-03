from pathlib import Path
import json
import re
from PIL import Image, ImageEnhance
from urllib.request import urlopen

VERSION = "20260803-reiss1"
ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, value: str) -> None:
    (ROOT / path).write_text(value, encoding="utf-8")


# Generate a clean, text-free 4:5 crop from the strongest consistent Reiss artwork.
source_path = ROOT / ".reiss-source.jpg"
source_path.write_bytes(urlopen("https://i.ytimg.com/vi/FvNsYb5g4pg/maxresdefault.jpg").read())
source = Image.open(source_path).convert("RGB")
assert source.size == (1280, 720), source.size
crop = source.crop((612, 0, 1188, 720))
crop = ImageEnhance.Contrast(crop).enhance(1.04)
crop = ImageEnhance.Sharpness(crop).enhance(1.08)

asset_dir = ROOT / "assets" / "artists"
asset_dir.mkdir(parents=True, exist_ok=True)
outputs = {
    "reiss-portrait.webp": ((1120, 1400), 90),
    "reiss-card.webp": ((1024, 1280), 88),
    "reiss-card-640.webp": ((640, 800), 86),
}
for filename, (dimensions, quality) in outputs.items():
    image = crop.resize(dimensions, Image.Resampling.LANCZOS)
    image.save(asset_dir / filename, "WEBP", quality=quality, method=6)
source_path.unlink(missing_ok=True)

# Homepage, roster and profile image map.
path = "artist-images.js"
text = read(path)
if '"reiss": {' not in text:
    entry = '''  "reiss": {\n    src: "/assets/artists/reiss-card.webp?v=20260803-reiss1",\n    srcset: "/assets/artists/reiss-card-640.webp?v=20260803-reiss1 640w, /assets/artists/reiss-card.webp?v=20260803-reiss1 1024w",\n    portrait: "/assets/artists/reiss-portrait.webp?v=20260803-reiss1",\n    fallback: "/assets/artists/reiss-card-640.webp?v=20260803-reiss1",\n    position: "50% 32%"\n  },\n'''
    marker = '  "alonzo-ray": {'
    assert marker in text
    text = text.replace(marker, entry + marker, 1)
write(path, text)

# Complete Reiss profile with four verified releases.
path = "artist-profiles-expanded.js"
text = read(path)
reiss_block = '''  "reiss": {\n    "name": "Reiss",\n    "path": "/artists/reiss/",\n    "genre": "UK Rap",\n    "location": "United Kingdom",\n    "eyebrow": "NextGen Sessions featured artist",\n    "headline": "Focused UK rap shaped by discipline, earned progress, direct delivery and refusal to expect shortcuts.",\n    "bio": [\n      "Reiss represents a focused UK rap lane within NextGen Sessions, favouring concise writing, direct delivery and records built around steady progress rather than exaggerated claims.",\n      "His catalogue moves through routine, momentum and self-reliance, with the Nothing Given album tying those themes into a clear statement about earning every step forward."\n    ],\n    "imageKey": "reiss",\n    "imagePosition": "50% 32%",\n    "featuredVideo": {\n      "id": "Dvfg251n0Pk",\n      "title": "On Route",\n      "label": "Reiss — On Route",\n      "published": "2026-04-26T17:08:28Z"\n    },\n    "catalogueAliases": ["Reiss"],\n    "additionalReleases": [\n      {\n        "id": "Dvfg251n0Pk",\n        "artist": "Reiss",\n        "title": "On Route",\n        "group": "UK Rap & Grime",\n        "published": "2026-04-26T17:08:28Z"\n      },\n      {\n        "id": "FvNsYb5g4pg",\n        "artist": "Reiss",\n        "title": "On A Regular",\n        "group": "UK Rap & Grime",\n        "published": "2026-04-26T16:13:21Z"\n      },\n      {\n        "id": "hqMBHn0L_DM",\n        "artist": "Reiss",\n        "title": "Already Know",\n        "group": "UK Rap & Grime",\n        "published": "2026-04-24T12:30:10Z"\n      },\n      {\n        "id": "vsvn0Qkifv0",\n        "artist": "Reiss",\n        "title": "No Comment",\n        "group": "UK Rap & Grime",\n        "published": "2026-04-15T16:06:39Z"\n      }\n    ],\n    "featuredExperience": {\n      "enabled": true,\n      "albumLabel": "Nothing Given album",\n      "aboutLabel": "About Reiss",\n      "compactViewThreshold": 10\n    },\n    "youtubeUrl": "https://www.youtube.com/results?search_query=NextGen+Sessions+Reiss",\n    "related": [\n      { "name": "Renz Cole", "genre": "UK Rap" },\n      { "name": "Andre Kadeem", "genre": "UK Rap" },\n      { "name": "Mace K", "genre": "UK Rap / Grime" }\n    ]\n  },\n'''
pattern = re.compile(r'  "reiss": \{.*?\n  \},\n  "voss-carter":', re.S)
assert pattern.search(text), "Reiss profile block not found"
text = pattern.sub(reiss_block + '  "voss-carter":', text, count=1)
write(path, text)

# Nothing Given album and its four verified component releases.
path = "artist-albums.js"
text = read(path)
album_block = '''    "reiss": [\n      {\n        title: "Nothing Given",\n        year: "2026",\n        coverVideoId: "ULjYMdDHySM",\n        fullAlbumVideoId: "ULjYMdDHySM",\n        description: "A focused UK rap album centred on discipline, earned progress and refusing to expect shortcuts.",\n        tracks: [\n          { id: "vsvn0Qkifv0", title: "No Comment" },\n          { id: "hqMBHn0L_DM", title: "Already Know" },\n          { id: "FvNsYb5g4pg", title: "On A Regular" },\n          { id: "Dvfg251n0Pk", title: "On Route" }\n        ]\n      }\n    ],\n'''
pattern = re.compile(r'    "reiss": \[.*?\n    \],\n    "voss-carter":', re.S)
assert pattern.search(text), "Reiss album block not found"
text = pattern.sub(album_block + '    "voss-carter":', text, count=1)
write(path, text)

# Dedicated Reiss profile metadata and structured data.
path = "artists/reiss/index.html"
text = read(path)
portrait = "https://nextgensessions.com/assets/artists/reiss-portrait.webp?v=20260803-reiss1"
text = re.sub(r'https://i\.ytimg\.com/vi/ULjYMdDHySM/maxresdefault\.jpg', portrait, text)
if 'og:image:alt' not in text:
    text = text.replace(
        f'<meta property="og:image" content="{portrait}">',
        f'<meta property="og:image" content="{portrait}">\n  <meta property="og:image:alt" content="Reiss portrait">',
    )
schema = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "name": "Reiss",
    "genre": "UK Rap",
    "url": "https://nextgensessions.com/artists/reiss/",
    "image": portrait,
    "album": {
        "@type": "MusicAlbum",
        "name": "Nothing Given",
        "url": "https://www.youtube.com/watch?v=ULjYMdDHySM",
    },
    "subjectOf": [
        {"@type": "MusicVideoObject", "name": "On Route", "url": "https://www.youtube.com/watch?v=Dvfg251n0Pk"},
        {"@type": "MusicVideoObject", "name": "On A Regular", "url": "https://www.youtube.com/watch?v=FvNsYb5g4pg"},
        {"@type": "MusicVideoObject", "name": "Already Know", "url": "https://www.youtube.com/watch?v=hqMBHn0L_DM"},
        {"@type": "MusicVideoObject", "name": "No Comment", "url": "https://www.youtube.com/watch?v=vsvn0Qkifv0"},
    ],
    "memberOf": {
        "@type": "Organization",
        "name": "NextGen Sessions",
        "url": "https://nextgensessions.com/",
    },
}
schema_tag = '<script type="application/ld+json">' + json.dumps(schema, separators=(",", ":")) + "</script>"
text = re.sub(r'<script type="application/ld\+json">.*?</script>', schema_tag, text, count=1)
text = re.sub(r'/artist-images\.js(?:\?v=[^"\s]+)?', f'/artist-images.js?v={VERSION}', text)
text = re.sub(r'/artist-profiles-expanded\.js(?:\?v=[^"\s]+)?', f'/artist-profiles-expanded.js?v={VERSION}', text)
text = re.sub(r'/artist-albums\.js(?:\?v=[^"\s]+)?', f'/artist-albums.js?v={VERSION}', text)
write(path, text)

# Cache-bust homepage and roster image/profile maps.
for path in ("index.html", "artists/index.html"):
    text = read(path)
    text = re.sub(r'/artist-images\.js(?:\?v=[^"\s]+)?', f'/artist-images.js?v={VERSION}', text)
    text = re.sub(r'/artist-profiles-expanded\.js(?:\?v=[^"\s]+)?', f'/artist-profiles-expanded.js?v={VERSION}', text)
    write(path, text)

print("Reiss profile build completed")
