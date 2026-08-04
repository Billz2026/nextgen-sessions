from __future__ import annotations

import base64
import hashlib
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PARTS_DIR = ROOT / ".tmp" / "rell-danja"
ASSET_DIR = ROOT / "assets" / "artists"

EXPECTED_PARTS = {
    "part-00.txt": (8000, "eb76eeef60baef64ee840d7b2ddbd66c2d23b19f332607725927be3b737a7cf1"),
    "part-01.txt": (8000, "6145d5d38b8447f4b85c773b977a4072332dbbe335f32c04fd2ceae3f81b992d"),
    "part-02.txt": (12000, "8524648047b949f6b40ae07d69ec68d0ebaab2591365c650327c6344e706e3a5"),
    "part-03.txt": (12000, "b6b64d3578bd9e74901e47768a0576cd67d6a38a5f26ad3d60e8e1fc00a90956"),
    "part-04.txt": (12000, "22069214317c4d22180eba73b17a1d68887e76c3684894e6ccc03486ba2a0f4e"),
    "part-05.txt": (12000, "84aa75376928794df4e7454d2be2105c8a070a63aa2ee67b3d8e6016e1d16659"),
    "part-06.txt": (12000, "61505765d4d4ed88d77177c1487b52bb8dc5deb5760c5ec34579493a11a28392"),
    "part-07.txt": (12000, "285c59392e548d1c5450151ce2da171eb550383b8d7c7e4e7fea4cc05d2dd445"),
    "part-08.txt": (12000, "effc24d1374290ae84dcde4339620b1fbdeeb267b3442d395b24b507d4baa24d"),
    "part-09.txt": (11172, "102f50506a31cd7d03198b6b68e177413a71ddee80bbb906f23ddfab94f2be1a"),
}
EXPECTED_FULL_HASH = "636b540133f259ddf9bc7b7214f6c0327c2e3d12c3799e2ced4225d1b66ee722"
EXPECTED_BINARY_HASH = "7148170ddd4a0387f99d9f9eaac502462778c705734bd620efa957289164239b"

OUTPUTS = {
    "rell-danja-portrait.webp": (1120, 1400),
    "rell-danja-card.webp": (1024, 1280),
    "rell-danja-card-640.webp": (640, 800),
}


def load_master() -> Image.Image:
    parts = sorted(PARTS_DIR.glob("part-*.txt"))
    expected_names = list(EXPECTED_PARTS)
    actual_names = [part.name for part in parts]
    if actual_names != expected_names:
        raise RuntimeError(f"Unexpected portrait chunks: {actual_names}")

    chunks: list[str] = []
    for part in parts:
        chunk = part.read_text(encoding="utf-8").strip()
        expected_length, expected_hash = EXPECTED_PARTS[part.name]
        actual_hash = hashlib.sha256(chunk.encode("utf-8")).hexdigest()
        if len(chunk) != expected_length or actual_hash != expected_hash:
            raise RuntimeError(
                f"Portrait transfer checksum failed for {part.name}: "
                f"length={len(chunk)} hash={actual_hash}"
            )
        chunks.append(chunk)

    encoded = "".join(chunks)
    full_hash = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    if full_hash != EXPECTED_FULL_HASH:
        raise RuntimeError(f"Full base64 checksum failed: {full_hash}")

    raw = base64.b64decode(encoded, validate=True)
    binary_hash = hashlib.sha256(raw).hexdigest()
    if binary_hash != EXPECTED_BINARY_HASH:
        raise RuntimeError(f"Decoded portrait checksum failed: {binary_hash}")

    image = Image.open(BytesIO(raw)).convert("RGB")
    if image.format not in (None, "WEBP") or image.size != (1120, 1400):
        raise RuntimeError(f"Unexpected approved portrait: {image.format} {image.size}")
    return image


def build_assets(master: Image.Image) -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for filename, size in OUTPUTS.items():
        image = master if master.size == size else master.resize(size, Image.Resampling.LANCZOS)
        destination = ASSET_DIR / filename
        image.save(destination, "WEBP", quality=88, method=6)

        data = destination.read_bytes()
        with Image.open(destination) as check:
            if check.format != "WEBP" or check.size != size:
                raise RuntimeError(f"Invalid generated asset: {filename}")
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP" or len(data) < 35_000:
            raise RuntimeError(f"Invalid WebP payload: {filename} ({len(data)} bytes)")
        print(filename, size, len(data), hashlib.sha256(data).hexdigest())


if __name__ == "__main__":
    build_assets(load_master())
