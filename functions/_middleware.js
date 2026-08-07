import { onRequestGet as serveDancehallCover } from "./mix-cover/dancehall-mashups.js";
import { onRequestGet as serveSummerCover } from "./mix-cover/sound-of-summer.js";
import { onRequestGet as serveAsianCover } from "./mix-cover/asian-collection.js";
import { onRequestGet as serveFullAlbumsCover } from "./mix-cover/full-albums.js";

const CANONICAL_ORIGIN = "https://nextgensessions.com";
const LEGACY_HOSTS = new Set([
  "nextgensessions.pages.dev",
  "www.nextgensessions.com"
]);

const MIX_COVER_HANDLERS = new Map([
  ["/assets/mixes/dancehall-mashups.webp", serveDancehallCover],
  ["/assets/mixes/sound-of-summer.webp", serveSummerCover],
  ["/assets/mixes/asian-collection.webp", serveAsianCover],
  ["/assets/mixes/full-albums.webp", serveFullAlbumsCover]
]);

const MOBILE_NAV_VERSION = "20260806-nav2";
const ANDRE_PORTRAIT_VERSION = "20260806-andre3";

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
    return Response.redirect(destination.toString(), 301);
  }

  if (url.pathname === "/submit.html") {
    url.pathname = "/submit";
    return Response.redirect(url.toString(), 301);
  }

  if (context.request.method === "GET") {
    const mixCoverHandler = MIX_COVER_HANDLERS.get(url.pathname);
    if (mixCoverHandler) return mixCoverHandler(context);
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  const shouldEnhance = context.request.method === "GET" && contentType.includes("text/html");

  if (!shouldEnhance) return response;

  return new HTMLRewriter()
    .on("head", new MobileNavHeadInjector())
    .on("body", new SharedBodyInjector())
    .transform(response);
}
