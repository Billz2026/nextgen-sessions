import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const events = read("functions/api/events.js");
const metrics = read("site-metrics.js");
const analytics = read("functions/_lib/analytics.js");
const auth = read("functions/_lib/dashboard-auth.js");
const summary = read("functions/api/analytics-summary.js");
const trendingApi = read("functions/api/trending.js");
const trendingClient = read("trending.js");
const weekly = read("weekly-feed.js");
const dashboardHtml = read("ops/analytics/index.html");
const dashboardJs = read("analytics-dashboard.js");
const privacy = read("privacy/index.html");
const homepage = read("index.html");
const readme = read("README.md");

const requiredEvents = [
  "page_view",
  "release_play",
  "release_click",
  "related_release_click",
  "new_this_week_click",
  "trending_release_click",
  "artist_click",
  "related_artist_click",
  "genre_click",
  "mix_play",
  "site_search",
  "search_result_click",
  "youtube_click",
  "youtube_subscribe_click",
  "social_follow_click",
];

for (const event of requiredEvents) {
  assert(events.includes(`"${event}"`), `events.js must allow ${event}`);
  assert(metrics.includes(`"${event}"`), `site-metrics.js must implement ${event}`);
}

assert(metrics.includes("sessionStorage.getItem"), "site-metrics.js must session-deduplicate engagement");
assert(metrics.includes("sessionStorage.setItem"), "site-metrics.js must persist session dedupe markers");
assert(metrics.includes('send("page_view", "")'), "page views must remain tracked");
assert(!/SESSION_DEDUPE[\s\S]*?"page_view"/.test(metrics), "page_view must not be session-deduplicated");
assert(metrics.includes('input.id === "siteSearchInput"'), "universal site search must be instrumented");
assert(metrics.includes('send("site_search", first ? entityLabel(first) : "no-match")'), "site search must record only matched entity/no-match");
assert(!metrics.includes('send("site_search", input.value'), "raw search input must never be sent to analytics");
assert(!metrics.includes('label: input.value'), "raw search input must never be used as analytics label");
assert(metrics.includes('closest("[data-weekly-feed]")'), "New This Week clicks must be tracked");
assert(metrics.includes('closest("[data-trending-feed]")'), "Trending clicks must be tracked");
assert(metrics.includes('closest(".release-related")'), "related-release clicks must be tracked");
assert(metrics.includes('closest("[data-related-artists]")'), "related-artist clicks must be tracked");
assert(metrics.includes('closest("[data-mix-play]")'), "mix plays must be tracked");

assert(analytics.includes("CF_ACCOUNT_ID"), "analytics helper must use server-side account ID");
assert(analytics.includes("CF_ANALYTICS_READ_TOKEN"), "analytics helper must use server-side read token");
assert(analytics.includes("analytics_engine/sql"), "analytics helper must query Analytics Engine SQL API");
assert(analytics.includes("_sample_interval * double1"), "Analytics Engine queries must account for sampling");

const publicStaticFiles = [metrics, trendingClient, dashboardJs, dashboardHtml, homepage];
for (const source of publicStaticFiles) {
  assert(!source.includes("CF_ANALYTICS_READ_TOKEN"), "Cloudflare analytics read token name must not be embedded in browser assets");
  assert(!source.includes("ANALYTICS_DASHBOARD_KEY"), "dashboard secret name must not be embedded in browser assets");
}

assert(auth.includes("HttpOnly; Secure; SameSite=Strict"), "dashboard session cookie must be HttpOnly, Secure and SameSite=Strict");
assert(auth.includes("HMAC"), "dashboard sessions must be cryptographically signed");
assert(summary.includes("hasValidDashboardSession"), "analytics summary must require dashboard authentication");
assert(summary.includes("queryAnalytics"), "analytics summary must query Analytics Engine server-side");
assert(!summary.includes("ANALYTICS_DASHBOARD_KEY"), "summary endpoint should delegate dashboard secret handling to auth helper");

assert(trendingApi.includes("MIN_TOTAL_SCORE"), "Trending API must enforce a minimum total score");
assert(trendingApi.includes("MIN_RELEASE_SCORE"), "Trending API must enforce a per-release threshold");
assert(trendingApi.includes("MIN_QUALIFIED_RELEASES"), "Trending API must require multiple qualified releases");
assert(trendingApi.includes("active: false"), "Trending API must fail closed when signal is insufficient/unavailable");
assert(trendingApi.includes("caches.default"), "Trending API should cache aggregate rankings");
assert(!/score\s*[:,]/.test(trendingApi.match(/function publicRelease[\s\S]*?\n}/)?.[0] || ""), "public Trending items must not expose raw score values");

assert(trendingClient.includes('payload?.active !== true'), "Trending client must require an active feed");
assert(trendingClient.includes("releases.length < 2"), "Trending client must hide low-signal rankings");
assert(trendingClient.includes('anchor.after(section)'), "Trending must render after New This Week");
assert(weekly.includes("/trending.js"), "weekly feed must load Trending automatically");
assert(weekly.includes("/trending.css"), "weekly feed must load Trending styles automatically");

assert(/<meta\s+name="robots"\s+content="noindex,nofollow,noarchive"/i.test(dashboardHtml), "private dashboard must be noindex/nofollow/noarchive");
assert(dashboardHtml.includes("analyticsLoginForm"), "private dashboard must require login UI");
assert(dashboardJs.includes("/api/analytics-login"), "dashboard must authenticate through server endpoint");
assert(dashboardJs.includes("/api/analytics-summary"), "dashboard must load server-side aggregate summary");
assert(dashboardJs.includes("/api/analytics-logout"), "dashboard must support logout");
assert(!homepage.includes('/ops/analytics/'), "private analytics dashboard must not be linked from homepage");
assert(!metrics.includes('/ops/analytics/'), "public metric/navigation code must not expose the private dashboard route");

assert(/Typed search terms are not written to the analytics dataset/i.test(privacy), "privacy page must disclose privacy-safe search analytics");
assert(/session storage/i.test(privacy), "privacy page must disclose session-only deduplication");
assert(/Trending list/i.test(privacy), "privacy page must disclose aggregate public Trending use");
assert(/three months/i.test(privacy), "privacy page must state current Analytics Engine retention");

for (const name of ["CF_ACCOUNT_ID", "CF_ANALYTICS_READ_TOKEN", "ANALYTICS_DASHBOARD_KEY"]) {
  assert(readme.includes(name), `README must document ${name}`);
}

console.log("Analytics, dashboard and Trending regression checks passed.");
