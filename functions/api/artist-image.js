const ARTIST_VIDEOS = Object.freeze({
  "renz-cole": "JwFCGCLWw0I",
  reeko: "EbmBjdo8jOI",
  "omari-v": "TnYNLBDlLx8"
});

const IMAGE_VARIANTS = ["maxresdefault.jpg", "hqdefault.jpg"];

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

async function fetchThumbnail(videoId) {
  for (const filename of IMAGE_VARIANTS) {
    const response = await fetch(
      `https://i.ytimg.com/vi/${videoId}/${filename}`,
      {
        headers: {
          Accept: "image/avif,image/webp,image/jpeg,image/*",
          "User-Agent": "NextGenSessionsWebsite/3.0"
        }
      }
    );

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.startsWith("image/")) return response;
  }

  return null;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const artist = String(url.searchParams.get("artist") || "").toLowerCase();
  const videoId = ARTIST_VIDEOS[artist];
  if (!videoId) return errorResponse(404, "Artist image not found.");

  const cache = caches.default;
  const cacheKey = new Request(
    new URL(`/api/artist-image?artist=${encodeURIComponent(artist)}&v=1`, url).toString()
  );
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetchThumbnail(videoId);
    if (!upstream) return errorResponse(502, "Artist image is temporarily unavailable.");

    const headers = new Headers(upstream.headers);
    headers.set(
      "cache-control",
      "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000"
    );
    headers.set("x-content-type-options", "nosniff");
    headers.delete("set-cookie");

    const output = new Response(upstream.body, {
      status: 200,
      headers
    });
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return errorResponse(502, "Artist image is temporarily unavailable.");
  }
}
