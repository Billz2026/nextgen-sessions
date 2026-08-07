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

async function fetchThumbnail(videoId, filename, webp = false) {
  const folder = webp ? "vi_webp" : "vi";
  const response = await fetch(`https://i.ytimg.com/${folder}/${videoId}/${filename}`, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": "NextGenSessionsWebsite/4.0"
    }
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.startsWith("image/")) return null;
  return { response, contentType };
}

export async function onRequestGet(context) {
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
    const candidates = size === "card"
      ? [["mqdefault.webp", true], ["mqdefault.jpg", false]]
      : [["maxresdefault.webp", true], ["maxresdefault.jpg", false], ["hqdefault.webp", true], ["hqdefault.jpg", false]];
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
