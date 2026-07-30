var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/events.js
var ALLOWED_EVENTS = /* @__PURE__ */ new Set([
  "page_view",
  "youtube_click",
  "release_play",
  "release_click",
  "artist_click",
  "archive_search",
  "archive_filter",
  "artist_search",
  "submission_start",
  "submission_submit",
  "submission_complete"
]);
var ALLOWED_FILTERS = /* @__PURE__ */ new Set([
  "all",
  "dancehall-reggae",
  "uk-rap-grime",
  "hip-hop",
  "r-b-soul",
  "global-sounds"
]);
function response(status) {
  return new Response(null, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
__name(response, "response");
function safeLabel(event, value) {
  const label = String(value || "").trim().slice(0, 64);
  if (event === "page_view") return "";
  if (event === "archive_filter") return ALLOWED_FILTERS.has(label) ? label : "other";
  if (/^(archive_search|artist_search)$/.test(event)) return "started";
  if (/^submission_/.test(event)) return "form";
  return /^[A-Za-z0-9_-]{1,64}$/.test(label) ? label : "unknown";
}
__name(safeLabel, "safeLabel");
function safePath(value) {
  const path = String(value || "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  try {
    return new URL(path, "https://nextgensessions.invalid").pathname.slice(0, 160) || "/";
  } catch (_) {
    return "/";
  }
}
__name(safePath, "safePath");
async function onRequestPost(context) {
  const requestUrl = new URL(context.request.url);
  const origin = context.request.headers.get("origin");
  const fetchSite = context.request.headers.get("sec-fetch-site");
  const contentLength = Number(context.request.headers.get("content-length") || 0);
  if (origin && origin !== requestUrl.origin) return response(403);
  if (fetchSite === "cross-site") return response(403);
  if (contentLength > 2048) return response(413);
  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return response(400);
  }
  const event = String(body?.event || "").trim();
  if (!ALLOWED_EVENTS.has(event)) return response(400);
  const analytics = context.env?.ANALYTICS;
  if (!analytics || typeof analytics.writeDataPoint !== "function") return response(503);
  const hostname = requestUrl.hostname.slice(0, 120);
  const environment = hostname.includes("nextgen-sessions-staging") ? "staging" : hostname === "nextgensessions.pages.dev" ? "production" : hostname.endsWith(".nextgensessions.pages.dev") ? "preview" : "custom-domain";
  analytics.writeDataPoint({
    indexes: [environment],
    blobs: [
      event,
      safePath(body?.path),
      safeLabel(event, body?.label),
      hostname
    ],
    doubles: [1]
  });
  return response(204);
}
__name(onRequestPost, "onRequestPost");
function onRequestGet() {
  return response(405);
}
__name(onRequestGet, "onRequestGet");

// api/latest.js
var PLAYLIST_ID = "PL7VCdVWElIJFB9WkCQ4tnDztc17VnbrWA";
var PLAYLIST_FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;
var FALLBACK_LATEST = {
  id: "5YgrpFXZ92Q",
  title: "Rudii Marka \u2013 Marked for War",
  published: ""
};
var FALLBACK_RELEASES = [
  FALLBACK_LATEST,
  { id: "w8DSI4HZKnM", title: "Creep With The Wolf" },
  { id: "8YFWjkhWilc", title: "Man Moves Different Now" },
  { id: "Qr1gNggtg8k", title: "Ride On My Enemies" },
  { id: "Zkb80UYO0pY", title: "Money in the Bando" },
  { id: "ccwwJFDErvg", title: "Bulletproof Mind" }
];
function decodeXml(value) {
  return String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
__name(decodeXml, "decodeXml");
function matchTag(block, tagPattern) {
  const match2 = String(block || "").match(
    new RegExp(`<${tagPattern}[^>]*>([\\s\\S]*?)<\\/${tagPattern}>`, "i")
  );
  return match2 ? decodeXml(match2[1].trim()) : "";
}
__name(matchTag, "matchTag");
function parseFeed(xml) {
  const entries = String(xml || "").match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  return entries.map((entry) => ({
    id: matchTag(entry, "(?:yt:)?videoId"),
    title: matchTag(entry, "title") || "NextGen Sessions release",
    published: matchTag(entry, "published"),
    updated: matchTag(entry, "updated")
  })).filter((item) => /^[A-Za-z0-9_-]{11}$/.test(item.id));
}
__name(parseFeed, "parseFeed");
function extractChannelId(xml) {
  const match2 = String(xml || "").match(/<yt:channelId[^>]*>(UC[A-Za-z0-9_-]+)<\/yt:channelId>/i);
  return match2 ? match2[1] : "";
}
__name(extractChannelId, "extractChannelId");
function newestFirst(items) {
  return [...items].sort(
    (a, b) => (Date.parse(b.published || b.updated || "") || 0) - (Date.parse(a.published || a.updated || "") || 0)
  );
}
__name(newestFirst, "newestFirst");
function isOfficialRelease(item) {
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
  ].some((pattern) => pattern.test(title));
}
__name(isOfficialRelease, "isOfficialRelease");
async function fetchFeed(url) {
  const response2 = await fetch(url, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": "NextGenSessionsWebsite/3.0"
    }
  });
  if (!response2.ok) throw new Error(`YouTube feed returned ${response2.status}`);
  return response2.text();
}
__name(fetchFeed, "fetchFeed");
function validOverride(context) {
  const id = String(context.env?.LATEST_VIDEO_ID || "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return {
    id,
    title: String(context.env?.LATEST_VIDEO_TITLE || "Latest NextGen Sessions release").trim(),
    published: String(context.env?.LATEST_VIDEO_PUBLISHED || "").trim()
  };
}
__name(validOverride, "validOverride");
function jsonResponse(payload, cacheControl) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff"
    }
  });
}
__name(jsonResponse, "jsonResponse");
async function onRequestGet2(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/latest?v=4", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const playlistXml = await fetchFeed(PLAYLIST_FEED_URL);
    const playlistItems = newestFirst(parseFeed(playlistXml)).filter(isOfficialRelease);
    const channelId = extractChannelId(playlistXml);
    let channelItems = [];
    if (channelId) {
      try {
        const channelXml = await fetchFeed(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
        );
        channelItems = newestFirst(parseFeed(channelXml)).filter(isOfficialRelease);
      } catch (_) {
        channelItems = [];
      }
    }
    const override = validOverride(context);
    const releases = channelItems.length ? channelItems.slice(0, 8) : playlistItems.length ? playlistItems.slice(0, 8) : FALLBACK_RELEASES;
    const latest = override || releases[0] || FALLBACK_LATEST;
    const output = jsonResponse({
      source: "youtube",
      latestSource: override ? "override" : channelItems.length ? "channel" : "playlist",
      releasesSource: channelItems.length ? "channel" : "playlist",
      playlistId: PLAYLIST_ID,
      channelId,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      latest,
      releases,
      items: releases
    }, "public, max-age=120, s-maxage=300, stale-while-revalidate=3600");
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return jsonResponse({
      source: "fallback",
      latestSource: "fallback",
      releasesSource: "fallback",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      latest: FALLBACK_LATEST,
      releases: FALLBACK_RELEASES,
      items: FALLBACK_RELEASES
    }, "public, max-age=60, s-maxage=120");
  }
}
__name(onRequestGet2, "onRequestGet");

// api/release-image.js
function errorResponse(status, message) {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
__name(errorResponse, "errorResponse");
async function fetchThumbnail(videoId, filename) {
  const response2 = await fetch(`https://i.ytimg.com/vi/${videoId}/${filename}`, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": "NextGenSessionsWebsite/4.0"
    }
  });
  const contentType = response2.headers.get("content-type") || "";
  if (!response2.ok || !contentType.startsWith("image/")) return null;
  return { response: response2, contentType };
}
__name(fetchThumbnail, "fetchThumbnail");
async function onRequestGet3(context) {
  const requestUrl = new URL(context.request.url);
  const videoId = String(requestUrl.searchParams.get("id") || "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return errorResponse(404, "Release image not found");
  }
  const cache = caches.default;
  const cacheKey = new Request(
    new URL(`/api/release-image?id=${encodeURIComponent(videoId)}&v=1`, context.request.url).toString()
  );
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const image = await fetchThumbnail(videoId, "maxresdefault.jpg") || await fetchThumbnail(videoId, "hqdefault.jpg");
    if (!image) return errorResponse(404, "Release image not found");
    const output = new Response(image.response.body, {
      headers: {
        "content-type": image.contentType,
        "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "x-content-type-options": "nosniff"
      }
    });
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return errorResponse(502, "Release image unavailable");
  }
}
__name(onRequestGet3, "onRequestGet");

// api/releases.js
var PLAYLIST_ID2 = "PL7VCdVWElIJFB9WkCQ4tnDztc17VnbrWA";
var PLAYLIST_FEED_URL2 = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID2}`;
var CHANNEL_ID = "UCJdBLa1mf6yxk7xaOzSpBjg";
var CHANNEL_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
var FALLBACK_RELEASES2 = [
  { id: "5YgrpFXZ92Q", title: "Rudii Marka - Marked for War", published: "" },
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
function decodeXml2(value) {
  return String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
__name(decodeXml2, "decodeXml");
function matchTag2(block, tagPattern) {
  const match2 = String(block || "").match(
    new RegExp(`<${tagPattern}[^>]*>([\\s\\S]*?)<\\/${tagPattern}>`, "i")
  );
  return match2 ? decodeXml2(match2[1].trim()) : "";
}
__name(matchTag2, "matchTag");
function parseFeed2(xml) {
  const entries = String(xml || "").match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  return entries.map((entry) => ({
    id: matchTag2(entry, "(?:yt:)?videoId"),
    title: matchTag2(entry, "title") || "NextGen Sessions release",
    published: matchTag2(entry, "published"),
    updated: matchTag2(entry, "updated")
  })).filter((item) => /^[A-Za-z0-9_-]{11}$/.test(item.id));
}
__name(parseFeed2, "parseFeed");
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
  ].some((pattern) => pattern.test(title));
}
__name(isFullRelease, "isFullRelease");
function newestFirst2(items) {
  return [...items].sort(
    (a, b) => (Date.parse(b.published || b.updated || "") || 0) - (Date.parse(a.published || a.updated || "") || 0)
  );
}
__name(newestFirst2, "newestFirst");
function uniqueReleases(items) {
  const seen = /* @__PURE__ */ new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
__name(uniqueReleases, "uniqueReleases");
async function fetchFeed2(url) {
  const response2 = await fetch(url, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": "NextGenSessionsWebsite/4.0"
    }
  });
  if (!response2.ok) throw new Error(`YouTube feed returned ${response2.status}`);
  return response2.text();
}
__name(fetchFeed2, "fetchFeed");
function jsonResponse2(payload, cacheControl) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff"
    }
  });
}
__name(jsonResponse2, "jsonResponse");
async function onRequestGet4(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/releases?v=1", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const [playlistResult, channelResult] = await Promise.allSettled([
      fetchFeed2(PLAYLIST_FEED_URL2),
      fetchFeed2(CHANNEL_FEED_URL)
    ]);
    const playlistItems = playlistResult.status === "fulfilled" ? parseFeed2(playlistResult.value) : [];
    const channelItems = channelResult.status === "fulfilled" ? parseFeed2(channelResult.value) : [];
    const liveItems = [...playlistItems, ...channelItems].filter(isFullRelease);
    if (!liveItems.length) throw new Error("Official release feeds unavailable");
    const releases = newestFirst2(uniqueReleases([
      ...liveItems,
      ...FALLBACK_RELEASES2
    ])).filter(isFullRelease).slice(0, 25);
    const output = jsonResponse2({
      source: "official-catalogue",
      playlistId: PLAYLIST_ID2,
      channelId: CHANNEL_ID,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      total: releases.length,
      releases
    }, "public, max-age=300, s-maxage=600, stale-while-revalidate=3600");
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return jsonResponse2({
      source: "curated-fallback",
      playlistId: PLAYLIST_ID2,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      total: FALLBACK_RELEASES2.length,
      releases: FALLBACK_RELEASES2
    }, "public, max-age=120, s-maxage=300");
  }
}
__name(onRequestGet4, "onRequestGet");

// ../.wrangler/tmp/pages-h2x7Pn/functionsRoutes-0.325416197283807.mjs
var routes = [
  {
    routePath: "/api/events",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/events",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/latest",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/release-image",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/releases",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  }
];

// ../../../../../tmp/ngs-npm-cache/_npx/a0592654bef13561/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../tmp/ngs-npm-cache/_npx/a0592654bef13561/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response2 = await handler(context);
        if (!(response2 instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response2);
      } else if ("ASSETS") {
        const response2 = await env["ASSETS"].fetch(request);
        return cloneResponse(response2);
      } else {
        const response2 = await fetch(request);
        return cloneResponse(response2);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response2 = await env["ASSETS"].fetch(request);
        return cloneResponse(response2);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response2) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response2.status) ? null : response2.body,
    response2
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
