const DATASET = "nextgensessions_analytics";
const RANGE_DAYS = Object.freeze({ "1d": 1, "7d": 7, "30d": 30 });

export function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function rangeDays(value) {
  const key = String(value || "7d").toLowerCase();
  return RANGE_DAYS[key] || RANGE_DAYS["7d"];
}

export function analyticsConfiguration(env) {
  const accountId = String(env?.CF_ACCOUNT_ID || "").trim();
  const token = String(env?.CF_ANALYTICS_READ_TOKEN || "").trim();
  return {
    accountId,
    token,
    ready: /^[a-f0-9]{32}$/i.test(accountId) && token.length >= 20,
  };
}

export async function queryAnalytics(env, sql) {
  const config = analyticsConfiguration(env);
  if (!config.ready) {
    const error = new Error("Analytics read credentials are not configured");
    error.code = "ANALYTICS_NOT_CONFIGURED";
    throw error;
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/analytics_engine/sql`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "content-type": "text/plain; charset=utf-8",
    },
    body: String(sql || ""),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    const error = new Error(`Analytics Engine query failed (${response.status}): ${detail}`);
    error.code = "ANALYTICS_QUERY_FAILED";
    throw error;
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.data)) {
    const error = new Error("Analytics Engine returned an invalid result");
    error.code = "ANALYTICS_QUERY_INVALID";
    throw error;
  }
  return payload.data;
}

export function eventAggregateSql(days) {
  const windowDays = Math.max(1, Math.min(30, Number(days) || 7));
  return `SELECT
    blob1 AS event,
    blob3 AS label,
    SUM(_sample_interval * double1) AS total
  FROM ${DATASET}
  WHERE index1 = 'production'
    AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
  GROUP BY event, label
  ORDER BY total DESC
  LIMIT 2500`;
}

export function pageAggregateSql(days) {
  const windowDays = Math.max(1, Math.min(30, Number(days) || 7));
  return `SELECT
    blob2 AS path,
    SUM(_sample_interval * double1) AS total
  FROM ${DATASET}
  WHERE index1 = 'production'
    AND blob1 = 'page_view'
    AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
  GROUP BY path
  ORDER BY total DESC
  LIMIT 50`;
}

export function dailyAggregateSql(days) {
  const windowDays = Math.max(1, Math.min(30, Number(days) || 7));
  return `SELECT
    toStartOfDay(timestamp) AS day,
    blob1 AS event,
    SUM(_sample_interval * double1) AS total
  FROM ${DATASET}
  WHERE index1 = 'production'
    AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
  GROUP BY day, event
  ORDER BY day ASC, event ASC
  LIMIT 2000`;
}

export function trendingSql(days = 7) {
  const windowDays = Math.max(1, Math.min(7, Number(days) || 7));
  return `SELECT
    blob1 AS event,
    blob3 AS label,
    SUM(_sample_interval * double1) AS total
  FROM ${DATASET}
  WHERE index1 = 'production'
    AND timestamp > NOW() - INTERVAL '${windowDays}' DAY
    AND (
      blob1 = 'release_play'
      OR blob1 = 'release_click'
      OR blob1 = 'related_release_click'
      OR blob1 = 'new_this_week_click'
      OR blob1 = 'trending_release_click'
      OR blob1 = 'youtube_click'
    )
  GROUP BY event, label
  ORDER BY total DESC
  LIMIT 1000`;
}

export async function fetchCatalogue(context) {
  const url = new URL("/releases.json", context.request.url);
  const request = new Request(url.toString(), { headers: { Accept: "application/json" } });
  const response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(request)
    : await fetch(request);
  if (!response.ok) throw new Error(`Release catalogue returned ${response.status}`);
  const payload = await response.json();
  if (payload?.source !== "curated-youtube-playlists" || !Array.isArray(payload?.releases)) {
    throw new Error("Unverified release catalogue source");
  }
  return payload.releases;
}

export function releaseLookup(releases) {
  const map = new Map();
  for (const release of releases) {
    const id = String(release?.id || "").trim();
    const url = String(release?.url || "").trim();
    const slug = url.match(/^\/releases\/([a-z0-9-]+)\/?$/i)?.[1]?.toLowerCase() || "";
    if (id) map.set(id, release);
    if (slug) map.set(slug, release);
  }
  return map;
}

export function artistSlugFromPath(path) {
  return String(path || "").match(/^\/artists\/([a-z0-9-]+)\/?$/i)?.[1]?.toLowerCase() || "";
}

export function releaseSlug(release) {
  return String(release?.url || "").match(/^\/releases\/([a-z0-9-]+)\/?$/i)?.[1]?.toLowerCase() || "";
}
