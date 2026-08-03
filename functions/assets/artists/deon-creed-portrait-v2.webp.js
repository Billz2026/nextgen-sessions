export async function onRequest(context) {
  const parts = [];

  for (let index = 0; index < 14; index += 1) {
    const part = String(index).padStart(2, '0');
    const sourceUrl = new URL(`/assets/artists/deon-creed-portrait-v2/part-${part}.txt`, context.request.url);
    const source = await context.env.ASSETS.fetch(sourceUrl);

    if (!source.ok) {
      return new Response(`Portrait asset part ${part} unavailable`, { status: 404 });
    }

    parts.push((await source.text()).trim());
  }

  let decoded;

  try {
    const binary = atob(parts.join(''));
    decoded = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      decoded[index] = binary.charCodeAt(index);
    }
  } catch (_) {
    return new Response('Portrait asset is invalid', { status: 500 });
  }

  return new Response(decoded, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(decoded.byteLength),
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
