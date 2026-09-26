#!/usr/bin/env python3
"""Render crawlable mix collection content from mixes.json."""

from __future__ import annotations

import html
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIXES_ROOT = ROOT / "mixes"
CATALOGUE_START = "<!-- MIX-STATIC-CATALOGUE:START -->"
CATALOGUE_END = "<!-- MIX-STATIC-CATALOGUE:END -->"
MIX_PLAYER_VERSION = "20260926-deeplink1"


def load_mixes() -> list[dict]:
    payload = json.loads((ROOT / "mixes.json").read_text(encoding="utf-8"))
    mixes = payload.get("mixes", [])
    return mixes if isinstance(mixes, list) else []


def page_group(source: str) -> str:
    for tag in re.findall(r"<[^>]+>", source):
        if 'data-source="/mixes.json"' not in tag or 'data-source-type="mixes"' not in tag:
            continue
        match = re.search(r'data-group="([^"]+)"', tag)
        if match:
            return match.group(1).strip()
    return ""


def lead_title(item: dict) -> str:
    raw = str(item.get("rawTitle", "")).strip()
    if raw:
        return raw.split("|")[0].strip()
    return str(item.get("title", "")).strip() or "NextGen Sessions mix"


def label(item: dict) -> str:
    value = str(item.get("label", "")).strip()
    if value:
        return value
    return "Full-length mix"


def published_label(value: str) -> str:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return ""
    return f"{parsed.day} {parsed.strftime('%B %Y')}"


def sort_items(items: list[dict]) -> list[dict]:
    return sorted(
        items,
        key=lambda item: (
            int(item.get("sequence", 0) or 0) if int(item.get("sequence", 0) or 0) > 0 else 999999,
            str(item.get("published", "")),
            str(item.get("id", "")),
        ),
    )


def static_block(group: str, items: list[dict]) -> str:
    safe_group = re.sub(r"[^a-z0-9-]+", "-", group.lower()).strip("-") or "mix"
    cards = []
    for item in items:
        video_id = html.escape(str(item.get("id", "")).strip(), quote=True)
        title = html.escape(lead_title(item))
        meta_parts = [label(item), published_label(str(item.get("published", "")))]
        meta = html.escape(" · ".join(part for part in meta_parts if part))
        cards.append(
            f'          <a class="mix-related-card" id="mix-{video_id}" '
            f'href="https://www.youtube.com/watch?v={video_id}" target="_blank" rel="noopener">'
            f"<span>{meta}</span><strong>{title}</strong></a>"
        )

    count = len(items)
    noun = "mix" if count == 1 else "mixes"
    return (
        f"{CATALOGUE_START}\n"
        f'      <section class="mix-related mix-static-catalogue" data-static-mix-catalogue '
        f'aria-labelledby="{safe_group}-catalogue-title">\n'
        f'        <div class="section-heading">\n'
        f'          <p class="eyebrow">Full collection</p>\n'
        f'          <h2 id="{safe_group}-catalogue-title">All published mixes.</h2>\n'
        f'          <p>{count} full-length {noun} in this collection, automatically synced from the public YouTube catalogue.</p>\n'
        f"        </div>\n"
        f'        <div class="mix-related-grid">\n'
        + "\n".join(cards)
        + "\n        </div>\n"
        f"      </section>\n"
        f"{CATALOGUE_END}"
    )


def replace_or_insert_block(source: str, block: str) -> str:
    if CATALOGUE_START in source and CATALOGUE_END in source:
        pattern = re.escape(CATALOGUE_START) + r"[\s\S]*?" + re.escape(CATALOGUE_END)
        return re.sub(pattern, block, source, count=1)

    marker = "</main>"
    if marker not in source:
        raise RuntimeError("Mix page is missing </main>")
    return source.replace(marker, f"{block}\n    {marker}", 1)


def update_count(source: str, count: int) -> str:
    noun = "mix" if count == 1 else "mixes"
    return re.sub(
        r'(<(?:span|div)\b[^>]*data-collection-count[^>]*>)[\s\S]*?(</(?:span|div)>)',
        rf"\g<1>{count} {noun}\g<2>",
        source,
        count=1,
        flags=re.I,
    )


def render_collection_pages(mixes: list[dict]) -> list[str]:
    changed = []
    for page in sorted(MIXES_ROOT.glob("*/index.html")):
        source = page.read_text(encoding="utf-8")
        group = page_group(source)
        if not group:
            continue
        items = sort_items([item for item in mixes if str(item.get("collection", "")).strip() == group])
        if not items:
            continue

        updated = update_count(source, len(items))
        updated = replace_or_insert_block(updated, static_block(group, items))
        updated = re.sub(
            r'<script src="/mix-player\.js(?:\?v=[^"]*)?" defer></script>',
            f'<script src="/mix-player.js?v={MIX_PLAYER_VERSION}" defer></script>',
            updated,
            count=1,
        )
        if updated != source:
            page.write_text(updated, encoding="utf-8")
            changed.append(str(page.relative_to(ROOT)))
    return changed


def update_mix_index(mixes: list[dict]) -> bool:
    page = MIXES_ROOT / "index.html"
    source = page.read_text(encoding="utf-8")
    updated = source

    groups = sorted({str(item.get("collection", "")).strip() for item in mixes if item.get("collection")})
    for group in groups:
        count = sum(1 for item in mixes if str(item.get("collection", "")).strip() == group)
        noun = "mix" if count == 1 else "mixes"
        pattern = rf'(<[^>]+data-mix-count="{re.escape(group)}"[^>]*>)[^<]*(</[^>]+>)'
        updated = re.sub(pattern, rf"\g<1>{count} {noun}\g<2>", updated, count=1)

    if updated != source:
        page.write_text(updated, encoding="utf-8")
        return True
    return False


def main() -> None:
    mixes = load_mixes()
    changed = render_collection_pages(mixes)
    if update_mix_index(mixes):
        changed.append("mixes/index.html")
    print(json.dumps({"rendered": len(changed), "files": changed}, indent=2))


if __name__ == "__main__":
    main()
