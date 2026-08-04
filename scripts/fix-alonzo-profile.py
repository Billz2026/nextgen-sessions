from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} match in {path}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"Updated {path.relative_to(ROOT)}: {label}")


profiles = ROOT / "artist-profiles.js"
replace_once(
    profiles,
    '''  "alonzo-ray": {
    "name": "Alonzo Ray",
    "path": "/artists/alonzo-ray/",
    "genre": "West Coast Hip-Hop / Soul",
    "location": "Pasadena, California",
    "eyebrow": "NextGen Sessions artist",
    "headline": "Mature West Coast hip-hop and soul built around reflection, long-term vision and late-night Pasadena atmosphere.",
    "bio": [
      "Alonzo Ray represents the reflective West Coast lane within NextGen Sessions, pairing laid-back confidence with grounded writing about discipline, spiritual alignment and the work behind lasting progress.",
      "His records draw on Pasadena nights, warm live instrumentation and subtle G-funk colour without relying on nostalgia. The voice stays calm and natural, placing perspective, legacy and personal growth ahead of empty bravado."
    ],
    "imageKey": "alonzo-ray",
    "imagePosition": "50% 38%",''',
    '''  "alonzo-ray": {
    "name": "Alonzo Ray",
    "path": "/artists/alonzo-ray/",
    "genre": "West Coast Hip-Hop / Soul",
    "location": "Pasadena, California",
    "eyebrow": "NextGen Sessions artist",
    "headline": "Mature West Coast hip-hop and soul built around reflection, long-term vision and late-night Pasadena atmosphere.",
    "bio": [
      "Alonzo Ray represents the reflective West Coast lane within NextGen Sessions, pairing laid-back confidence with grounded writing about discipline, spiritual alignment and the work behind lasting progress.",
      "His records draw on Pasadena nights, warm live instrumentation and subtle G-funk colour without relying on nostalgia. The voice stays calm and natural, placing perspective, legacy and personal growth ahead of empty bravado."
    ],
    "imageKey": "alonzo-ray",
    "imagePosition": "50% 8%",''',
    "Alonzo portrait focus",
)

albums = ROOT / "artist-albums.js"
replace_once(
    albums,
    'src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}?rel=0&amp;modestbranding=1" title="${escapeHtml(`${profile.name || "Artist"} — ${title}`)}"',
    'src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}?rel=0&amp;modestbranding=1&amp;autoplay=1" title="${escapeHtml(`${profile.name || "Artist"} — ${title}`)}"',
    "album player autoplay",
)

page = ROOT / "artists" / "alonzo-ray" / "index.html"
replace_once(
    page,
    '<script src="/artist-profiles.js" defer></script>',
    '<script src="/artist-profiles.js?v=20260804-alonzo1" defer></script>',
    "Alonzo profile cache version",
)
replace_once(
    page,
    '<script src="/artist-albums.js" defer></script>',
    '<script src="/artist-albums.js?v=20260804-alonzo1" defer></script>',
    "album player cache version",
)
