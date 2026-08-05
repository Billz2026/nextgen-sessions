from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site.js"

REPLACEMENT = '''  function mergeHomepageReleases(releases) {
    const byId = new Map();
    releases.forEach(release => {
      if (!release?.id) return;
      const existing = byId.get(release.id);
      if (!existing || releaseTimestamp(release) > releaseTimestamp(existing)) {
        byId.set(release.id, release);
      }
    });
    return [...byId.values()].sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a));
  }

  function buildHomepagePayload(apiPayload, cataloguePayload) {
    const apiReleases = payloadReleases(apiPayload);
    const catalogueReleases = payloadReleases(cataloguePayload);
    const fallbackReleases = FALLBACK_RELEASES
      .map(normaliseHomepageRelease)
      .filter(Boolean);
    const offlineReleases = mergeHomepageReleases([
      ...catalogueReleases,
      ...fallbackReleases
    ]);
    const releases = uniqueHomepageReleases([
      ...apiReleases,
      ...offlineReleases
    ]);

    const apiLatest = normaliseHomepageRelease(apiPayload?.latest);
    const latest = apiLatest || offlineReleases[0] || FALLBACK_LATEST;

    return { latest, releases };
  }'''


def main() -> None:
    text = SITE.read_text(encoding="utf-8")
    updated, count = re.subn(
        r'''  function buildHomepagePayload\(apiPayload, cataloguePayload\) \{.*?\n  \}''',
        REPLACEMENT,
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("Could not replace buildHomepagePayload")
    for needle in [
        "function mergeHomepageReleases(releases)",
        "const offlineReleases = mergeHomepageReleases",
        "const latest = apiLatest || offlineReleases[0] || FALLBACK_LATEST;",
    ]:
        if needle not in updated:
            raise RuntimeError(f"Missing expected merge logic: {needle}")
    SITE.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    main()
