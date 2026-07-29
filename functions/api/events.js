const ALLOWED_EVENTS = new Set([
  "page_view",
  "youtube_click",
  "release_play",
  "release_click",
  "artist_click",
  "archive_search",
  "archive_filter",
  "artist_search",
  "submission_start",
  "submission_submit",
  "submission_complete"
]);

const ALLOWED_FILTERS = new Set([
  "all",
  "dancehall-reggae",
  "uk-rap-grime",
  "hip-hop",
  "r-b-soul",
  "global-sounds"
]);

function response(status) {
  return new Response(null, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function safeLabel(event, value) {
  const label = String(value || "").trim().slice(0, 64);
  if (event === "page_view") return "";
  if (event === "archive_filter") return ALLOWED_FILTERS.has(label) ? label : "other";
  if (/^(archive_search|artist_search)$/.test(event)) return "started";
  if (/^submission_/.test(event)) return "form";
  return /^[A-Za-z0-9_-]{1,64}$/.test(label) ? label : "unknown";
}

function safePath(value) {
  const path = String(value || "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  try {
    return new URL(path, "https://nextgensessions.invalid").pathname.slice(0, 160) || "/";
  } catch (_) {
    return "/";
  }
}

export async function onRequestPost(context) {
  const requestUrl = new URL(context.request.url);
  const origin = context.request.headers.get("origin");
  const fetchSite = context.request.headers.get("sec-fetch-site");
  const contentLength = Number(context.request.headers.get("content-length") || 0);

  if (origin && origin !== requestUrl.origin) return response(403);
  if (fetchSite === "cross-site") return response(403);
  if (contentLength > 2048) return response(413);

  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return response(400);
  }

  const event = String(body?.event || "").trim();
  if (!ALLOWED_EVENTS.has(event)) return response(400);

  const analytics = context.env?.ANALYTICS;
  if (!analytics || typeof analytics.writeDataPoint !== "function") return response(503);

  const hostname = requestUrl.hostname.slice(0, 120);
  const environment = hostname === "nextgensessions.pages.dev"
    ? "production"
    : (hostname.endsWith(".nextgensessions.pages.dev") ? "preview" : "custom-domain");

  analytics.writeDataPoint({
    indexes: [environment],
    blobs: [
      event,
      safePath(body?.path),
      safeLabel(event, body?.label),
      hostname
    ],
    doubles: [1]
  });

  return response(204);
}

export function onRequestGet() {
  return response(405);
}
