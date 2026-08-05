from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LATEST_FUNCTION = r'''const PLAYLIST_ID = "PL7VCdVWElIJFB9WkCQ4tnDztc17VnbrWA";
const CHANNEL_ID = "UCJdBLa1mf6yxk7xaOzSpBjg";
const PLAYLIST_FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;
const CHANNEL_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const FALLBACK_LATEST = {
  id: "uSlZrZJompg",
  title: "Zara Veli – Don’t Call Past 2",
  published: "2026-07-30T12:25:38Z"
};

const FALLBACK_RELEASES = [
  FALLBACK_LATEST,
  { id: "Jsayjeif8WE", title: "Zara Veli – Too Boujee To Beg", published: "2026-07-30T12:25:08Z" },
  { id: "xicnIGw-ei8", title: "Alia Bleu – Piggyback", published: "2026-07-21T12:29:20Z" },
  { id: "Sra1722xEFE", title: "Renz Cole – Heatwave", published: "2026-07-20T15:35:30Z" },
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
      "User-Agent": "NextGenSessionsWebsite/6.0"
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
  url.searchParams.set("latest", "v6");
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
  const cacheKey = new Request(new URL("/api/latest?v=6", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const [channelResult, playlistResult, catalogueResult] = await Promise.allSettled([
      fetchFeed(CHANNEL_FEED_URL),
      fetchFeed(PLAYLIST_FEED_URL),
      fetchCatalogue(context)
    ]);

    const channelItems = channelResult.status === "fulfilled"
      ? newestFirst(parseFeed(channelResult.value)).filter(isOfficialRelease)
      : [];
    const playlistItems = playlistResult.status === "fulfilled"
      ? newestFirst(parseFeed(playlistResult.value)).filter(isOfficialRelease)
      : [];
    const catalogueItems = catalogueResult.status === "fulfilled"
      ? newestFirst(catalogueResult.value)
      : [];

    const releases = newestFirst(uniqueReleases([
      ...channelItems,
      ...playlistItems,
      ...catalogueItems
    ])).slice(0, 8);
    if (!releases.length) throw new Error("All latest-release sources are unavailable");

    const override = validOverride(context);
    const latest = override || releases[0];
    const latestSource = override
      ? "override"
      : channelItems.some(item => item.id === latest.id)
        ? "channel"
        : playlistItems.some(item => item.id === latest.id)
          ? "playlist"
          : "catalogue";
    const releaseSources = [
      channelItems.length ? "channel" : "",
      playlistItems.length ? "playlist" : "",
      catalogueItems.length ? "catalogue" : ""
    ].filter(Boolean);

    const output = jsonResponse({
      source: releaseSources.join("+") || "catalogue",
      latestSource,
      releasesSource: releaseSources.join("+") || "catalogue",
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
'''

SITE_FALLBACK_OLD = '''  const FALLBACK_LATEST = {
    id: "ZON1AsWLrIE",
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
  ];'''

SITE_FALLBACK_NEW = '''  const FALLBACK_LATEST = {
    id: "uSlZrZJompg",
    title: "Zara Veli – Don’t Call Past 2",
    published: "2026-07-30T12:25:38Z"
  };

  const FALLBACK_RELEASES = [
    FALLBACK_LATEST,
    { id: "Jsayjeif8WE", title: "Zara Veli – Too Boujee To Beg", published: "2026-07-30T12:25:08Z" },
    { id: "xicnIGw-ei8", title: "Alia Bleu – Piggyback", published: "2026-07-21T12:29:20Z" },
    { id: "Sra1722xEFE", title: "Renz Cole – Heatwave", published: "2026-07-20T15:35:30Z" },
    { id: "TnYNLBDlLx8", title: "Omari V – When Di Breeze Call", published: "2026-07-17T15:41:27Z" },
    { id: "RvRq-zwGfKc", title: "Voss Carter – Sunshine On The Way Home", published: "2026-07-12T13:41:07Z" }
  ];'''

SITE_FETCH_OLD = '''  fetch("/api/latest", {
    headers: { Accept: "application/json" },
    cache: "no-store"
  })
    .then(response => {
      if (!response.ok) throw new Error("Latest release endpoint unavailable");
      return response.json();
    })
    .then(updateLatest)
    .catch(() => updateLatest({
      source: "fallback",
      latestSource: "fallback",
      latest: FALLBACK_LATEST,
      releases: FALLBACK_RELEASES
    }));'''

SITE_FETCH_NEW = '''  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  }

  function normaliseHomepageRelease(release) {
    const id = safeVideoId(release?.id);
    if (!id) return null;
    const artist = String(release?.artist || "").trim();
    const releaseTitle = String(release?.title || "").trim();
    const title = artist && releaseTitle
      ? `${artist} – ${releaseTitle}`
      : (releaseTitle || "Latest NextGen Sessions release");
    return {
      id,
      title,
      published: String(release?.published || release?.updated || "").trim()
    };
  }

  function releaseTimestamp(release) {
    return Date.parse(release?.published || "") || 0;
  }

  function uniqueHomepageReleases(releases) {
    const seen = new Set();
    return releases.filter(release => {
      if (!release?.id || seen.has(release.id)) return false;
      seen.add(release.id);
      return true;
    });
  }

  function payloadReleases(payload) {
    const items = Array.isArray(payload?.releases) && payload.releases.length
      ? payload.releases
      : (Array.isArray(payload?.items) ? payload.items : []);
    return items.map(normaliseHomepageRelease).filter(Boolean);
  }

  function buildHomepagePayload(apiPayload, cataloguePayload) {
    const apiReleases = payloadReleases(apiPayload);
    const catalogueReleases = payloadReleases(cataloguePayload);
    const releases = uniqueHomepageReleases([
      ...apiReleases,
      ...catalogueReleases,
      ...FALLBACK_RELEASES.map(normaliseHomepageRelease).filter(Boolean)
    ]).sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a));

    const apiLatest = normaliseHomepageRelease(apiPayload?.latest);
    const catalogueLatest = catalogueReleases[0] || null;
    const latest = apiPayload?.latestSource === "override" && apiLatest
      ? apiLatest
      : [apiLatest, catalogueLatest, ...releases]
        .filter(Boolean)
        .sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a))[0] || FALLBACK_LATEST;

    return { latest, releases };
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  Promise.allSettled([
    fetchJson("/api/latest?v=6"),
    fetchJson("/releases.json?homepage=20260805")
  ]).then(results => {
    const apiPayload = results[0].status === "fulfilled" ? results[0].value : null;
    const cataloguePayload = results[1].status === "fulfilled" ? results[1].value : null;
    updateLatest(buildHomepagePayload(apiPayload, cataloguePayload));
  }).catch(() => updateLatest({
    latest: FALLBACK_LATEST,
    releases: FALLBACK_RELEASES
  }));'''


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def main() -> None:
    (ROOT / "functions/api/latest.js").write_text(LATEST_FUNCTION, encoding="utf-8")

    site = ROOT / "site.js"
    replace_once(site, SITE_FALLBACK_OLD, SITE_FALLBACK_NEW)
    replace_once(site, SITE_FETCH_OLD, SITE_FETCH_NEW)

    index = ROOT / "index.html"
    html = index.read_text(encoding="utf-8")
    html = html.replace("ZON1AsWLrIE", "uSlZrZJompg")
    html = html.replace("Rudii Marka – Marked for War", "Zara Veli – Don’t Call Past 2")
    html = html.replace("Marked for War thumbnail", "Don’t Call Past 2 thumbnail")
    html = html.replace("<h3>Marked for War</h3>", "<h3>Don’t Call Past 2</h3>")
    html = html.replace('<script src="/site.js" defer></script>', '<script src="/site.js?v=20260805-latest1" defer></script>')
    index.write_text(html, encoding="utf-8")

    profiles = ROOT / "artist-profiles.js"
    profile_text = profiles.read_text(encoding="utf-8")
    updated, count = re.subn(
        r'("alonzo-ray"\s*:\s*\{.*?"imagePosition"\s*:\s*")50% 8%("[^}]*?"featuredVideo")',
        r'\g<1>50% 0%\g<2>',
        profile_text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("Could not update Alonzo imagePosition")
    profiles.write_text(updated, encoding="utf-8")

    alonzo = ROOT / "artists/alonzo-ray/index.html"
    alonzo_text = alonzo.read_text(encoding="utf-8")
    alonzo_text = alonzo_text.replace("20260804-alonzo2", "20260805-alonzo3")
    alonzo.write_text(alonzo_text, encoding="utf-8")

    required = {
        ROOT / "functions/api/latest.js": ["fetchCatalogue(context)", 'latestSource = override', 'latest?v=6'],
        ROOT / "site.js": ["buildHomepagePayload", '/releases.json?homepage=20260805', "uSlZrZJompg"],
        ROOT / "index.html": ["Zara Veli – Don’t Call Past 2", "site.js?v=20260805-latest1"],
        ROOT / "artist-profiles.js": ['"imagePosition": "50% 0%"'],
        ROOT / "artists/alonzo-ray/index.html": ["20260805-alonzo3"],
    }
    for path, needles in required.items():
        body = path.read_text(encoding="utf-8")
        for needle in needles:
            if needle not in body:
                raise RuntimeError(f"Missing {needle!r} in {path}")


if __name__ == "__main__":
    main()
