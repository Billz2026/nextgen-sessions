import { hasValidDashboardSession } from "../_lib/dashboard-auth.js";
import {
  dailyAggregateSql,
  eventAggregateSql,
  fetchCatalogue,
  json,
  pageAggregateSql,
  queryAnalytics,
  rangeDays,
  releaseLookup,
  releaseSlug,
} from "../_lib/analytics.js";

const RELEASE_WEIGHTS = Object.freeze({
  release_play: 5,
  release_click: 3,
  related_release_click: 2,
  new_this_week_click: 2,
  trending_release_click: 1,
  youtube_click: 1,
});

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function add(map, key, value) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + number(value));
}

async function fetchSearchIndex(context) {
  try {
    const request = new Request(new URL("/search-index.json", context.request.url), {
      headers: { Accept: "application/json" },
    });
    const response = context.env?.ASSETS?.fetch
      ? await context.env.ASSETS.fetch(request)
      : await fetch(request);
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.items) ? payload.items : [];
  } catch (_) {
    return [];
  }
}

function searchLookup(items) {
  const map = new Map();
  for (const item of items) {
    const url = String(item?.url || "");
    const release = url.match(/^\/releases\/([a-z0-9-]+)\/?$/i)?.[1];
    const artist = url.match(/^\/artists\/([a-z0-9-]+)\/?$/i)?.[1];
    const genre = url.match(/^\/genres\/([a-z0-9-]+)\/?$/i)?.[1];
    const mix = url.match(/^\/mixes\/([a-z0-9-]+)\/?$/i)?.[1];
    for (const key of [release, artist, genre, mix]) {
      if (key) map.set(key.toLowerCase(), item);
    }
  }
  return map;
}

function aggregateEvents(rows) {
  const totals = {};
  const labelsByEvent = new Map();
  for (const row of rows) {
    const event = String(row?.event || "");
    const label = String(row?.label || "");
    const total = number(row?.total);
    if (!event) continue;
    totals[event] = (totals[event] || 0) + total;
    if (!labelsByEvent.has(event)) labelsByEvent.set(event, new Map());
    add(labelsByEvent.get(event), label, total);
  }
  return { totals, labelsByEvent };
}

function releaseTable(labelsByEvent, releases) {
  const lookup = releaseLookup(releases);
  const byRelease = new Map();

  for (const [event, weight] of Object.entries(RELEASE_WEIGHTS)) {
    const labels = labelsByEvent.get(event) || new Map();
    for (const [label, total] of labels) {
      const release = lookup.get(label);
      if (!release) continue;
      const slug = releaseSlug(release);
      if (!slug) continue;
      if (!byRelease.has(slug)) {
        byRelease.set(slug, {
          slug,
          id: release.id,
          title: release.title,
          artist: release.artist,
          genre: release.group,
          url: release.url,
          plays: 0,
          clicks: 0,
          discoveryClicks: 0,
          youtubeClicks: 0,
          score: 0,
        });
      }
      const item = byRelease.get(slug);
      if (event === "release_play") item.plays += total;
      else if (event === "release_click") item.clicks += total;
      else if (event === "youtube_click") item.youtubeClicks += total;
      else item.discoveryClicks += total;
      item.score += total * weight;
    }
  }

  return [...byRelease.values()].sort((a, b) => b.score - a.score || b.plays - a.plays).slice(0, 20);
}

function artistTable(labelsByEvent, releaseRows, searchMap) {
  const scores = new Map();
  const clicks = labelsByEvent.get("artist_click") || new Map();
  const related = labelsByEvent.get("related_artist_click") || new Map();
  for (const [slug, total] of clicks) add(scores, slug, total * 2);
  for (const [slug, total] of related) add(scores, slug, total * 2);
  for (const release of releaseRows) {
    const artist = [...searchMap.entries()].find(([, item]) => item.type === "artist" && item.title === release.artist)?.[0];
    if (artist) add(scores, artist, release.score);
  }
  return [...scores.entries()]
    .map(([slug, score]) => ({
      slug,
      name: searchMap.get(slug)?.title || slug.replaceAll("-", " "),
      url: searchMap.get(slug)?.url || `/artists/${slug}/`,
      score,
      clicks: number(clicks.get(slug)) + number(related.get(slug)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

function genreTable(labelsByEvent, releaseRows, searchMap) {
  const scores = new Map();
  const clicks = labelsByEvent.get("genre_click") || new Map();
  for (const [slug, total] of clicks) add(scores, slug, total * 2);
  for (const release of releaseRows) {
    const matching = [...searchMap.entries()].find(([, item]) => item.type === "genre" && String(item.title || "").toLowerCase().includes(String(release.genre || "").toLowerCase().split("&")[0].trim()));
    if (matching) add(scores, matching[0], release.score);
  }
  return [...scores.entries()]
    .map(([slug, score]) => ({
      slug,
      name: searchMap.get(slug)?.title || slug.replaceAll("-", " "),
      url: searchMap.get(slug)?.url || `/genres/${slug}/`,
      score,
      clicks: number(clicks.get(slug)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function searchTable(labelsByEvent, searchMap) {
  const searches = labelsByEvent.get("site_search") || new Map();
  return [...searches.entries()]
    .filter(([label]) => label && label !== "no-match")
    .map(([label, total]) => ({
      label,
      title: searchMap.get(label)?.title || label.replaceAll("-", " "),
      type: searchMap.get(label)?.type || "catalogue",
      url: searchMap.get(label)?.url || "",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);
}

function dailyTable(rows) {
  const map = new Map();
  for (const row of rows) {
    const day = String(row?.day || "").slice(0, 10);
    if (!day) continue;
    if (!map.has(day)) map.set(day, { day, pageViews: 0, releasePlays: 0, releaseClicks: 0, artistClicks: 0 });
    const item = map.get(day);
    const total = number(row?.total);
    if (row.event === "page_view") item.pageViews += total;
    else if (row.event === "release_play") item.releasePlays += total;
    else if (row.event === "release_click") item.releaseClicks += total;
    else if (row.event === "artist_click") item.artistClicks += total;
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export async function onRequestGet(context) {
  if (!(await hasValidDashboardSession(context.request, context.env))) {
    return json({ ok: false, error: "unauthorised" }, 401);
  }

  const days = rangeDays(new URL(context.request.url).searchParams.get("range"));

  try {
    const [eventRows, pageRows, dailyRows, releases, searchItems] = await Promise.all([
      queryAnalytics(context.env, eventAggregateSql(days)),
      queryAnalytics(context.env, pageAggregateSql(days)),
      queryAnalytics(context.env, dailyAggregateSql(days)),
      fetchCatalogue(context),
      fetchSearchIndex(context),
    ]);

    const { totals, labelsByEvent } = aggregateEvents(eventRows);
    const searchMap = searchLookup(searchItems);
    const topReleases = releaseTable(labelsByEvent, releases);

    return json({
      ok: true,
      rangeDays: days,
      generatedAt: new Date().toISOString(),
      totals,
      topReleases,
      topArtists: artistTable(labelsByEvent, topReleases, searchMap),
      topGenres: genreTable(labelsByEvent, topReleases, searchMap),
      topSearches: searchTable(labelsByEvent, searchMap),
      topPages: pageRows.map((row) => ({ path: row.path, total: number(row.total) })).slice(0, 20),
      daily: dailyTable(dailyRows),
    });
  } catch (error) {
    console.error("Analytics summary failed", error);
    const unavailable = error?.code === "ANALYTICS_NOT_CONFIGURED";
    return json(
      { ok: false, error: unavailable ? "analytics-not-configured" : "analytics-query-failed" },
      unavailable ? 503 : 502,
    );
  }
}
