#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]

images = root / "artist-images.js"
text = images.read_text(encoding="utf-8")
old = '''  const deon = window.NGS_ARTISTS.find(artist => artist.slug === "deon-creed");
  if (deon) {
    deon.genre = "Soul / R&B";
    deon.summary = "Reflective neighbourhood soul shaped by faith, responsibility, resilience and mature perspective.";
  }'''
new = '''  const deon = window.NGS_ARTISTS.find(artist => artist.slug === "deon-creed");
  if (deon) {
    deon.genre = "Hip-Hop";
    deon.summary = "Grounded hip-hop with mature neighbourhood storytelling, resilience and reflective perspective.";
  }'''
if old not in text and 'deon.genre = "Hip-Hop"' not in text:
    raise SystemExit("Deon runtime override block not found")
text = text.replace(old, new)
images.write_text(text, encoding="utf-8")

home = root / "index.html"
text = home.read_text(encoding="utf-8")
text = text.replace('/artists.js?v=20260809-clean1', '/artists.js?v=20260824-zion1')
text = text.replace('/artist-images.js?v=20260807-final3', '/artist-images.js?v=20260824-zion2')
home.write_text(text, encoding="utf-8")

print("Runtime artist overrides corrected")
