import {
  fetchCatalogue,
  json,
  queryAnalytics,
  releaseLookup,
  releaseSlug,
  trendingSql,
} from "../_lib/analytics.js";

const WEIGHTS = Object.freeze({
  release_play: 5,
  release_click: 3,
  related_release_click: 2,
  new_this_week_click: 2,
  trending_release_click: 1,
  youtube_click: 1,
});

const MIN_TOTAL_SCORE = 25;
const MIN_RELEASE_SCORE = 5;
const MIN_QUALIFIED_RELEASES = 2;
const MAX_RESULTS = 4;
const CACHE_SECONDS = 600;

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreRows(rows, lookup, multiplier, scores) {
  for (const row of rows) {
    const event = String(row?.event || "");
    const weight = WEIGHTS[event];
    if (!weight) continue;
    const release = lookup.get(String(row?.label || ""));
    if (!release) continue;
    const slug = releaseSlug(release);
    if (!slug) continue;
    const current = scores.get(slug) || { release, score: 0 };
    current.score += number(row?.total) * weight * multiplier;
    scores.set(slug, current);
  }
}

function publicRelease(item, rank) {
  const release = item.release;
  return {
    rank,
    artist: release.artist,
    title: release.title,
    genre: release.group,
    url: release.url,
    image: `/api/release-image?id=${encodeURIComponent(release.id)}&size=card`,
  };
}

async function buildTrending(context) {
  const releases = await fetchCatalogue(context);
  const lookup = releaseLookup(releases);
  const [weekRows, dayRows] = await Promise.all([
    queryAnalytics(context.env, trendingSql(7)),
    queryAnalytics(context.env, trendingSql(1)),
  ]);

  const scores = new Map();
  scoreRows(weekRows, lookup, 1, scores);
  scoreRows(dayRows, lookup, 0.75, scores);

  const ranked = [...scores.values()]
    .filter((item) => item.score >= MIN_RELEASE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  const totalScore = ranked.reduce((sum, item) => sum + item.score, 0);
  if (ranked.length < MIN_QUALIFIED_RELEASES || totalScore < MIN_TOTAL_SCORE) {
    return {
      active: false,
      windowDays: 7,
      generatedAt: new Date().toISOString(),
      releases: [],
    };
  }

  return {
    active: true,
    windowDays: 7,
    generatedAt: new Date().toISOString(),
    releases: ranked.map((item, index) => publicRelease(item, index + 1)),
  };
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/trending?v=1", context.request.url), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const payload = await buildTrending(context);
    const response = new Response(JSON.stringify(payload), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
        "x-content-type-options": "nosniff",
      },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error("Trending feed failed", error);
    return json({
      active: false,
      windowDays: 7,
      generatedAt: new Date().toISOString(),
      releases: [],
    }, 200, { "cache-control": "public, max-age=60" });
  }
}
