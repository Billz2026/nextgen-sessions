export function onRequestGet(context) {
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
