const FALLBACK_RELEASES = [
  { id: "dV6_GbsHrxI", artist: "Kemarco", title: "Badman Don’t Rush", group: "Dancehall & Reggae", published: "2026-08-05T17:00:07Z", url: "/releases/kemarco-badman-dont-rush/" },
  { id: "xicnIGw-ei8", artist: "Alia Bleu", title: "Piggyback", group: "R&B & Soul", published: "2026-08-03T17:00:30Z", url: "/releases/alia-bleu-piggyback/" },
  { id: "Sra1722xEFE", artist: "Renz Cole", title: "Heatwave", group: "UK Rap & Grime", published: "2026-07-31T17:00:33Z", url: "/releases/renz-cole-heatwave/" },
  { id: "6H6yq_1bEsQ", artist: "Reeko", title: "After Di Party", group: "Dancehall & Reggae", published: "2026-07-29T17:00:35Z", url: "/releases/reeko-after-di-party/" },
  { id: "ZSjRD_3B5uk", artist: "Deon Creed", title: "Days Like These", group: "R&B & Soul", published: "2026-07-27T17:00:05Z", url: "/releases/deon-creed-days-like-these/" }
];

function jsonResponse(payload, cacheControl) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff"
    }
  });
}

function validRelease(item) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(item?.id || "")) &&
    String(item?.artist || "").trim() && String(item?.title || "").trim();
}

function publishedTimestamp(item) {
  return Date.parse(item?.published || "") || 0;
}

function releasedNow(item) {
  const timestamp = publishedTimestamp(item);
  return !timestamp || timestamp <= Date.now();
}

async function fetchCatalogue(context) {
  const url = new URL("/releases.json?latest=r2", context.request.url);
  const request = new Request(url.toString(), { headers: { Accept: "application/json" } });
  const response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(request)
    : await fetch(request);
  if (!response.ok) throw new Error(`Release catalogue returned ${response.status}`);
  const payload = await response.json();
  const releases = Array.isArray(payload?.releases) ? payload.releases : [];
  return releases
    .filter(validRelease)
    .filter(releasedNow)
    .sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/latest?v=r2", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const releases = await fetchCatalogue(context);
    if (!releases.length) throw new Error("Release catalogue is empty");
    const output = jsonResponse({
      source: "verified-release-catalogue",
      generatedAt: new Date().toISOString(),
      latest: releases[0],
      releases: releases.slice(0, 8),
      items: releases.slice(0, 8)
    }, "public, max-age=60, s-maxage=120, stale-while-revalidate=600");
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return jsonResponse({
      source: "curated-fallback",
      generatedAt: new Date().toISOString(),
      latest: FALLBACK_RELEASES[0],
      releases: FALLBACK_RELEASES,
      items: FALLBACK_RELEASES
    }, "public, max-age=30, s-maxage=60");
  }
}
