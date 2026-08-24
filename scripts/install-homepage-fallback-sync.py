#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
render_path = ROOT / "scripts" / "render-releases.py"
workflow_path = ROOT / ".github" / "workflows" / "update-catalogue.yml"

render = render_path.read_text(encoding="utf-8")

if "import hashlib\n" not in render:
    render = render.replace("import html\n", "import hashlib\nimport html\n", 1)

if 'HOMEPAGE_FALLBACK_START = "// HOMEPAGE:AUTO-FALLBACK:START"' not in render:
    anchor = 'SITEMAP_END = "<!-- RELEASES:SITEMAP:END -->"\n'
    addition = (
        anchor
        + 'HOMEPAGE_FALLBACK_START = "// HOMEPAGE:AUTO-FALLBACK:START"\n'
        + 'HOMEPAGE_FALLBACK_END = "// HOMEPAGE:AUTO-FALLBACK:END"\n'
    )
    if anchor not in render:
        raise SystemExit("Could not find renderer constants anchor")
    render = render.replace(anchor, addition, 1)

if "def render_homepage(releases: list[dict]) -> None:" not in render:
    helper = r'''

def homepage_display_title(release: dict) -> str:
    artist = str(release.get("artist", "")).strip()
    title = str(release.get("title", "")).strip()
    return f"{artist} – {title}" if artist and title else (title or artist or "Latest NextGen Sessions release")


def homepage_release_card(release: dict) -> str:
    video_id = esc(release.get("id", ""))
    url = esc(release.get("url", "/releases/"))
    display_title = esc(homepage_display_title(release))
    artist = esc(release.get("artist", ""))
    title = esc(release.get("title", ""))
    published = esc(format_date(release.get("published", "")))
    return (
        f'<a class="release-card" href="{url}">'
        f'<img loading="lazy" decoding="async" src="/api/release-image?id={video_id}&amp;size=card" alt="{title} by {artist} release thumbnail">'
        '<div class="release-meta"><span class="tag">Official release</span>'
        f'<h3>{display_title}</h3><p>View release</p>'
        f'<span class="release-date">{published}</span></div></a>'
    )


def replace_once(source: str, pattern: str, replacement: str, label: str, *, flags: int = 0) -> str:
    updated, count = re.subn(pattern, replacement, source, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"Expected one {label}, found {count}")
    return updated


def render_homepage(releases: list[dict]) -> None:
    if not releases:
        raise SystemExit("Cannot render homepage fallback from an empty catalogue")

    latest = releases[0]
    featured = releases[:6]
    latest_id = str(latest.get("id", "")).strip()
    latest_url = str(latest.get("url", "/releases/")).strip() or "/releases/"
    latest_title = homepage_display_title(latest)
    latest_date = format_date(latest.get("published", ""))
    youtube_url = f"https://www.youtube.com/watch?v={latest_id}"

    index_path = ROOT / "index.html"
    source = index_path.read_text(encoding="utf-8")
    source = replace_once(
        source,
        r'(<a class="button button-secondary" id="heroLatestLink" href=")[^"]*(")',
        lambda m: m.group(1) + esc(latest_url) + m.group(2),
        "homepage latest-release hero link",
    )
    source = replace_once(
        source,
        r'(<div class="video-frame" id="latestVideoFrame" data-video-id=")[^"]*(")',
        lambda m: m.group(1) + esc(latest_id) + m.group(2),
        "homepage latest video id",
    )
    source = replace_once(
        source,
        r'(<button class="video-poster" id="latestVideoPlay" type="button" aria-label=")[^"]*(")',
        lambda m: m.group(1) + esc(f"Play {latest_title}") + m.group(2),
        "homepage latest play label",
    )
    source = replace_once(
        source,
        r'(<img id="latestVideoThumbnail" src=")[^"]*(")',
        lambda m: m.group(1) + f"/api/release-image?id={esc(latest_id)}" + m.group(2),
        "homepage latest thumbnail",
    )
    source = replace_once(
        source,
        r'(<noscript><a class="video-no-script" href=")[^"]*(")',
        lambda m: m.group(1) + esc(youtube_url) + m.group(2),
        "homepage no-script latest link",
    )
    source = replace_once(
        source,
        r'(<h2 id="latestVideoTitle">)[\s\S]*?(</h2>)',
        lambda m: m.group(1) + esc(latest_title) + m.group(2),
        "homepage latest title",
    )
    source = replace_once(
        source,
        r'(<p id="latestVideoDate">)[\s\S]*?(</p>)',
        lambda m: m.group(1) + esc(f"Published {latest_date}") + m.group(2),
        "homepage latest date",
    )
    source = replace_once(
        source,
        r'(<a class="button button-primary latest-watch" id="latestWatchLink" href=")[^"]*(")',
        lambda m: m.group(1) + esc(youtube_url) + m.group(2),
        "homepage latest YouTube link",
    )

    cards = "".join(homepage_release_card(release) for release in featured)
    source = replace_once(
        source,
        r'<div class="release-grid" id="releaseGrid">[\s\S]*?</div>(?=<div class="button-row" style="margin-top:24px">)',
        f'<div class="release-grid" id="releaseGrid">{cards}</div>',
        "homepage release fallback grid",
    )

    version_source = "|".join(
        f"{item.get('id','')}:{item.get('artist','')}:{item.get('title','')}:{item.get('published','')}:{item.get('url','')}"
        for item in featured
    )
    version = hashlib.sha1(version_source.encode("utf-8")).hexdigest()[:10]
    source = replace_once(
        source,
        r'<script src="/site\.js(?:\?v=[^"]*)?" defer></script>',
        f'<script src="/site.js?v=catalogue-{version}" defer></script>',
        "homepage site.js cache version",
    )
    index_path.write_text(source, encoding="utf-8")

    fallback_items = []
    for release in featured:
        fallback_items.append({
            "id": str(release.get("id", "")),
            "contentType": "full-release",
            "title": homepage_display_title(release),
            "published": str(release.get("published", "")),
            "url": str(release.get("url", "/releases/")),
        })

    latest_json = json.dumps(fallback_items[0], ensure_ascii=False, separators=(",", ":"))
    release_lines = ["    FALLBACK_LATEST"]
    release_lines.extend(
        "    " + json.dumps(item, ensure_ascii=False, separators=(",", ":"))
        for item in fallback_items[1:]
    )
    releases_js = ",\n".join(release_lines)
    fallback_block = (
        f"  {HOMEPAGE_FALLBACK_START}\n"
        f"  const FALLBACK_LATEST = {latest_json};\n\n"
        "  const FALLBACK_RELEASES = [\n"
        f"{releases_js}\n"
        "  ];\n"
        f"  {HOMEPAGE_FALLBACK_END}"
    )

    site_path = ROOT / "site.js"
    site = site_path.read_text(encoding="utf-8")
    if HOMEPAGE_FALLBACK_START in site and HOMEPAGE_FALLBACK_END in site:
        site = replace_once(
            site,
            re.escape(HOMEPAGE_FALLBACK_START) + r"[\s\S]*?" + re.escape(HOMEPAGE_FALLBACK_END),
            fallback_block.strip(),
            "marked homepage JavaScript fallback block",
        )
    else:
        site = replace_once(
            site,
            r'  const FALLBACK_LATEST = \{[\s\S]*?\n  const FALLBACK_RELEASES = \[[\s\S]*?\n  \];',
            fallback_block,
            "legacy homepage JavaScript fallback block",
        )
    site_path.write_text(site, encoding="utf-8")
'''
    anchor = "\ndef release_page(release: dict, related: list[dict], slugs: dict[str, str]) -> str:\n"
    if anchor not in render:
        raise SystemExit("Could not find release_page renderer anchor")
    render = render.replace(anchor, helper + anchor, 1)

if "    render_homepage(releases)\n" not in render:
    anchor = "    render_archive(releases)\n"
    if anchor not in render:
        raise SystemExit("Could not find render_archive call")
    render = render.replace(anchor, anchor + "    render_homepage(releases)\n", 1)

render_path.write_text(render, encoding="utf-8")

workflow = workflow_path.read_text(encoding="utf-8")
if '      - "site.js"\n' not in workflow:
    workflow = workflow.replace('      - "releases.css"\n', '      - "releases.css"\n      - "site.js"\n      - "index.html"\n', 1)

validation_step = '''      - name: Validate homepage static fallback
        run: |
          python3 - <<'PY'
          import json
          from pathlib import Path
          data = json.loads(Path("releases.json").read_text(encoding="utf-8"))
          releases = data.get("releases", [])
          assert releases, "Release catalogue is empty"
          latest = releases[0]
          html = Path("index.html").read_text(encoding="utf-8")
          js = Path("site.js").read_text(encoding="utf-8")
          assert f'data-video-id="{latest["id"]}"' in html, "Homepage video fallback is stale"
          assert f'href="{latest["url"]}"' in html, "Homepage release link is stale"
          assert f'/api/release-image?id={latest["id"]}' in html, "Homepage thumbnail fallback is stale"
          assert latest["id"] in js, "JavaScript fallback latest release is stale"
          assert "// HOMEPAGE:AUTO-FALLBACK:START" in js
          assert "// HOMEPAGE:AUTO-FALLBACK:END" in js
          print(f'Homepage fallback: {latest["artist"]} — {latest["title"]}')
          PY

'''
if "      - name: Validate homepage static fallback\n" not in workflow:
    anchor = "      - name: Test release archive inline player\n"
    if anchor not in workflow:
        raise SystemExit("Could not find release archive test step")
    workflow = workflow.replace(anchor, validation_step + anchor, 1)

old_add = "          git add releases.json releases/ sitemap.xml artists/ artist-profiles.js artist-profiles-expanded.js\n"
new_add = "          git add releases.json releases/ sitemap.xml artists/ artist-profiles.js artist-profiles-expanded.js index.html site.js\n"
if old_add in workflow:
    workflow = workflow.replace(old_add, new_add, 1)
elif new_add not in workflow:
    raise SystemExit("Could not update catalogue git add list")

workflow_path.write_text(workflow, encoding="utf-8")
print("Installed catalogue-driven homepage fallback sync")
