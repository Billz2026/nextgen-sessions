const CANONICAL_ORIGIN = "https://nextgensessions.com";
const LEGACY_HOSTS = new Set([
  "nextgensessions.pages.dev",
  "www.nextgensessions.com"
]);

const MOBILE_NAV_VERSION = "20260809-nav3";
const ANDRE_PORTRAIT_VERSION = "20260806-andre3";
const HEADER_LOGO_SRC = "/assets/nextgen-header-wordmark-2026.webp";

export const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://i.ytimg.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src https://www.youtube-nocookie.com",
    "media-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests"
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "SAMEORIGIN"
});

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

class HeaderLogoRewriter {
  element(element) {
    element.setAttribute("src", HEADER_LOGO_SRC);
    element.setAttribute("width", "1600");
    element.setAttribute("height", "663");
  }
}

class MobileNavHeadInjector {
  element(element) {
    element.append(
      `<link rel="stylesheet" href="/mobile-nav.css?v=${MOBILE_NAV_VERSION}">`,
      { html: true }
    );
  }
}

class SharedBodyInjector {
  element(element) {
    element.append(
      `<script src="/mobile-nav.js?v=${MOBILE_NAV_VERSION}" defer></script>` +
      `<script src="/andre-kadeem-portrait.js?v=${ANDRE_PORTRAIT_VERSION}" defer></script>`,
      { html: true }
    );
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  if (LEGACY_HOSTS.has(hostname)) {
    const destination = new URL(url.pathname + url.search, CANONICAL_ORIGIN);
    return withSecurityHeaders(Response.redirect(destination.toString(), 301));
  }

  if (url.pathname === "/submit.html") {
    url.pathname = "/submit";
    return withSecurityHeaders(Response.redirect(url.toString(), 301));
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  const shouldEnhance = context.request.method === "GET" && contentType.includes("text/html");

  if (!shouldEnhance) return withSecurityHeaders(response);

  const enhancedResponse = new HTMLRewriter()
    .on("a.brand img", new HeaderLogoRewriter())
    .on("head", new MobileNavHeadInjector())
    .on("body", new SharedBodyInjector())
    .transform(response);

  return withSecurityHeaders(enhancedResponse);
}
