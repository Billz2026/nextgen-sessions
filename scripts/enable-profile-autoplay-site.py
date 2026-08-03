from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
profile_path = root / "artist-profile.js"
text = profile_path.read_text(encoding="utf-8")

old_signature = "function featuredFrame(release, scheduledRelease, releaseDate) {"
new_signature = "function featuredFrame(release, scheduledRelease, releaseDate, autoplay = false) {"
assert old_signature in text, "featuredFrame signature not found"
text = text.replace(old_signature, new_signature, 1)

old_src = 'src="https://www.youtube-nocookie.com/embed/${escapeHtml(release.id)}?rel=0&amp;modestbranding=1"'
new_src = 'src="https://www.youtube-nocookie.com/embed/${escapeHtml(release.id)}?rel=0&amp;modestbranding=1${autoplay ? "&amp;autoplay=1" : ""}"'
assert old_src in text, "featured iframe source not found"
text = text.replace(old_src, new_src, 1)

old_player = 'if (frame) frame.innerHTML = featuredFrame(release, false, "");'
new_player = 'if (frame) frame.innerHTML = featuredFrame(release, false, "", true);'
assert old_player in text, "setFeaturedPlayer call not found"
text = text.replace(old_player, new_player, 1)
profile_path.write_text(text, encoding="utf-8")

reiss_path = root / "artists" / "reiss" / "index.html"
text = reiss_path.read_text(encoding="utf-8")
text = re.sub(r'/artist-profile\.js(?:\?v=[^"\s]+)?', '/artist-profile.js?v=20260803-autoplay1', text)
reiss_path.write_text(text, encoding="utf-8")

print("Shared artist player autoplay enabled")
