const CHUNK_PATHS = [
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

function decodeBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function onRequestGet(context) {
  try {
    const responses = await Promise.all(
      CHUNK_PATHS.map(path => fetchStaticAsset(context, path))
    );
    const chunks = await Promise.all(responses.map(response => response.text()));
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
