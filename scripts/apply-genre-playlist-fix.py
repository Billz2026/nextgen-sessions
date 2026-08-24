#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ARTISTS = {
    "deon-creed": {
        "name": "Deon Creed",
        "genre": "Hip-Hop",
        "summary": "Grounded hip-hop with mature neighbourhood storytelling, resilience and reflective perspective.",
        "headline": "Grounded hip-hop shaped by neighbourhood perspective, responsibility, resilience and mature storytelling.",
        "bio": [
            "Deon Creed represents a grounded hip-hop lane within NextGen Sessions, combining mature writing, warm production and calm, direct delivery.",
            "His records focus on neighbourhood memory, responsibility, resilience and lived perspective, keeping storytelling and character ahead of empty performance.",
        ],
        "group": "Hip-Hop / G-Funk",
        "seo": "Explore Deon Creed, a grounded hip-hop artist combining mature neighbourhood storytelling, resilience and reflective perspective.",
    },
    "darian-gayle": {
        "name": "Darian Gayle",
        "genre": "Reggae",
        "summary": "Jamaican reggae with reflective songwriting, warm roots influence and a calm, grounded presence.",
        "headline": "Jamaican reggae shaped by warm roots influence, restraint, reflection and emotionally direct songwriting.",
        "bio": [
            "Darian Gayle represents the reflective reggae lane within NextGen Sessions, combining warm Jamaican influence with a calm vocal presence and mature emotional perspective.",
            "His writing favours restraint, reflection and clear storytelling, giving the music a grounded reggae identity without drifting into a separate soul category.",
        ],
        "group": "Reggae",
        "seo": "Explore Darian Gayle, a Jamaican-rooted reggae artist built around reflective songwriting, warm roots influence and a calm vocal presence.",
    },
    "mariana-lo": {
        "name": "Mariana Lo",
        "genre": "UK Rap",
        "summary": "Melodic UK rap with confident delivery, warm coastal energy and a polished visual identity.",
        "headline": "Melodic UK rap shaped by confident delivery, warm coastal energy and polished contemporary production.",
        "bio": [
            "Mariana Lo represents a melodic UK rap lane within NextGen Sessions, pairing confident delivery with contemporary production and a polished visual identity.",
            "Her records balance personality, melody and modern UK rap writing while keeping the presentation clean, assured and recognisably hers.",
        ],
        "group": "UK Rap & Grime",
        "seo": "Explore Mariana Lo, a melodic UK rap artist combining confident delivery, contemporary production and polished visual identity.",
    },
    "ragga-blaze": {
        "name": "Ragga Blaze",
        "genre": "Dancehall",
        "summary": "Ragga-driven Jamaican dancehall with fiery energy, rhythmic impact and commanding delivery.",
        "headline": "Ragga-driven Jamaican dancehall shaped by fiery energy, rhythmic impact and commanding delivery.",
        "bio": [
            "Ragga Blaze represents a fiery dancehall lane within NextGen Sessions, combining ragga-driven delivery with heavyweight rhythm and direct Jamaican energy.",
            "His records are built for impact and movement, keeping the identity firmly inside dancehall rather than splitting the artist across reggae and dancehall categories.",
        ],
        "group": "Dancehall",
        "seo": "Explore Ragga Blaze, a Jamaican dancehall artist built around fiery ragga delivery, rhythmic impact and commanding energy.",
    },
    "yung-tafari": {
        "name": "Yung Tafari",
        "genre": "Dancehall",
        "summary": "Youthful Jamaican dancehall shaped by melody, street energy and resilient songwriting.",
        "headline": "Youthful Jamaican dancehall shaped by melody, street energy and resilient songwriting.",
        "bio": [
            "Yung Tafari represents a youthful dancehall lane within NextGen Sessions, balancing melodic instinct with direct Jamaican street energy.",
            "His catalogue centres on resilience, conviction and forward movement, keeping the artist firmly classified as dancehall across the roster and release archive.",
        ],
        "group": "Dancehall",
        "seo": "Explore Yung Tafari, a Jamaican dancehall artist combining melody, street energy and resilient songwriting.",
    },
    "zara-veli": {
        "name": "Zara Veli",
        "genre": "R&B",
        "summary": "Contemporary R&B with polished vocals, confident boundaries and late-night poise.",
        "headline": "Polished contemporary R&B shaped by confident boundaries, clean vocal presentation and late-night poise.",
        "bio": [
            "Zara Veli represents a polished contemporary R&B lane within NextGen Sessions, pairing clean vocal presentation with confident, self-possessed writing.",
            "Her catalogue focuses on boundaries, poise and modern R&B attitude, keeping the artist identity firmly inside R&B rather than a broader pop category.",
        ],
        "group": "R&B & Soul",
        "seo": "Explore Zara Veli, a contemporary R&B artist built around polished vocals, confident boundaries and late-night poise.",
    },
}


def save(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def object_span(text: str, marker: str) -> tuple[int, int] | None:
    start = text.find(marker)
    if start < 0:
        return None
    brace = text.find("{", start)
    if brace < 0:
        return None
    depth = 0
    in_string = False
    escaped = False
    for index in range(brace, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return start, index + 1
    return None


def patch_profile_segment(text: str, slug: str, cfg: dict) -> str:
    span = object_span(text, f'  "{slug}": {{')
    if not span:
        return text
    start, end = span
    segment = text[start:end]
    segment = re.sub(r'("genre": ")[^"]+("[,])', rf'\g<1>{cfg["genre"]}\g<2>', segment, count=1)
    segment = re.sub(r'("headline": ")[^"]+("[,])', rf'\g<1>{cfg["headline"]}\g<2>', segment, count=1)
    bio = (
        '"bio": [\n'
        f'      "{cfg["bio"][0]}",\n'
        f'      "{cfg["bio"][1]}"\n'
        '    ]'
    )
    segment = re.sub(r'"bio": \[\n\s*"[^"]*",\n\s*"[^"]*"\n\s*\]', bio, segment, count=1)
    segment = re.sub(r'("group": ")[^"]+("[,])', rf'\g<1>{cfg["group"]}\g<2>', segment)
    return text[:start] + segment + text[end:]


def patch_artist_roster() -> None:
    path = ROOT / "artists.js"
    text = path.read_text(encoding="utf-8")
    for cfg in ARTISTS.values():
        marker = f'    "name": "{cfg["name"]}",'
        start = text.find(marker)
        if start < 0:
            raise SystemExit(f'Artist missing from artists.js: {cfg["name"]}')
        end = text.find("\n  },", start)
        if end < 0:
            raise SystemExit(f'Could not isolate roster record: {cfg["name"]}')
        segment = text[start:end]
        segment = re.sub(r'("genre": ")[^"]+("[,])', rf'\g<1>{cfg["genre"]}\g<2>', segment, count=1)
        segment = re.sub(r'("summary": ")[^"]+("[,])', rf'\g<1>{cfg["summary"]}\g<2>', segment, count=1)
        text = text[:start] + segment + text[end:]
    save(path, text)


def patch_profile_sources() -> None:
    for slug, cfg in ARTISTS.items():
        direct = ROOT / "artists" / slug / "profile.js"
        if direct.exists():
            text = direct.read_text(encoding="utf-8")
            text = patch_profile_segment(text, slug, cfg)
            save(direct, text)

    for relative in ("artist-profiles.js", "artist-profiles-expanded.js"):
        path = ROOT / relative
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for slug, cfg in ARTISTS.items():
            text = patch_profile_segment(text, slug, cfg)
        save(path, text)

    deon_fix = ROOT / "deon-creed-profile-fix.js"
    if deon_fix.exists():
        text = deon_fix.read_text(encoding="utf-8")
        text = text.replace('group: "R&B & Soul"', 'group: "Hip-Hop / G-Funk"')
        text = text.replace('"Soul / R&B"', '"Hip-Hop / G-Funk"')
        save(deon_fix, text)


def patch_static_artist_pages() -> None:
    for slug, cfg in ARTISTS.items():
        path = ROOT / "artists" / slug / "index.html"
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        title = f'{cfg["name"]} | {cfg["genre"]} Artist | NextGen Sessions'
        text = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', text, count=1)
        text = re.sub(
            r'<meta name="description" content="[^"]*">',
            f'<meta name="description" content="{cfg["seo"]}">',
            text,
            count=1,
        )
        text = re.sub(
            r'<meta property="og:description" content="[^"]*">',
            f'<meta property="og:description" content="{cfg["headline"]}">',
            text,
            count=1,
        )
        text = re.sub(
            r'<meta name="twitter:description" content="[^"]*">',
            f'<meta name="twitter:description" content="{cfg["seo"]}">',
            text,
            count=1,
        )
        text = re.sub(
            r'"genre":(?:\[[^\]]*\]|"[^"]*")',
            f'"genre":"{cfg["genre"]}"',
            text,
            count=1,
        )
        save(path, text)


def patch_catalogue() -> None:
    path = ROOT / "scripts" / "update-catalogue.py"
    text = path.read_text(encoding="utf-8")
    old = '("PL7VCdVWElIJERYe7FVFG8mMYSop0QLSvC", "Dancehall & Reggae"),'
    new = '("PL7VCdVWElIJERYe7FVFG8mMYSop0QLSvC", "Dancehall"),\n    ("PLDcaKFpn_7V8", "Reggae"),'
    if old not in text and '("PL7VCdVWElIJERYe7FVFG8mMYSop0QLSvC", "Dancehall"),' not in text:
        raise SystemExit("Dancehall playlist binding was not found")
    if old in text:
        text = text.replace(old, new, 1)
    elif '("PLDcaKFpn_7V8", "Reggae"),' not in text:
        text = text.replace(
            '("PL7VCdVWElIJERYe7FVFG8mMYSop0QLSvC", "Dancehall"),',
            '("PL7VCdVWElIJERYe7FVFG8mMYSop0QLSvC", "Dancehall"),\n    ("PLDcaKFpn_7V8", "Reggae"),',
            1,
        )

    text = re.sub(
        r'("id": "6H6yq_1bEsQ",[\s\S]*?"group": ")[^"]+("[,])',
        r'\g<1>Dancehall\g<2>',
        text,
        count=1,
    )
    text = re.sub(
        r'("id": "ZSjRD_3B5uk",[\s\S]*?"group": ")[^"]+("[,])',
        r'\g<1>Hip-Hop / G-Funk\g<2>',
        text,
        count=1,
    )
    save(path, text)

    latest = ROOT / "functions" / "api" / "latest.js"
    if latest.exists():
        latest_text = latest.read_text(encoding="utf-8").replace('group: "Dancehall & Reggae"', 'group: "Dancehall"')
        save(latest, latest_text)


def main() -> None:
    patch_artist_roster()
    patch_profile_sources()
    patch_static_artist_pages()
    patch_catalogue()
    print("Applied Dancehall/Reggae split and six artist genre corrections.")


if __name__ == "__main__":
    main()
