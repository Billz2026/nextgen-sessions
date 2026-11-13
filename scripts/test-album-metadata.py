#!/usr/bin/env python3
"""Regression checks for newly discovered official album titles."""
from album_metadata import infer_album_metadata

cases = [
    ("Kemarco - Badman Don't Rush | Full Dancehall Album 2026 | NextGen Sessions",
     "Kemarco", "Badman Don't Rush"),
    ("Kemarco — New Project (Full Album) | Dancehall 2026 | NextGen Sessions",
     "Kemarco", "New Project"),
    ("Rudii Marka – Marked Rudeboi Full Album 2026 | NextGen Sessions",
     "Rudii Marka", "Marked Rudeboi"),
]
for raw, artist, title in cases:
    parsed = infer_album_metadata(raw)
    assert parsed == {"artist": artist, "albumTitle": title}, parsed

try:
    infer_album_metadata("Unknown album title without an artist separator")
except ValueError:
    pass
else:
    raise AssertionError("Ambiguous YouTube album titles must fail validation")

print("Album title inference validated.")
