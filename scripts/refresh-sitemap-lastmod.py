#!/usr/bin/env python3
"""Refresh sitemap lastmod values from actual page changes.

For tracked pages, use the most recent git commit date. If a page has uncommitted
changes in the current catalogue build, use today's UTC date. This avoids fake
hourly freshness while accurately signalling meaningful HTML updates.
"""

from __future__ import annotations

import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://nextgensessions.com"
SITEMAPS = ("sitemap.xml", "sitemap-mixes.xml", "sitemap-genres.xml")
URL_BLOCK = re.compile(r"<url>([\s\S]*?)</url>")
LOC = re.compile(r"<loc>([^<]+)</loc>")
LASTMOD = re.compile(r"<lastmod>\d{4}-\d{2}-\d{2}</lastmod>")


def page_path(url: str) -> Path | None:
    parsed = urlparse(url)
    if f"{parsed.scheme}://{parsed.netloc}" != SITE:
        return None
    route = parsed.path
    if route == "/":
        relative = "index.html"
    elif route.endswith(".html"):
        relative = route.lstrip("/")
    else:
        relative = f"{route.lstrip('/').rstrip('/')}/index.html"
    candidate = ROOT / relative
    return candidate if candidate.exists() else None


def is_dirty(relative: str) -> bool:
    tracked = subprocess.run(
        ["git", "ls-files", "--error-unmatch", "--", relative],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode == 0
    if not tracked:
        return True
    return subprocess.run(
        ["git", "diff", "--quiet", "--", relative],
        cwd=ROOT,
    ).returncode != 0


def git_date(relative: str) -> str:
    today = datetime.now(timezone.utc).date().isoformat()
    if is_dirty(relative):
        return today
    result = subprocess.run(
        ["git", "log", "-1", "--format=%cs", "--", relative],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    value = result.stdout.strip()
    return value if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) else today


def refresh(path: Path) -> tuple[int, int]:
    source = path.read_text(encoding="utf-8")
    changed = 0
    covered = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal changed, covered
        inner = match.group(1)
        loc_match = LOC.search(inner)
        if not loc_match:
            return match.group(0)
        page = page_path(loc_match.group(1).strip())
        if page is None:
            return match.group(0)
        covered += 1
        relative = page.relative_to(ROOT).as_posix()
        lastmod = git_date(relative)
        replacement = f"<lastmod>{lastmod}</lastmod>"
        if LASTMOD.search(inner):
            next_inner = LASTMOD.sub(replacement, inner, count=1)
        else:
            next_inner = inner.replace("</loc>", f"</loc>{replacement}", 1)
        if next_inner != inner:
            changed += 1
        return f"<url>{next_inner}</url>"

    output = URL_BLOCK.sub(replace, source)
    path.write_text(output, encoding="utf-8")
    return covered, changed


def main() -> None:
    total_covered = 0
    total_changed = 0
    for name in SITEMAPS:
        path = ROOT / name
        if not path.exists():
            continue
        covered, changed = refresh(path)
        total_covered += covered
        total_changed += changed
        print(f"{name}: {covered} local pages checked, {changed} lastmod values updated")
    if total_covered < 100:
        raise SystemExit(f"Unexpectedly low sitemap coverage: {total_covered}")
    print(f"Sitemap lastmod refresh complete: {total_covered} local pages checked, {total_changed} updated")


if __name__ == "__main__":
    main()
