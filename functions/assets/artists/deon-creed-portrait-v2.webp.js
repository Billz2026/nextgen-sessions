export async function onRequest(context) {
  const sourceUrl = new URL('/assets/artists/deon-creed-portrait-v2.webp.b64', context.request.url);
  const source = await context.env.ASSETS.fetch(sourceUrl);

  if (!source.ok) {
    return new Response('Portrait asset unavailable', { status: 404 });
  }

  const encoded = (await source.text()).trim();
  let decoded;

  try {
    const binary = atob(encoded);
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
