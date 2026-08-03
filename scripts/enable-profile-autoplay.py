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

# Force the Reiss page to request the corrected generic player immediately.
reiss_path = root / "artists" / "reiss" / "index.html"
text = reiss_path.read_text(encoding="utf-8")
text = re.sub(
    r'/artist-profile\.js(?:\?v=[^"\s]+)?',
    '/artist-profile.js?v=20260803-autoplay1',
    text,
)
reiss_path.write_text(text, encoding="utf-8")

# Extend the Reiss validator to cover the shared playback change.
validator_path = root / ".github" / "workflows" / "validate-reiss-profile.yml"
text = validator_path.read_text(encoding="utf-8")
if '- "artist-profile.js"' not in text:
    text = text.replace(
        '      - "artist-albums.js"\n',
        '      - "artist-albums.js"\n      - "artist-profile.js"\n',
        1,
    )
if 'node --check artist-profile.js' not in text:
    text = text.replace(
        '          node --check artist-albums.js\n',
        '          node --check artist-albums.js\n          node --check artist-profile.js\n',
        1,
    )
if "grep -q 'autoplay=1' artist-profile.js" not in text:
    text = text.replace(
        "          grep -q '\"imageKey\": \"reiss\"' artist-profiles-expanded.js\n",
        "          grep -q '\"imageKey\": \"reiss\"' artist-profiles-expanded.js\n          grep -q 'autoplay=1' artist-profile.js\n",
        1,
    )
validator_path.write_text(text, encoding="utf-8")

print("Shared artist-profile autoplay enabled")
