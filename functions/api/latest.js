const PLAYLIST_ID = "PL7VCdVWElIJFB9WkCQ4tnDztc17VnbrWA";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;

const FALLBACK_ITEMS = [
  { id: "w8DSI4HZKnM", title: "Creep With The Wolf" },
  { id: "8YFWjkhWilc", title: "Man Moves Different Now" },
  { id: "Qr1gNggtg8k", title: "Ride On My Enemies" },
  { id: "Zkb80UYO0pY", title: "Money in the Bando" },
  { id: "5YgrpFXZ92Q", title: "Marked for War" },
  { id: "ccwwJFDErvg", title: "Bulletproof Mind" }
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
  const match = block.match(new RegExp(`<${tagPattern}[^>]*>([\\s\\S]*?)<\\/${tagPattern}>`, "i"));
  return match ? decodeXml(match[1].trim()) : "";
}

function parseFeed(xml) {
  const entries = String(xml || "").match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  return entries.slice(0, 8).map(entry => {
    const id = matchTag(entry, "(?:yt:)?videoId");
    return {
      id,
      title: matchTag(entry, "title") || "NextGen Sessions release",
      published: matchTag(entry, "published"),
      updated: matchTag(entry, "updated")
    };
  }).filter(item => /^[A-Za-z0-9_-]{11}$/.test(item.id));
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
  const cacheKey = new Request(new URL("/api/latest?v=2", context.request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(FEED_URL, {
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml",
        "User-Agent": "NextGenSessionsWebsite/1.0"
      }
    });

    if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);
    const items = parseFeed(await response.text());
    if (!items.length) throw new Error("YouTube feed returned no releases");

    const output = jsonResponse(
      { source: "youtube", playlistId: PLAYLIST_ID, generatedAt: new Date().toISOString(), items },
      "public, max-age=300, s-maxage=900, stale-while-revalidate=86400"
    );
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (error) {
    return jsonResponse(
      { source: "fallback", generatedAt: new Date().toISOString(), items: FALLBACK_ITEMS },
      "public, max-age=60, s-maxage=300"
    );
  }
}
