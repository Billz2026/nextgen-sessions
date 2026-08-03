const EXPECTED_BYTES = 20048;

function isWebP(bytes) {
  return bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

export async function onRequest(context) {
  const parts = [];
  const fetchAsset = context.env?.ASSETS?.fetch
    ? request => context.env.ASSETS.fetch(request)
    : request => fetch(request);

  for (let index = 0; index < 14; index += 1) {
    const part = String(index).padStart(2, '0');
    const sourceUrl = new URL(`/assets/artists/deon-creed-portrait-v2/part-${part}.txt`, context.request.url);
    const source = await fetchAsset(sourceUrl);

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

  if (decoded.byteLength !== EXPECTED_BYTES || !isWebP(decoded)) {
    return new Response('Portrait asset failed integrity validation', { status: 500 });
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
