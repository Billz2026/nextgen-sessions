const PLAYLIST_ID = "PL7VCdVWElIJFB9WkCQ4tnDztc17VnbrWA";
const PLAYLIST_FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;
const CHANNEL_ID = "UCJdBLa1mf6yxk7xaOzSpBjg";
const CHANNEL_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const FALLBACK_RELEASES = [
  { id: "ZON1AsWLrIE", title: "Rudii Marka - Marked for War", published: "" },
  { id: "zrnWeU7KRS0", title: "Mizzy G - Corner To Crown", published: "" },
  { id: "U6lh9buVYHg", title: "Reeko - Smile Wid Knife", published: "" },
  { id: "oc7Cryy5xTM", title: "Reeko - Nuff Man A Watch", published: "" },
  { id: "JwFCGCLWw0I", title: "Renz Cole - Outside Till Late", published: "" },
  { id: "s0ZS2HJjw2M", title: "Renz Cole - False Nine", published: "" },
  { id: "yU4fK6aSqEg", title: "Renz Cole - Playmaker", published: "" },
  { id: "Xj806cr_eS4", title: "Jay Starks - Queens in My Soul", published: "" },
  { id: "ESEyLheoF9Q", title: "Kastro - Urban Reign", published: "" },
  { id: "ZR6vqKxmngw", title: "Kemar Ranka - Top Ranka", published: "" },
  { id: "VwLzUxVabSQ", title: "Reeko - Mi Call Di Shots", published: "" }
];

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function matchTag(block, tagPattern) {
  const match = String(block || "").match(
    new RegExp(`<${tagPattern}[^>]*>([\\s\\S]*?)<\\/${tagPattern}>`, "i")
  );
  return match ? decodeXml(match[1].trim()) : "";
}

function parseFeed(xml) {
  const entries = String(xml || "").match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  return entries.map(entry => ({
    id: matchTag(entry, "(?:yt:)?videoId"),
    title: matchTag(entry, "title") || "NextGen Sessions release",
    published: matchTag(entry, "published"),
    updated: matchTag(entry, "updated")
  })).filter(item => /^[A-Za-z0-9_-]{11}$/.test(item.id));
}

function isFullRelease(item) {
  const title = String(item?.title || "").toLowerCase();
  if (!title) return false;
  return ![
    /\bshorts?\b/,
    /#shorts/,
    /\bteaser\b/,
    /\btrailer\b/,
    /\bpromo\b/,
    /\bpreview\b/,
    /\bcoming soon\b/,
    /\bout tomorrow\b/,
    /\bout tonight\b/
  ].some(pattern => pattern.test(title));
}

function newestFirst(items) {
  return [...items].sort((a, b) =>
    (Date.parse(b.published || b.updated || "") || 0) -
    (Date.parse(a.published || a.updated || "") || 0)
  );
}

function uniqueReleases(items) {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": "NextGenSessionsWebsite/4.0"
    }
  });
  if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);
  return response.text();
}

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
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/releases?v=1", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const [playlistResult, channelResult] = await Promise.allSettled([
      fetchFeed(PLAYLIST_FEED_URL),
      fetchFeed(CHANNEL_FEED_URL)
    ]);
    const playlistItems = playlistResult.status === "fulfilled" ? parseFeed(playlistResult.value) : [];
    const channelItems = channelResult.status === "fulfilled" ? parseFeed(channelResult.value) : [];
    const liveItems = [...playlistItems, ...channelItems].filter(isFullRelease);
    if (!liveItems.length) throw new Error("Official release feeds unavailable");

    const releases = newestFirst(uniqueReleases([
      ...liveItems,
      ...FALLBACK_RELEASES
    ]))
      .filter(isFullRelease)
      .slice(0, 25);

    const output = jsonResponse({
      source: "official-catalogue",
      playlistId: PLAYLIST_ID,
      channelId: CHANNEL_ID,
      generatedAt: new Date().toISOString(),
      total: releases.length,
      releases
    }, "public, max-age=300, s-maxage=600, stale-while-revalidate=3600");
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return jsonResponse({
      source: "curated-fallback",
      playlistId: PLAYLIST_ID,
      generatedAt: new Date().toISOString(),
      total: FALLBACK_RELEASES.length,
      releases: FALLBACK_RELEASES
    }, "public, max-age=120, s-maxage=300");
  }
}
