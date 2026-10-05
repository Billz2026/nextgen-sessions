const LATEST_CHANNEL_ID = "UCJdBLa1mf6yxk7xaOzSpBjg";
const LATEST_CHANNEL_FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=" + LATEST_CHANNEL_ID;

function latestDecodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function latestFeedTag(block, tag) {
  const match = String(block || "").match(
    new RegExp("<" + tag + "[^>]*>([\\\\s\\\\S]*?)<\\\\/" + tag + ">", "i")
  );
  return latestDecodeXml(match ? match[1] : "").trim();
}

function latestFeedEntries(xml) {
  const entries = [];
  const pattern = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = pattern.exec(String(xml || "")))) {
    const block = match[1];
    const id = latestFeedTag(block, "yt:videoId");
    const title = latestFeedTag(block, "title");
    const published = latestFeedTag(block, "published");
    if (id && title && published) entries.push({ id, title, published });
  }
  return entries;
}

function latestFeedArtistTitle(rawTitle) {
  const segments = String(rawTitle || "").split("|").map(part => part.trim()).filter(Boolean);
  for (const segment of segments) {
    const match = segment.match(/^(.*?)\s+[-–—]\s+(.+)$/);
    if (match && match[1].trim() && match[2].trim()) {
      return { artist: match[1].trim(), title: match[2].trim() };
    }
  }
  return { artist: "NextGen Sessions", title: segments[0] || String(rawTitle || "").trim() };
}

function latestFeedContentType(rawTitle) {
  const title = String(rawTitle || "");
  if (/\balbum\b/i.test(title)) return "album";
  if (/\b(?:mash\s*up|mashup|riddim|mix)\b/i.test(title)) return "long-mix";
  return "full-release";
}

function latestFeedDestination(contentType) {
  if (contentType === "album") return ALBUM_DESTINATION;
  if (contentType === "long-mix") return "/mixes/";
  return "/releases/";
}

function trustedLatestFeedTitle(rawTitle) {
  const title = String(rawTitle || "").trim();
  const segments = title.split("|").map(part => part.trim()).filter(Boolean);
  return Boolean(
    title &&
    /NextGen Sessions/i.test(title) &&
    !BLOCKED_LATEST_TITLE.test(title) &&
    (segments.length >= 3 || /\b(?:album|mash\s*up|mashup|riddim|mix)\b/i.test(title))
  );
}

async function latestFeedDurationSeconds(videoId) {
  try {
    const response = await fetch("https://www.youtube.com/watch?v=" + encodeURIComponent(videoId), {
      headers: {
        "Accept": "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; NextGenSessionsLatest/2.0)"
      }
    });
    if (!response.ok) return 0;
    const html = await response.text();
    const direct = html.match(/"lengthSeconds":"(\d+)"/);
    if (direct) return Number(direct[1] || 0);
    const approx = html.match(/"approxDurationMs":"(\d+)"/);
    return approx ? Math.round(Number(approx[1] || 0) / 1000) : 0;
  } catch (_) {
    return 0;
  }
}

async function fetchLiveChannelLatest() {
  const response = await fetch(LATEST_CHANNEL_FEED_URL, {
    headers: {
      "Accept": "application/atom+xml,application/xml,text/xml",
      "User-Agent": "NextGenSessionsLatest/2.0"
    }
  });
  if (!response.ok) throw new Error("YouTube channel feed returned " + response.status);

  const entries = latestFeedEntries(await response.text())
    .filter(item => validVideoId(item.id))
    .filter(item => trustedLatestFeedTitle(item.title))
    .filter(item => (Date.parse(item.published) || 0) <= Date.now())
    .sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));

  for (const entry of entries.slice(0, 8)) {
    const contentType = latestFeedContentType(entry.title);
    const durationSeconds = await latestFeedDurationSeconds(entry.id);
    const minimum = contentType === "long-mix" ? 600 : 75;
    if (durationSeconds > 0 && durationSeconds < minimum) continue;

    const parsed = latestFeedArtistTitle(entry.title);
    return {
      id: entry.id,
      contentType,
      artist: parsed.artist,
      title: parsed.title,
      rawTitle: entry.title,
      published: entry.published,
      durationSeconds,
      url: latestFeedDestination(contentType),
      discoverySource: "youtube-channel-feed"
    };
  }
  return null;
}

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
const MIX_ITEM_DESTINATIONS = {
  "3MH2DQAKkmM": "/mixes/uk-rap-mashup-series-2/"
};
const ALBUM_DESTINATION = "/mixes/full-albums/";

function jsonResponse(payload, cacheControl, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
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
  const id = String(item?.id || "").trim();
  return {
    ...item,
    contentType: "long-mix",
    title: mixDisplayTitle(item),
    url: MIX_ITEM_DESTINATIONS[id] || MIX_DESTINATIONS[String(item?.collection || "").trim()] || "/mixes/"
  };
}

function normaliseAlbum(item) {
  const artist = String(item?.artist || "").trim();
  const albumTitle = String(item?.albumTitle || "").trim();
  const rawTitle = String(item?.rawTitle || "").trim();
  const rawLead = rawTitle.split("|")[0].trim();
  const title = artist && albumTitle
    ? `${artist} – ${albumTitle} (Full Album)`
    : (rawLead || rawTitle || "NextGen Sessions Full Album");
  return {
    ...item,
    contentType: "album",
    title,
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

function combinedItems(releases, mixes, albums, liveItems = []) {
  const byId = new Map();
  [...releases, ...mixes, ...albums, ...liveItems].forEach(item => {
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
  const cacheKey = new Request(new URL("/api/latest?v=r5", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const [releases, mixes, albums, liveLatest] = await Promise.all([
    fetchReleaseCatalogue(context).catch(() => []),
    fetchMixCatalogue(context),
    fetchAlbumCatalogue(context),
    fetchLiveChannelLatest().catch(() => null)
  ]);

  const items = combinedItems(releases, mixes, albums, liveLatest ? [liveLatest] : []);
  if (!items.length) {
    return jsonResponse({
      source: "latest-unavailable",
      policy: "songs-albums-mixes-no-shorts",
      generatedAt: new Date().toISOString(),
      latest: null,
      releases: [],
      items: []
    }, "no-store", 503);
  }

  const releaseItems = combinedItems(
    releases,
    [],
    [],
    liveLatest?.contentType === "full-release" ? [liveLatest] : []
  ).filter(item => item?.contentType === "full-release");

  const output = jsonResponse({
    source: liveLatest ? "verified-catalogues-plus-public-channel-feed" : "verified-full-length-catalogues",
    policy: "songs-albums-mixes-no-shorts",
    generatedAt: new Date().toISOString(),
    latest: items[0],
    releases: releaseItems.slice(0, 8),
    items: items.slice(0, 12)
  }, "public, max-age=45, s-maxage=90, stale-while-revalidate=300");
  context.waitUntil(cache.put(cacheKey, output.clone()));
  return output;
}
