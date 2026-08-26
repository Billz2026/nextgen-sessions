import {
  dashboardConfigured,
  dashboardKeyMatches,
  issueDashboardSession,
} from "../_lib/dashboard-auth.js";
import { json } from "../_lib/analytics.js";

function sameOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin && origin !== url.origin) return false;
  return fetchSite !== "cross-site";
}

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ ok: false }, 403);
  if (!dashboardConfigured(context.env)) {
    return json({ ok: false, error: "dashboard-not-configured" }, 503);
  }

  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return json({ ok: false }, 400);
  }

  if (!dashboardKeyMatches(context.env, body?.key)) {
    return json({ ok: false, error: "invalid-key" }, 401);
  }

  const cookie = await issueDashboardSession(context.env);
  return json(
    { ok: true },
    200,
    { "set-cookie": cookie },
  );
}

export function onRequestGet() {
  return json({ ok: false }, 405);
}
