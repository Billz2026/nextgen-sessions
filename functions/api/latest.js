const FALLBACK_RELEASES = [
  { id: "dV6_GbsHrxI", contentType: "full-release", artist: "Kemarco", title: "Badman Don’t Rush", group: "Dancehall", published: "2026-08-05T17:00:07Z", url: "/releases/kemarco-badman-dont-rush/" },
  { id: "xicnIGw-ei8", contentType: "full-release", artist: "Alia Bleu", title: "Piggyback", group: "R&B & Soul", published: "2026-08-03T17:00:30Z", url: "/releases/alia-bleu-piggyback/" },
  { id: "Sra1722xEFE", contentType: "full-release", artist: "Renz Cole", title: "Heatwave", group: "UK Rap & Grime", published: "2026-07-31T17:00:33Z", url: "/releases/renz-cole-heatwave/" },
  { id: "6H6yq_1bEsQ", contentType: "full-release", artist: "Reeko", title: "After Di Party", group: "Dancehall", published: "2026-07-29T17:00:35Z", url: "/releases/reeko-after-di-party/" },
  { id: "ZSjRD_3B5uk", contentType: "full-release", artist: "Deon Creed", title: "Days Like These", group: "R&B & Soul", published: "2026-07-27T17:00:05Z", url: "/releases/deon-creed-days-like-these/" }
];

const BLOCKED_LATEST_TITLE = /\b(?:shorts?|teaser|trailer|promo|preview|coming soon|out tomorrow|out tonight|out now)\b|#shorts/i;
const RELEASE_PAGE = /^\/releases\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
const MIX_SOURCE = "youtube-mix-archives-and-channel-uploads";
const ALBUM_SOURCE = "youtube-album-playlist";
const MIX_DESTINATIONS = {
  grime: "/mixes/grime-mashup-series-1/",
  "hip-hop": "/mixes/hip-hop-mashup-series-1/",
  "uk-rap": "/mixes/uk-rap-mashup-series-1/",
  dancehall: "/mixes/dancehall-mashups/",
  summer: "/mixes/sound-of-summer/"
};
const ALBUM_DESTINATION = "/mixes/full-albums/";

function jsonResponse(payload, cacheControl) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff"
    }
  });
}

function validVideoId(value) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(value || ""));
}

function safeTitle(item) {
  return !BLOCKED_LATEST_TITLE.test(`${String(item?.title || "")} ${String(item?.rawTitle || "")}`);
}

export function validFullRelease(item) {
  return validVideoId(item?.id) &&
    item?.contentType === "full-release" &&
    String(item?.artist || "").trim() &&
    String(item?.title || "").trim() &&
    RELEASE_PAGE.test(String(item?.url || "")) &&
    safeTitle(item);
}

export function validLongMix(item) {
  return validVideoId(item?.id) &&
    item?.contentType === "long-mix" &&
    String(item?.title || item?.rawTitle || "").trim() &&
    Number(item?.durationSeconds || 0) >= 600 &&
    safeTitle(item);
}

export function validAlbum(item) {
  return validVideoId(item?.id) &&
    String(item?.artist || "").trim() &&
    String(item?.albumTitle || "").trim() &&
    /\balbum\b/i.test(String(item?.rawTitle || "")) &&
    safeTitle(item);
}

function publishedTimestamp(item) {
  return Date.parse(item?.published || "") || 0;
}

function releasedNow(item) {
  const timestamp = publishedTimestamp(item);
  return !timestamp || timestamp <= Date.now();
}

function mixDisplayTitle(item) {
  const raw = String(item?.rawTitle || "").trim();
  if (raw) {
    const firstSegment = raw.split("|")[0].trim();
    if (firstSegment) return firstSegment;
  }
  return String(item?.title || "NextGen Sessions Mix").trim();
}

function normaliseLongMix(item) {
  return {
    ...item,
    contentType: "long-mix",
    title: mixDisplayTitle(item),
    url: MIX_DESTINATIONS[String(item?.collection || "").trim()] || "/mixes/"
  };
}

function normaliseAlbum(item) {
  const artist = String(item?.artist || "NextGen Sessions").trim();
  const albumTitle = String(item?.albumTitle || "Full Album").trim();
  return {
    ...item,
    contentType: "album",
    title: `${artist} – ${albumTitle} (Full Album)`,
    url: ALBUM_DESTINATION
  };
}

async function fetchAssetJson(context, path, cacheBust) {
  const url = new URL(`${path}?latest=${cacheBust}`, context.request.url);
  const request = new Request(url.toString(), { headers: { Accept: "application/json" } });
  const response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(request)
    : await fetch(request);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function fetchReleaseCatalogue(context) {
  return selectFullReleases(await fetchAssetJson(context, "/releases.json", "r4"));
}

async function fetchMixCatalogue(context) {
  try {
    return selectLongMixes(await fetchAssetJson(context, "/mixes.json", "r4"));
  } catch (_) {
    return [];
  }
}

async function fetchAlbumCatalogue(context) {
  try {
    return selectAlbums(await fetchAssetJson(context, "/albums.json", "r4"));
  } catch (_) {
    return [];
  }
}

export function selectFullReleases(payload) {
  if (payload?.source !== "curated-youtube-playlists") {
    throw new Error("Unverified release catalogue source");
  }
  const releases = Array.isArray(payload?.releases) ? payload.releases : [];
  return releases
    .filter(validFullRelease)
    .filter(releasedNow)
    .sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
}

export function selectLongMixes(payload) {
  if (payload?.source !== MIX_SOURCE || payload?.contentPolicy?.shortsAllowed !== false) {
    throw new Error("Unverified mix catalogue source");
  }
  const mixes = Array.isArray(payload?.mixes) ? payload.mixes : [];
  return mixes
    .filter(validLongMix)
    .filter(releasedNow)
    .map(normaliseLongMix)
    .sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
}

export function selectAlbums(payload) {
  if (payload?.source !== ALBUM_SOURCE) {
    throw new Error("Unverified album catalogue source");
  }
  const albums = Array.isArray(payload?.albums) ? payload.albums : [];
  return albums
    .filter(validAlbum)
    .filter(releasedNow)
    .map(normaliseAlbum)
    .sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
}

function combinedItems(releases, mixes, albums) {
  const byId = new Map();
  [...releases, ...mixes, ...albums].forEach(item => {
    if (!item?.id) return;
    const existing = byId.get(item.id);
    if (!existing || publishedTimestamp(item) > publishedTimestamp(existing)) {
      byId.set(item.id, item);
    }
  });
  return [...byId.values()].sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/latest?v=r4", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const [releases, mixes, albums] = await Promise.all([
      fetchReleaseCatalogue(context),
      fetchMixCatalogue(context),
      fetchAlbumCatalogue(context)
    ]);
    if (!releases.length) throw new Error("Release catalogue is empty");

    const items = combinedItems(releases, mixes, albums);
    if (!items.length) throw new Error("No eligible latest items");

    const output = jsonResponse({
      source: "verified-full-length-catalogues",
      policy: "songs-albums-mixes-no-shorts",
      generatedAt: new Date().toISOString(),
      latest: items[0],
      releases: releases.slice(0, 8),
      items: items.slice(0, 12)
    }, "public, max-age=60, s-maxage=120, stale-while-revalidate=600");
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return jsonResponse({
      source: "curated-fallback",
      policy: "songs-albums-mixes-no-shorts",
      generatedAt: new Date().toISOString(),
      latest: FALLBACK_RELEASES[0],
      releases: FALLBACK_RELEASES,
      items: FALLBACK_RELEASES
    }, "public, max-age=30, s-maxage=60");
  }
}