const PLAYLIST_ID = "PL7VCdVWElIJFB9WkCQ4tnDztc17VnbrWA";
const PLAYLIST_FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;

const FALLBACK_LATEST = {
  id: "5YgrpFXZ92Q",
  title: "Rudii Marka – Marked for War",
  published: ""
};

const FALLBACK_RELEASES = [
  FALLBACK_LATEST,
  { id: "w8DSI4HZKnM", title: "Creep With The Wolf" },
  { id: "8YFWjkhWilc", title: "Man Moves Different Now" },
  { id: "Qr1gNggtg8k", title: "Ride On My Enemies" },
  { id: "Zkb80UYO0pY", title: "Money in the Bando" },
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
  const match = String(block || "").match(
    new RegExp(`<${tagPattern}[^>]*>([\\s\\S]*?)<\\/${tagPattern}>`, "i")
  );
  return match ? decodeXml(match[1].trim()) : "";
}

function parseFeed(xml) {
  const entries = String(xml || "").match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  return entries.map(entry => {
    const id = matchTag(entry, "(?:yt:)?videoId");
    return {
      id,
      title: matchTag(entry, "title") || "NextGen Sessions release",
      published: matchTag(entry, "published"),
      updated: matchTag(entry, "updated")
    };
  }).filter(item => /^[A-Za-z0-9_-]{11}$/.test(item.id));
}

function extractChannelId(xml) {
  const match = String(xml || "").match(/<yt:channelId[^>]*>(UC[A-Za-z0-9_-]+)<\/yt:channelId>/i);
  return match ? match[1] : "";
}

function newestFirst(items) {
  return [...items].sort((a, b) => {
    const bTime = Date.parse(b.published || b.updated || "") || 0;
    const aTime = Date.parse(a.published || a.updated || "") || 0;
    return bTime - aTime;
  });
}

function isEligibleLatest(item) {
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

async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": "NextGenSessionsWebsite/2.0"
    }
  });

  if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);
  return response.text();
}

function validOverride(context) {
  const id = String(context.env?.LATEST_VIDEO_ID || "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;

  return {
    id,
    title: String(context.env?.LATEST_VIDEO_TITLE || "Latest NextGen Sessions release").trim(),
    published: String(context.env?.LATEST_VIDEO_PUBLISHED || "").trim()
  };
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
  const cacheKey = new Request(new URL("/api/latest?v=3", context.request.url).toString(), {
    method: "GET"
  });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const playlistXml = await fetchFeed(PLAYLIST_FEED_URL);
    const playlistItems = newestFirst(parseFeed(playlistXml));
    const channelId = extractChannelId(playlistXml);

    let channelItems = [];
    if (channelId) {
      try {
        const channelXml = await fetchFeed(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
        );
        channelItems = newestFirst(parseFeed(channelXml)).filter(isEligibleLatest);
      } catch (channelError) {
        channelItems = [];
      }
    }

    const override = validOverride(context);
    const latest = override || channelItems[0] || playlistItems[0] || FALLBACK_LATEST;
    const releases = playlistItems.length ? playlistItems.slice(0, 8) : FALLBACK_RELEASES;

    const output = jsonResponse(
      {
        source: "youtube",
        latestSource: override ? "override" : (channelItems.length ? "channel" : "playlist"),
        playlistId: PLAYLIST_ID,
        channelId,
        generatedAt: new Date().toISOString(),
        latest,
        releases,
        items: releases
      },
      "public, max-age=120, s-maxage=300, stale-while-revalidate=3600"
    );

    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (error) {
    return jsonResponse(
      {
        source: "fallback",
        latestSource: "fallback",
        generatedAt: new Date().toISOString(),
        latest: FALLBACK_LATEST,
        releases: FALLBACK_RELEASES,
        items: FALLBACK_RELEASES
      },
      "public, max-age=60, s-maxage=120"
    );
  }
}
