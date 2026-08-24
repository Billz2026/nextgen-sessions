#!/usr/bin/env python3
"""Add the Privacy link to every site footer and keep generated pages future-safe."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVACY_LINK = '<a href="/privacy/">Privacy</a>'
FOOTER_RE = re.compile(r'<footer\s+class="site-footer"[\s\S]*?</footer>', re.I)
LINKS_RE = re.compile(r'(<div\s+class="footer-links">)([\s\S]*?)(</div>)', re.I)
CONTACT_RE = re.compile(r'<a\s+href="mailto:contact@nextgensessions\.com">Contact</a>', re.I)

# One-time migration entrypoint; safe to re-run because Privacy insertion is idempotent.

def patch_footer(footer: str) -> str:
    if re.search(r'href=["\']/privacy/["\']', footer, re.I):
        return footer

    match = LINKS_RE.search(footer)
    if not match:
        raise SystemExit("Found a site footer without a footer-links container")

    links = match.group(2)
    contact = CONTACT_RE.search(links)
    if contact:
        links = links[:contact.start()] + PRIVACY_LINK + links[contact.start():]
    else:
        links = links + PRIVACY_LINK

    return footer[:match.start(2)] + links + footer[match.end(2):]


def patch_html(path: Path) -> bool:
    source = path.read_text(encoding="utf-8")
    updated, count = FOOTER_RE.subn(lambda match: patch_footer(match.group(0)), source)
    if count and updated != source:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


changed: list[Path] = []
for path in sorted(ROOT.rglob("*.html")):
    if ".git" in path.parts or "node_modules" in path.parts:
        continue
    if patch_html(path):
        changed.append(path)

renderer_path = ROOT / "scripts" / "render-releases.py"
renderer = renderer_path.read_text(encoding="utf-8")
if PRIVACY_LINK not in renderer:
    contact = '<a href="mailto:contact@nextgensessions.com">Contact</a>'
    if contact not in renderer:
        raise SystemExit("Could not locate Contact link in release-page generator footer")
    renderer = renderer.replace(contact, PRIVACY_LINK + contact, 1)
    renderer_path.write_text(renderer, encoding="utf-8")

workflow_path = ROOT / ".github" / "workflows" / "update-catalogue.yml"
workflow = workflow_path.read_text(encoding="utf-8")
if '      - "scripts/test-global-footer.py"\n' not in workflow:
    anchor = '      - "scripts/test-release-archive-player.py"\n'
    if anchor not in workflow:
        raise SystemExit("Could not locate catalogue workflow path anchor")
    workflow = workflow.replace(anchor, '      - "scripts/test-global-footer.py"\n' + anchor, 1)

if "      - name: Test global Privacy footer\n" not in workflow:
    anchor = "      - name: Test release archive inline player\n"
    if anchor not in workflow:
        raise SystemExit("Could not locate catalogue workflow test anchor")
    step = "      - name: Test global Privacy footer\n        run: python3 scripts/test-global-footer.py\n\n"
    workflow = workflow.replace(anchor, step + anchor, 1)

workflow_path.write_text(workflow, encoding="utf-8")

print(f"Added Privacy to {len(changed)} existing HTML page(s) and hardened future release generation")
