const PLAYLIST_ID = "PL7VCdVWElIJFB9WkCQ4tnDztc17VnbrWA";
const CHANNEL_ID = "UCJdBLa1mf6yxk7xaOzSpBjg";
const CHANNEL_VIDEOS_URL = "https://www.youtube.com/@NextGenSessions/videos";
const PLAYLIST_FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;
const CHANNEL_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const FALLBACK_LATEST = {
  id: "xicnIGw-ei8",
  title: "Alia Bleu – Piggyback",
  published: "2026-08-03T17:00:30+00:00"
};

const FALLBACK_RELEASES = [
  FALLBACK_LATEST,
  { id: "Sra1722xEFE", title: "Renz Cole – Heatwave", published: "2026-07-31T17:00:33+00:00" },
  { id: "6H6yq_1bEsQ", title: "Reeko – After Di Party", published: "2026-07-29T17:00:35+00:00" },
  { id: "ZSjRD_3B5uk", title: "Deon Creed – Days Like These", published: "2026-07-27T17:00:05+00:00" },
  { id: "TnYNLBDlLx8", title: "Omari V – When Di Breeze Call", published: "2026-07-17T15:41:27Z" },
  { id: "RvRq-zwGfKc", title: "Voss Carter – Sunshine On The Way Home", published: "2026-07-12T13:41:07Z" }
];

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
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

function newestFirst(items) {
  return [...items].sort((a, b) =>
    (Date.parse(b.published || b.updated || "") || 0) -
    (Date.parse(a.published || a.updated || "") || 0)
  );
}

function isOfficialRelease(item) {
  const title = String(item?.title || "").toLowerCase();
  if (!title) return false;
  return ![
    /\bshorts?\b/, /#shorts/, /\bteaser\b/, /\btrailer\b/, /\bpromo\b/,
    /\bpreview\b/, /\bcoming soon\b/, /\bout tomorrow\b/, /\bout tonight\b/
  ].some(pattern => pattern.test(title));
}

function uniqueReleases(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": "NextGenSessionsWebsite/7.0"
    }
  });
  if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);
  return response.text();
}

function normaliseCatalogueItem(item) {
  const id = String(item?.id || "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const artist = String(item?.artist || "").trim();
  const releaseTitle = String(item?.title || "").trim();
  if (!releaseTitle) return null;
  return {
    id,
    title: artist ? `${artist} – ${releaseTitle}` : releaseTitle,
    artist,
    releaseTitle,
    group: String(item?.group || "Official release").trim(),
    published: String(item?.published || "").trim(),
    updated: ""
  };
}

async function fetchCatalogue(context) {
  const url = new URL("/releases.json", context.request.url);
  url.searchParams.set("latest", "v7");
  const request = new Request(url.toString(), {
    headers: { Accept: "application/json" }
  });
  const response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(request)
    : await fetch(request);
  if (!response.ok) throw new Error(`Release catalogue returned ${response.status}`);
  const payload = await response.json();
  const releases = Array.isArray(payload?.releases) ? payload.releases : [];
  return releases.map(normaliseCatalogueItem).filter(Boolean);
}

function enrichWithCatalogue(items, catalogueItems) {
  const catalogueById = new Map(catalogueItems.map(item => [item.id, item]));
  return items.map(item => {
    const catalogue = catalogueById.get(item.id);
    return catalogue
      ? { ...catalogue, ...item, title: catalogue.title }
      : item;
  });
}

function extractChannelVideoIds(html) {
  const matches = String(html || "").matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g);
  const ids = [];
  const seen = new Set();
  for (const match of matches) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= 20) break;
  }
  return ids;
}

async function fetchOEmbedTitle(id) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`YouTube oEmbed returned ${response.status}`);
  const payload = await response.json();
  return String(payload?.title || "").trim();
}

async function fetchChannelPage(catalogueItems) {
  const response = await fetch(CHANNEL_VIDEOS_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36"
    }
  });
  if (!response.ok) throw new Error(`YouTube channel page returned ${response.status}`);
  const ids = extractChannelVideoIds(await response.text());
  if (!ids.length) throw new Error("No public channel videos found");

  const catalogueById = new Map(catalogueItems.map(item => [item.id, item]));
  const releases = [];
  for (const id of ids) {
    let release = catalogueById.get(id) || null;
    if (!release) {
      try {
        const title = await fetchOEmbedTitle(id);
        release = title ? { id, title, published: "", updated: "" } : null;
      } catch (_) {
        release = null;
      }
    }
    if (release && isOfficialRelease(release)) releases.push(release);
    if (releases.length >= 8) break;
  }
  return releases;
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
  const cacheKey = new Request(new URL("/api/latest?v=7", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const [channelResult, playlistResult, catalogueResult] = await Promise.allSettled([
      fetchFeed(CHANNEL_FEED_URL),
      fetchFeed(PLAYLIST_FEED_URL),
      fetchCatalogue(context)
    ]);

    const catalogueItems = catalogueResult.status === "fulfilled"
      ? newestFirst(catalogueResult.value)
      : [];
    const channelItems = channelResult.status === "fulfilled"
      ? enrichWithCatalogue(newestFirst(parseFeed(channelResult.value)).filter(isOfficialRelease), catalogueItems)
      : [];
    const playlistItems = playlistResult.status === "fulfilled"
      ? enrichWithCatalogue(newestFirst(parseFeed(playlistResult.value)).filter(isOfficialRelease), catalogueItems)
      : [];

    let channelPageItems = [];
    if (!channelItems.length) {
      try {
        channelPageItems = await fetchChannelPage(catalogueItems);
      } catch (_) {
        channelPageItems = [];
      }
    }

    const primaryItems = channelItems.length
      ? channelItems
      : channelPageItems.length
        ? channelPageItems
        : playlistItems.length
          ? playlistItems
          : catalogueItems;
    const releases = uniqueReleases([
      ...primaryItems,
      ...catalogueItems,
      ...playlistItems
    ]).slice(0, 8);
    if (!releases.length) throw new Error("All latest-release sources are unavailable");

    const override = validOverride(context);
    const latest = override || primaryItems[0] || releases[0];
    const latestSource = override
      ? "override"
      : channelItems.length
        ? "channel"
        : channelPageItems.length
          ? "channel-page"
          : playlistItems.length
            ? "playlist"
            : "catalogue";
    const releaseSources = [
      channelItems.length ? "channel" : "",
      channelPageItems.length ? "channel-page" : "",
      playlistItems.length ? "playlist" : "",
      catalogueItems.length ? "catalogue" : ""
    ].filter(Boolean);

    const output = jsonResponse({
      source: releaseSources.join("+") || "fallback",
      latestSource,
      releasesSource: releaseSources.join("+") || "fallback",
      playlistId: PLAYLIST_ID,
      channelId: CHANNEL_ID,
      generatedAt: new Date().toISOString(),
      latest,
      releases,
      items: releases
    }, "public, max-age=60, s-maxage=120, stale-while-revalidate=600");

    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return jsonResponse({
      source: "fallback",
      latestSource: "fallback",
      releasesSource: "fallback",
      playlistId: PLAYLIST_ID,
      channelId: CHANNEL_ID,
      generatedAt: new Date().toISOString(),
      latest: FALLBACK_LATEST,
      releases: FALLBACK_RELEASES,
      items: FALLBACK_RELEASES
    }, "public, max-age=30, s-maxage=60");
  }
}
