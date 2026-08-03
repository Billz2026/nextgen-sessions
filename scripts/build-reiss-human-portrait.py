from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PARTS_DIR = ROOT / ".tmp" / "reiss-human"
ASSET_DIR = ROOT / "assets" / "artists"
CACHE_OLD = "20260803-reiss1"
CACHE_NEW = "20260803-reiss2"

OUTPUTS = {
    "reiss-portrait.webp": ((1120, 1400), 88),
    "reiss-card.webp": ((1024, 1280), 88),
    "reiss-card-640.webp": ((640, 800), 88),
}

TEXT_FILES = [
    ROOT / "artist-images.js",
    ROOT / "index.html",
    ROOT / "artists" / "index.html",
    ROOT / "artists" / "reiss" / "index.html",
]


def load_source() -> Image.Image:
    parts = sorted(PARTS_DIR.glob("part-*.txt"))
    if len(parts) != 5:
        raise RuntimeError(f"Expected 5 source chunks, found {len(parts)}")

    encoded = "".join(part.read_text(encoding="utf-8").strip() for part in parts)
    raw = base64.b64decode(encoded, validate=True)
    image = Image.open(BytesIO(raw)).convert("RGB")
    if image.size != (1120, 1400):
        raise RuntimeError(f"Unexpected approved portrait size: {image.size}")
    return image


def write_assets(source: Image.Image) -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for filename, (size, quality) in OUTPUTS.items():
        image = source if source.size == size else source.resize(size, Image.Resampling.LANCZOS)
        destination = ASSET_DIR / filename
        image.save(destination, "WEBP", quality=quality, method=6)

        with Image.open(destination) as check:
            if check.size != size or check.format != "WEBP":
                raise RuntimeError(f"Invalid generated asset: {destination}")
        if destination.stat().st_size < 40_000:
            raise RuntimeError(f"Generated asset is unexpectedly small: {destination}")
        print(destination.relative_to(ROOT), size, destination.stat().st_size)


def update_cache_references() -> None:
    for path in TEXT_FILES:
        text = path.read_text(encoding="utf-8")
        if CACHE_OLD not in text:
            raise RuntimeError(f"Expected cache key not found in {path.relative_to(ROOT)}")
        path.write_text(text.replace(CACHE_OLD, CACHE_NEW), encoding="utf-8")
        print("Updated", path.relative_to(ROOT))


if __name__ == "__main__":
    approved = load_source()
    write_assets(approved)
    update_cache_references()
