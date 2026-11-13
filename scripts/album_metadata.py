"""Parse artist and album title from official YouTube album video titles.

Known releases keep their curated metadata in the workflow. This parser is the
validated fallback for newly published albums added to the official playlist.
"""

import re

_SEPARATOR = re.compile(r"^\s*(?P<artist>.+?)\s+[-–—]\s+(?P<title>.+?)\s*$")
_SUFFIX = re.compile(
    r"(?:"
    r"\s*[\(\[]\s*(?:full\s+)?(?:dancehall\s+|reggae\s+|hip[- ]hop\s+|r\s*&\s*b\s+)?album(?:\s+20\d{2})?\s*[\)\]]"
    r"|\s+(?:full\s+)?(?:dancehall\s+|reggae\s+|hip[- ]hop\s+|r\s*&\s*b\s+)?album(?:\s+20\d{2})?"
    r")\s*$",
    re.IGNORECASE,
)


def infer_album_metadata(raw_title: str) -> dict[str, str]:
    """Read 'Artist - Album | ...' without inventing artist/title metadata.

    Raises on ambiguous formats rather than publishing incorrect names.
    """
    title_line = str(raw_title or "").split("|", 1)[0].strip()
    match = _SEPARATOR.fullmatch(title_line)
    if not match:
        raise ValueError(f"Cannot infer artist/album from YouTube title: {raw_title!r}")

    artist = match.group("artist").strip()
    album_title = match.group("title").strip()
    album_title = _SUFFIX.sub("", album_title).strip(" -–—")

    if not artist or not album_title:
        raise ValueError(f"Invalid inferred artist/album from YouTube title: {raw_title!r}")
    return {"artist": artist, "albumTitle": album_title}
