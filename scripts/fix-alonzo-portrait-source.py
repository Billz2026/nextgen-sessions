from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    profiles = ROOT / "artist-profiles.js"
    text = profiles.read_text(encoding="utf-8")
    pattern = re.compile(
        r'("alonzo-ray"\s*:\s*\{.*?"imageKey"\s*:\s*"alonzo-ray",\s*)'
        r'(?:"image"\s*:\s*"[^"]+",\s*)?'
        r'"imagePosition"\s*:\s*"[^"]+"',
        re.S,
    )
    replacement = (
        r'\1"image": "/assets/artists/alonzo-ray-card.webp?v=20260805-alonzo5",\n'
        r'    "imagePosition": "50% 50%"'
    )
    updated, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise RuntimeError("Could not switch Alonzo to the clean card portrait")
    profiles.write_text(updated, encoding="utf-8")

    page = ROOT / "artists/alonzo-ray/index.html"
    html = page.read_text(encoding="utf-8")
    html = re.sub(r"20260805-alonzo\d+", "20260805-alonzo5", html)
    page.write_text(html, encoding="utf-8")

    validation = ROOT / ".github/workflows/validate-homepage-latest-fix.yml"
    workflow = validation.read_text(encoding="utf-8")
    workflow = workflow.replace("assert.equal(state.objectPosition, '50% 0%');", "assert.equal(state.objectPosition, '50% 50%');")
    old_state = '''              const state = await portrait.evaluate(image => ({
                objectPosition: getComputedStyle(image).objectPosition,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                box: image.getBoundingClientRect().toJSON()
              }));'''
    new_state = '''              const state = await portrait.evaluate(image => ({
                src: image.getAttribute('src'),
                objectPosition: getComputedStyle(image).objectPosition,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                box: image.getBoundingClientRect().toJSON()
              }));'''
    if old_state not in workflow:
        raise RuntimeError("Could not extend Alonzo browser assertion state")
    workflow = workflow.replace(old_state, new_state, 1)
    marker = "              assert.equal(state.objectPosition, '50% 50%');"
    if marker not in workflow:
        raise RuntimeError("Could not update Alonzo object-position assertion")
    workflow = workflow.replace(marker, marker + "\n              assert.ok(state.src.includes('alonzo-ray-card.webp'));", 1)
    validation.write_text(workflow, encoding="utf-8")

    checks = {
        profiles: [
            '"image": "/assets/artists/alonzo-ray-card.webp?v=20260805-alonzo5"',
            '"imagePosition": "50% 50%"',
        ],
        page: ["20260805-alonzo5"],
        validation: ["state.src.includes('alonzo-ray-card.webp')", "'50% 50%'"],
    }
    for path, needles in checks.items():
        body = path.read_text(encoding="utf-8")
        for needle in needles:
            if needle not in body:
                raise RuntimeError(f"Missing {needle!r} in {path}")


if __name__ == "__main__":
    main()
