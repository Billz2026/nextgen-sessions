const CHUNK_PATHS = [
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
    const response = await context.env.ASSETS.fetch(request);
    if (response.ok) return response;
  }

  const response = await fetch(request);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response;
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function onRequestGet(context) {
  try {
    const responses = await Promise.all(CHUNK_PATHS.map(path => fetchAsset(context, path)));
    const chunks = await Promise.all(responses.map(response => response.text()));
    const base64 = chunks.join("").replace(/\s+/g, "");

    if (!base64.startsWith("UklGR")) {
      throw new Error("Darian Gayle portrait payload is invalid");
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
