#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

archive_path = ROOT / "releases" / "index.html"
archive = archive_path.read_text(encoding="utf-8")
old_button = '<button class="release-filter" type="button" data-filter="Dancehall &amp; Reggae" aria-pressed="false">Dancehall &amp; Reggae</button>'
new_buttons = '\n        '.join([
    '<button class="release-filter" type="button" data-filter="Dancehall" aria-pressed="false">Dancehall</button>',
    '<button class="release-filter" type="button" data-filter="Reggae" aria-pressed="false">Reggae</button>',
])
if old_button not in archive:
    raise SystemExit("Combined Dancehall & Reggae filter button not found")
archive = archive.replace(old_button, new_buttons, 1)
archive, script_count = re.subn(
    r'src="/releases\.js(?:\?v=[^"]*)?"',
    'src="/releases.js?v=20260824-genre-split1"',
    archive,
    count=1,
)
if script_count != 1:
    raise SystemExit(f"Expected one releases.js script tag, found {script_count}")
archive_path.write_text(archive, encoding="utf-8")

js_path = ROOT / "releases.js"
js = js_path.read_text(encoding="utf-8")

artist_groups = '''  const artistGroups = {
    "dancehall & reggae": "Dancehall",
    "jamaican dancehall": "Dancehall",
    "dark melodic dancehall": "Dancehall",
    "dancehall": "Dancehall",
    "reggae / dancehall": "Dancehall",
    "jamaican reggae": "Reggae",
    "straight reggae": "Reggae",
    "reggae / soul": "Reggae",
    "reggae": "Reggae",
    "uk rap": "UK Rap & Grime",
    "uk rap / grime": "UK Rap & Grime",
    "west coast hip-hop": "Hip-Hop / G-Funk",
    "new york hip-hop": "Hip-Hop / G-Funk",
    "hip-hop": "Hip-Hop / G-Funk",
    "hip-hop / soul": "Hip-Hop / G-Funk",
    "hip-hop / r&b": "Hip-Hop / G-Funk",
    "uk r&b": "R&B & Soul",
    "r&b / soul": "R&B & Soul",
    "soul / r&b": "R&B & Soul",
    "r&b": "R&B & Soul",
    "punjabi / bhangra": "Global Sounds",
    "arabic soul / oud": "Global Sounds",
    "global pop": "Global Sounds",
    "pop / r&b": "Global Sounds"
  };'''
js, group_count = re.subn(
    r'  const artistGroups = \{[\s\S]*?\n  \};\n\n  const releaseOverrides = \{',
    artist_groups + '\n\n  const releaseOverrides = {',
    js,
    count=1,
)
if group_count != 1:
    raise SystemExit(f"Expected one artistGroups block, found {group_count}")

release_block_match = re.search(r'(  const releaseOverrides = \{[\s\S]*?\n  \};)', js)
if not release_block_match:
    raise SystemExit("releaseOverrides block not found")
release_block = release_block_match.group(1)
release_block = release_block.replace('group: "Dancehall & Reggae"', 'group: "Dancehall"')
release_block = release_block.replace('group: "Hip-Hop"', 'group: "Hip-Hop / G-Funk"')
js = js[:release_block_match.start(1)] + release_block + js[release_block_match.end(1):]

infer_group = '''  function inferGroup(rawTitle, artist) {
    const title = normaliseText(rawTitle);
    const mapped = artistGroups[normaliseText(artist?.genre)];
    if (mapped) return mapped;
    if (/dancehall|gully/.test(title)) return "Dancehall";
    if (/reggae/.test(title)) return "Reggae";
    if (/uk rap|grime|london rap/.test(title)) return "UK Rap & Grime";
    if (/r&b|rnb|soul/.test(title)) return "R&B & Soul";
    if (/punjabi|bhangra|arabic|oud|global|afro|latin/.test(title)) return "Global Sounds";
    return "Hip-Hop / G-Funk";
  }'''
js, infer_count = re.subn(
    r'  function inferGroup\(rawTitle, artist\) \{[\s\S]*?\n  \}',
    infer_group,
    js,
    count=1,
)
if infer_count != 1:
    raise SystemExit(f"Expected one inferGroup function, found {infer_count}")

js_path.write_text(js, encoding="utf-8")
print("Split Dancehall and Reggae release filters")
