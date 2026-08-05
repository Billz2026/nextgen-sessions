const PARTS = [
  "/assets/artists/asif-parts/part-01.txt",
  "/assets/artists/asif-parts/part-02.txt",
  "/assets/artists/asif-parts/part-03.txt",
  "/assets/artists/asif-parts/part-04.txt",
  "/assets/artists/asif-parts/part-05.txt",
  "/assets/artists/asif-parts/part-06.txt",
  "/assets/artists/asif-parts/part-07.txt"
];

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

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function isWebP(bytes) {
  return bytes.length > 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

async function loadPart(context, path) {
  const assetUrl = new URL(path, context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString()));
  if (!response.ok) throw new Error(`Missing portrait source: ${path}`);
  return response.text();
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/asif-portrait?v=2", context.request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const parts = await Promise.all(PARTS.map(path => loadPart(context, path)));
    const encoded = (`U${parts.join("")}`).replace(/\s+/g, "");
    const bytes = decodeBase64(encoded);
    if (!isWebP(bytes)) return errorResponse(500, "Portrait asset is invalid");

    const output = new Response(bytes, {
      headers: {
        "content-type": "image/webp",
        "content-length": String(bytes.byteLength),
        "cache-control": "public, max-age=86400, s-maxage=31536000, immutable",
        "x-content-type-options": "nosniff"
      }
    });
    context.waitUntil(cache.put(cacheKey, output.clone()));
    return output;
  } catch (_) {
    return errorResponse(500, "Portrait asset unavailable");
  }
}
