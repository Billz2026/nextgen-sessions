const CANONICAL_ORIGIN = "https://nextgensessions.com";
const LEGACY_HOSTS = new Set([
  "nextgensessions.pages.dev",
  "www.nextgensessions.com"
]);

export async function onRequest(context) {
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

  return context.next();
}
