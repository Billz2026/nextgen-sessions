var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/andre-portrait.js
var CHUNK_PATHS = [
  "/assets/artists/andre-kadeem-portrait/part-1.txt",
  "/assets/artists/andre-kadeem-portrait/part-2.txt",
  "/assets/artists/andre-kadeem-portrait/part-3.txt",
  "/assets/artists/andre-kadeem-portrait/part-4.txt",
  "/assets/artists/andre-kadeem-portrait/part-5.txt"
];
async function fetchStaticAsset(context, path) {
  const url = new URL(path, context.request.url);
  const request = new Request(url.toString(), {
    headers: { Accept: "text/plain" }
  });
  if (context.env?.ASSETS?.fetch) {
    const assetResponse = await context.env.ASSETS.fetch(request);
    if (assetResponse.ok) return assetResponse;
  }
  const networkResponse = await fetch(request);
  if (!networkResponse.ok) {
    throw new Error(`${path} returned ${networkResponse.status}`);
  }
  return networkResponse;
}
__name(fetchStaticAsset, "fetchStaticAsset");
function decodeBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
__name(decodeBase64, "decodeBase64");
async function onRequestGet(context) {
  try {
    const responses = await Promise.all(
      CHUNK_PATHS.map((path) => fetchStaticAsset(context, path))
    );
    const chunks = await Promise.all(responses.map((response2) => response2.text()));
    const base64 = chunks.join("").replace(/\s+/g, "");
    if (!base64.startsWith("UklGR")) {
      throw new Error("Andre Kadeem portrait data is not a valid WebP payload");
    }
    const bytes = decodeBase64(base64);
    return new Response(bytes, {
      headers: {
        "content-type": "image/webp",
        "content-length": String(bytes.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    return new Response("Andre Kadeem portrait unavailable", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }
}
__name(onRequestGet, "onRequestGet");

// api/asif-portrait.js
function onRequestGet2(context) {
  const target = new URL(
    "/assets/artists/asif-sultaan-portrait-final.webp?v=20260805-asif-final1",
    context.request.url
  );
  return new Response(null, {
    status: 302,
    headers: {
      location: target.toString(),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
__name(onRequestGet2, "onRequestGet");

// api/darian-portrait.js
var CHUNK_PATHS2 = [
  "/assets/artists/darian-gayle-portrait/part-1.txt",
  "/assets/artists/darian-gayle-portrait/part-2.txt",
  "/assets/artists/darian-gayle-portrait/part-3.txt",
  "/assets/artists/darian-gayle-portrait/part-4.txt",
  "/assets/artists/darian-gayle-portrait/part-5.txt"
];
async function fetchAsset(context, path) {
  const request = new Request(new URL(path, context.request.url), {
    headers: { Accept: "text/plain" }
  });
  if (context.env?.ASSETS?.fetch) {
    const response3 = await context.env.ASSETS.fetch(request);
    if (response3.ok) return response3;
  }
  const response2 = await fetch(request);
  if (!response2.ok) throw new Error(`${path} returned ${response2.status}`);
  return response2;
}
__name(fetchAsset, "fetchAsset");
function decodeBase642(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
__name(decodeBase642, "decodeBase64");
async function onRequestGet3(context) {
  try {
    const responses = await Promise.all(CHUNK_PATHS2.map((path) => fetchAsset(context, path)));
    const chunks = await Promise.all(responses.map((response2) => response2.text()));
    const base64 = chunks.join("").replace(/\s+/g, "");
    if (!base64.startsWith("UklGR")) {
      throw new Error("Darian Gayle portrait payload is invalid");
    }
    const bytes = decodeBase642(base64);
    return new Response(bytes, {
      headers: {
        "content-type": "image/webp",
        "content-length": String(bytes.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    return new Response("Darian Gayle portrait unavailable", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }
}
__name(onRequestGet3, "onRequestGet");

// api/darian-portrait-final.js
var CHUNK_PATHS3 = [
  "/assets/artists/darian-gayle-final/part-1.txt",
  "/assets/artists/darian-gayle-final/part-2.txt",
  "/assets/artists/darian-gayle-final/part-3.txt"
];
async function fetchAsset2(context, path) {
  const request = new Request(new URL(path, context.request.url), {
    headers: { Accept: "text/plain" }
  });
  if (context.env?.ASSETS?.fetch) {
    const response3 = await context.env.ASSETS.fetch(request);
    if (response3.ok) return response3;
  }
  const response2 = await fetch(request);
  if (!response2.ok) throw new Error(`${path} returned ${response2.status}`);
  return response2;
}
__name(fetchAsset2, "fetchAsset");
function decodeBase643(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
__name(decodeBase643, "decodeBase64");
async function onRequestGet4(context) {
  try {
    const responses = await Promise.all(CHUNK_PATHS3.map((path) => fetchAsset2(context, path)));
    const chunks = await Promise.all(responses.map((response2) => response2.text()));
    const base64 = chunks.join("").replace(/\s+/g, "");
    if (!base64.startsWith("UklGR") || !base64.endsWith("==")) {
      throw new Error("Darian Gayle final portrait payload is invalid");
    }
    const bytes = decodeBase643(base64);
    if (bytes.byteLength !== 17830) {
      throw new Error(`Darian Gayle final portrait has unexpected length ${bytes.byteLength}`);
    }
    return new Response(bytes, {
      headers: {
        "content-type": "image/webp",
        "content-length": String(bytes.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    console.error("Darian Gayle final portrait failed", error);
    return new Response("Darian Gayle portrait unavailable", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }
}
__name(onRequestGet4, "onRequestGet");

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
function onRequestGet5() {
  return response(405);
}
__name(onRequestGet5, "onRequestGet");

// api/latest.js
var FALLBACK_RELEASES = [
  { id: "dV6_GbsHrxI", artist: "Kemarco", title: "Badman Don\u2019t Rush", group: "Dancehall & Reggae", published: "2026-08-05T17:00:07Z", url: "/releases/kemarco-badman-dont-rush/" },
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
__name(jsonResponse, "jsonResponse");
function validRelease(item) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(item?.id || "")) && String(item?.artist || "").trim() && String(item?.title || "").trim();
}
__name(validRelease, "validRelease");
function publishedTimestamp(item) {
  return Date.parse(item?.published || "") || 0;
}
__name(publishedTimestamp, "publishedTimestamp");
function releasedNow(item) {
  const timestamp = publishedTimestamp(item);
  return !timestamp || timestamp <= Date.now();
}
__name(releasedNow, "releasedNow");
async function fetchCatalogue(context) {
  const url = new URL("/releases.json?latest=r2", context.request.url);
  const request = new Request(url.toString(), { headers: { Accept: "application/json" } });
  const response2 = context.env?.ASSETS?.fetch ? await context.env.ASSETS.fetch(request) : await fetch(request);
  if (!response2.ok) throw new Error(`Release catalogue returned ${response2.status}`);
  const payload = await response2.json();
  const releases = Array.isArray(payload?.releases) ? payload.releases : [];
  return releases.filter(validRelease).filter(releasedNow).sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
}
__name(fetchCatalogue, "fetchCatalogue");
async function onRequestGet6(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/latest?v=r2", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const releases = await fetchCatalogue(context);
    if (!releases.length) throw new Error("Release catalogue is empty");
    const output = jsonResponse({
      source: "verified-release-catalogue",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      latest: releases[0],
      releases: releases.slice(0, 8),
      items: releases.slice(0, 8)
    }, "public, max-age=60, s-maxage=120, stale-while-revalidate=600");
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return jsonResponse({
      source: "curated-fallback",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      latest: FALLBACK_RELEASES[0],
      releases: FALLBACK_RELEASES,
      items: FALLBACK_RELEASES
    }, "public, max-age=30, s-maxage=60");
  }
}
__name(onRequestGet6, "onRequestGet");

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
async function fetchThumbnail(videoId, filename, webp = false) {
  const folder = webp ? "vi_webp" : "vi";
  const response2 = await fetch(`https://i.ytimg.com/${folder}/${videoId}/${filename}`, {
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
async function onRequestGet7(context) {
  const requestUrl = new URL(context.request.url);
  const videoId = String(requestUrl.searchParams.get("id") || "").trim();
  const size = requestUrl.searchParams.get("size") === "card" ? "card" : "hero";
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return errorResponse(404, "Release image not found");
  }
  const cache = caches.default;
  const cacheKey = new Request(
    new URL(`/api/release-image?id=${encodeURIComponent(videoId)}&size=${size}&v=2`, context.request.url).toString()
  );
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const candidates = size === "card" ? [["mqdefault.webp", true], ["mqdefault.jpg", false]] : [["maxresdefault.webp", true], ["maxresdefault.jpg", false], ["hqdefault.webp", true], ["hqdefault.jpg", false]];
    let image = null;
    for (const [filename, webp] of candidates) {
      image = await fetchThumbnail(videoId, filename, webp);
      if (image) break;
    }
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
__name(onRequestGet7, "onRequestGet");

// api/releases.js
var FALLBACK_RELEASES2 = [
  { id: "dV6_GbsHrxI", artist: "Kemarco", title: "Badman Don\u2019t Rush", group: "Dancehall & Reggae", published: "2026-08-05T17:00:07Z", url: "/releases/kemarco-badman-dont-rush/" },
  { id: "xicnIGw-ei8", artist: "Alia Bleu", title: "Piggyback", group: "R&B & Soul", published: "2026-08-03T17:00:30Z", url: "/releases/alia-bleu-piggyback/" },
  { id: "Sra1722xEFE", artist: "Renz Cole", title: "Heatwave", group: "UK Rap & Grime", published: "2026-07-31T17:00:33Z", url: "/releases/renz-cole-heatwave/" }
];
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
async function onRequestGet8(context) {
  try {
    const url = new URL("/releases.json?api=r2", context.request.url);
    const request = new Request(url.toString(), { headers: { Accept: "application/json" } });
    const response2 = context.env?.ASSETS?.fetch ? await context.env.ASSETS.fetch(request) : await fetch(request);
    if (!response2.ok) throw new Error(`Release catalogue returned ${response2.status}`);
    const payload = await response2.json();
    return jsonResponse2(payload, "public, max-age=300, s-maxage=600, stale-while-revalidate=3600");
  } catch (_) {
    return jsonResponse2({
      source: "curated-fallback",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      total: FALLBACK_RELEASES2.length,
      releases: FALLBACK_RELEASES2
    }, "public, max-age=60, s-maxage=120");
  }
}
__name(onRequestGet8, "onRequestGet");

// _middleware.js
var CANONICAL_ORIGIN = "https://nextgensessions.com";
var LEGACY_HOSTS = /* @__PURE__ */ new Set([
  "nextgensessions.pages.dev",
  "www.nextgensessions.com"
]);
var MOBILE_NAV_VERSION = "20260806-nav2";
var ANDRE_PORTRAIT_VERSION = "20260806-andre3";
var MobileNavHeadInjector = class {
  static {
    __name(this, "MobileNavHeadInjector");
  }
  element(element) {
    element.append(
      `<link rel="stylesheet" href="/mobile-nav.css?v=${MOBILE_NAV_VERSION}">`,
      { html: true }
    );
  }
};
var SharedBodyInjector = class {
  static {
    __name(this, "SharedBodyInjector");
  }
  element(element) {
    element.append(
      `<script src="/mobile-nav.js?v=${MOBILE_NAV_VERSION}" defer><\/script><script src="/andre-kadeem-portrait.js?v=${ANDRE_PORTRAIT_VERSION}" defer><\/script>`,
      { html: true }
    );
  }
};
async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  if (LEGACY_HOSTS.has(hostname)) {
    const destination = new URL(url.pathname + url.search, CANONICAL_ORIGIN);
    return Response.redirect(destination.toString(), 301);
  }
  if (url.pathname === "/submit.html") {
    url.pathname = "/submit";
    return Response.redirect(url.toString(), 301);
  }
  const response2 = await context.next();
  const contentType = response2.headers.get("content-type") || "";
  const shouldEnhance = context.request.method === "GET" && contentType.includes("text/html");
  if (!shouldEnhance) return response2;
  return new HTMLRewriter().on("head", new MobileNavHeadInjector()).on("body", new SharedBodyInjector()).transform(response2);
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-mB2mp7/functionsRoutes-0.9398717715728057.mjs
var routes = [
  {
    routePath: "/api/andre-portrait",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/asif-portrait",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/darian-portrait",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/darian-portrait-final",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/events",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
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
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/release-image",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/releases",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];

// ../../../../../tmp/ngs-npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
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

// ../../../../../tmp/ngs-npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
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
