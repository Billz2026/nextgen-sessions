const FALLBACK_RELEASES = [
  { id: "dV6_GbsHrxI", artist: "Kemarco", title: "Badman Don’t Rush", group: "Dancehall & Reggae", published: "2026-08-05T17:00:07Z", url: "/releases/kemarco-badman-dont-rush/" },
  { id: "xicnIGw-ei8", artist: "Alia Bleu", title: "Piggyback", group: "R&B & Soul", published: "2026-08-03T17:00:30Z", url: "/releases/alia-bleu-piggyback/" },
  { id: "Sra1722xEFE", artist: "Renz Cole", title: "Heatwave", group: "UK Rap & Grime", published: "2026-07-31T17:00:33Z", url: "/releases/renz-cole-heatwave/" }
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

export async function onRequestGet(context) {
  try {
    const url = new URL("/releases.json?api=r2", context.request.url);
    const request = new Request(url.toString(), { headers: { Accept: "application/json" } });
    const response = context.env?.ASSETS?.fetch
      ? await context.env.ASSETS.fetch(request)
      : await fetch(request);
    if (!response.ok) throw new Error(`Release catalogue returned ${response.status}`);
    const payload = await response.json();
    return jsonResponse(payload, "public, max-age=300, s-maxage=600, stale-while-revalidate=3600");
  } catch (_) {
    return jsonResponse({
      source: "curated-fallback",
      generatedAt: new Date().toISOString(),
      total: FALLBACK_RELEASES.length,
      releases: FALLBACK_RELEASES
    }, "public, max-age=60, s-maxage=120");
  }
}
