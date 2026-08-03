from __future__ import annotations

import base64
import hashlib
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PARTS_DIR = ROOT / ".tmp" / "reiss-human"
ASSET_DIR = ROOT / "assets" / "artists"
CACHE_OLD = "20260803-reiss1"
CACHE_NEW = "20260803-reiss2"
ASSET_CACHE_NEW = "20260803-reiss1&portrait=human2"

EXPECTED_PARTS = {
    "part-00.txt": (8000, "1544efa18b8d107c33747e9b16a856ee12bb03aed9dee55aa2b090258d54a79c"),
    "part-01.txt": (14500, "6cb1bc12938d040e19d4534589b6771dd86ec82f3870593480effbf0e08736e7"),
    "part-02.txt": (14500, "12c9533ceebac8771ff6a80e8742ec39ff5ccf7f68d9ba25f1b05617b686c62c"),
    "part-03.txt": (14500, "bfc7aebc6fa799b536ef88b785f7d7715c8e3cc496170b6b3f8ad50490a34a45"),
    "part-04.txt": (13736, "1024fa9bd2c0a28f9051435e0e1ed6a9cbd81b99add064ef53af19fa6c22e0ca"),
}
EXPECTED_FULL_HASH = "d4544d733df2e19894c961ce56053c6a2dacd5df7524308a2f340332806b2b58"

OUTPUTS = {
    "reiss-portrait.webp": ((1120, 1400), 88),
    "reiss-card.webp": ((1024, 1280), 88),
    "reiss-card-640.webp": ((640, 800), 88),
}

HTML_FILES = [
    ROOT / "index.html",
    ROOT / "artists" / "index.html",
    ROOT / "artists" / "reiss" / "index.html",
]


def load_source() -> Image.Image:
    parts = sorted(PARTS_DIR.glob("part-*.txt"))
    if len(parts) != 5:
        raise RuntimeError(f"Expected 5 source chunks, found {len(parts)}")

    chunks: list[str] = []
    failures: list[str] = []
    for part in parts:
        chunk = part.read_text(encoding="utf-8").strip()
        actual_hash = hashlib.sha256(chunk.encode("utf-8")).hexdigest()
        expected_length, expected_hash = EXPECTED_PARTS[part.name]
        print(part.name, len(chunk), actual_hash)
        if len(chunk) != expected_length or actual_hash != expected_hash:
            failures.append(part.name)
        chunks.append(chunk)
    if failures:
        raise RuntimeError("Portrait transfer checksum failed for: " + ", ".join(failures))

    encoded = "".join(chunks)
    full_hash = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    if full_hash != EXPECTED_FULL_HASH:
        raise RuntimeError(f"Full portrait transfer checksum failed: {full_hash}")

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
    mapping_path = ROOT / "artist-images.js"
    mapping = mapping_path.read_text(encoding="utf-8")
    old_asset_cache = f"?v={CACHE_OLD}"
    new_asset_cache = f"?v={ASSET_CACHE_NEW}"
    if mapping.count(old_asset_cache) < 4:
        raise RuntimeError("Expected Reiss asset cache references were not found")
    mapping_path.write_text(mapping.replace(old_asset_cache, new_asset_cache), encoding="utf-8")
    print("Updated", mapping_path.relative_to(ROOT))

    for path in HTML_FILES:
        text = path.read_text(encoding="utf-8")
        if CACHE_OLD not in text:
            raise RuntimeError(f"Expected cache key not found in {path.relative_to(ROOT)}")
        path.write_text(text.replace(CACHE_OLD, CACHE_NEW), encoding="utf-8")
        print("Updated", path.relative_to(ROOT))


if __name__ == "__main__":
    approved = load_source()
    write_assets(approved)
    update_cache_references()
