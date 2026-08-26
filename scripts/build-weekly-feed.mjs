import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  formatScheduleDate,
  formatScheduleLong,
  formatScheduleTime,
  formatWeekLabel,
  localDateKey,
  normalise,
  releaseAtDate,
  sameRelease,
  weekBounds,
} from "./release-schedule.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TIMEZONE = "Europe/London";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadArtists() {
  const source = read("artists.js");
  const match = source.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("artists.js must expose window.NGS_ARTISTS");
  return JSON.parse(match[1]);
}

function loadArtistImages() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(read("artist-images.js"), context, { filename: "artist-images.js" });
  return context.window.NGS_ARTIST_IMAGES || {};
}

function publicReleaseUrl(release) {
  return String(release?.url || "").startsWith("/releases/") ? release.url : "";
}

function stateForSchedule(schedule, catalogue, now, defaultTimezone) {
  const releaseAt = releaseAtDate(schedule, defaultTimezone);
  const live = catalogue.find((release) => sameRelease(release, schedule));
  if (live) return { status: "live", releaseAt, live };
  return { status: now >= releaseAt ? "publishing" : "upcoming", releaseAt, live: null };
}

function scheduledItem(schedule, catalogue, artistsByName, imageMap, now, defaultTimezone) {
  const artist = artistsByName.get(normalise(schedule.artist));
  if (!artist) throw new Error(`Scheduled artist is not in artists.js: ${schedule.artist}`);
  const timeZone = schedule.timezone || defaultTimezone;
  const state = stateForSchedule(schedule, catalogue, now, defaultTimezone);
  const live = state.live;
  const artistImage = imageMap[artist.slug]?.src || imageMap[artist.slug]?.portrait || "";
  const releaseUrl = live ? publicReleaseUrl(live) : "";

  return {
    artist: schedule.artist,
    artistSlug: artist.slug,
    title: schedule.title,
    genre: live?.group || artist.genre || "NextGen Sessions",
    artistUrl: schedule.artistPath || `/artists/${artist.slug}/`,
    ...(releaseUrl ? { releaseUrl } : {}),
    dateLocal: localDateKey(state.releaseAt, timeZone),
    dateLabel: formatScheduleDate(state.releaseAt, timeZone),
    longDate: formatScheduleLong(state.releaseAt, timeZone),
    timeLocal: formatScheduleTime(state.releaseAt, timeZone),
    releaseAt: state.releaseAt.toISOString(),
    status: state.status,
    image: live?.id ? `/api/release-image?id=${encodeURIComponent(live.id)}&size=card` : artistImage,
    source: "schedule",
  };
}

function catalogueItem(release, artistsByName, timeZone) {
  const artist = artistsByName.get(normalise(release.artist));
  const published = new Date(release.published);
  return {
    artist: release.artist,
    artistSlug: artist?.slug || "",
    title: release.title,
    genre: release.group || artist?.genre || "NextGen Sessions",
    artistUrl: artist ? `/artists/${artist.slug}/` : "/artists/",
    releaseUrl: publicReleaseUrl(release),
    dateLocal: localDateKey(published, timeZone),
    dateLabel: formatScheduleDate(published, timeZone),
    longDate: formatScheduleLong(published, timeZone),
    timeLocal: "",
    releaseAt: published.toISOString(),
    status: "live",
    image: `/api/release-image?id=${encodeURIComponent(release.id)}&size=card`,
    source: "catalogue",
  };
}

function statusLabel(item) {
  if (item.status === "live") return "OUT NOW";
  if (item.status === "publishing") return "PUBLISHING SHORTLY";
  return `COMING · ${item.timeLocal}`;
}

function renderCard(item) {
  const href = item.status === "live" && item.releaseUrl ? item.releaseUrl : item.artistUrl;
  const cta = item.status === "live" && item.releaseUrl ? "Play release" : "View artist";
  const media = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)} by ${escapeHtml(item.artist)}" loading="lazy" decoding="async">`
    : `<span class="weekly-release-placeholder" aria-hidden="true">NG</span>`;
  return `<article class="weekly-release-card" data-release-state-card data-release-status="${escapeHtml(item.status)}" data-release-at="${escapeHtml(item.releaseAt)}">
      <a class="weekly-release-media" href="${escapeHtml(href)}">${media}</a>
      <div class="weekly-release-copy">
        <div class="weekly-release-meta"><span>${escapeHtml(item.dateLabel)}</span><strong data-release-state-label>${escapeHtml(statusLabel(item))}</strong></div>
        <p class="weekly-release-genre">${escapeHtml(item.genre)}</p>
        <h3>${escapeHtml(item.artist)}</h3>
        <p class="weekly-release-title">${escapeHtml(item.title)}</p>
        <a class="weekly-release-action" data-release-state-action href="${escapeHtml(href)}">${escapeHtml(cta)} →</a>
      </div>
    </article>`;
}

function renderHomepage(feed) {
  if (!feed.items.length && !feed.nextUp) return "<!-- WEEKLY-FEED:START --><!-- WEEKLY-FEED:END -->";
  const showingWeek = feed.items.length > 0;
  const cards = (showingWeek ? feed.items.slice(0, 4) : [feed.nextUp]).map(renderCard).join("\n    ");
  const heading = showingWeek ? "The week's releases, in one place." : "The next release is already lined up.";
  const eyebrow = showingWeek ? "New this week" : "Next up";
  const subcopy = showingWeek
    ? `${feed.weekLabel}. Scheduled releases switch to Out Now only after the public catalogue confirms them.`
    : "Nothing is scheduled inside the current week. The next confirmed NextGen release is shown below.";
  const overflow = feed.items.length > 4
    ? `<div class="button-row weekly-feed-more"><a class="button button-secondary" href="/releases/">View all releases</a></div>`
    : "";

  return `<!-- WEEKLY-FEED:START -->
<section class="section weekly-feed" id="new-this-week" aria-labelledby="new-this-week-title" data-weekly-feed="true">
  <div class="weekly-feed-heading">
    <div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2 id="new-this-week-title">${escapeHtml(heading)}</h2><p>${escapeHtml(subcopy)}</p></div>
    <span class="weekly-feed-window">${escapeHtml(showingWeek ? feed.weekLabel : feed.nextUp.longDate)}</span>
  </div>
  <div class="weekly-release-grid">
    ${cards}
  </div>
  ${overflow}
</section>
<!-- WEEKLY-FEED:END -->`;
}

function updateHomepage(feed) {
  const homepagePath = path.join(root, "index.html");
  let html = fs.readFileSync(homepagePath, "utf8");
  const block = renderHomepage(feed);
  const marker = /<!-- WEEKLY-FEED:START -->[\s\S]*?<!-- WEEKLY-FEED:END -->/;
  if (marker.test(html)) {
    html = html.replace(marker, block);
  } else {
    const hero = /(<section\s+class="hero"[^>]*>[\s\S]*?<\/section>)/i;
    if (!hero.test(html)) throw new Error("Homepage hero section not found for weekly feed insertion");
    html = html.replace(hero, `$1\n${block}`);
  }
  if (!html.includes("/weekly-feed.css")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="/weekly-feed.css?v=20260826-week1">\n</head>');
  }
  if (!html.includes("/weekly-feed.js")) {
    html = html.replace("</body>", '<script src="/weekly-feed.js?v=20260826-week1" defer></script>\n</body>');
  }
  fs.writeFileSync(homepagePath, html, "utf8");
}

const now = new Date();
const artists = loadArtists();
const artistsByName = new Map(artists.map((artist) => [normalise(artist.name), artist]));
const imageMap = loadArtistImages();
const schedulePayload = JSON.parse(read("scheduled-releases.json"));
const cataloguePayload = JSON.parse(read("releases.json"));
const catalogue = Array.isArray(cataloguePayload.releases) ? cataloguePayload.releases : [];
const schedules = Array.isArray(schedulePayload.releases) ? schedulePayload.releases : [];
const timeZone = schedulePayload.defaultTimezone || DEFAULT_TIMEZONE;
const bounds = weekBounds(now, timeZone);

const scheduleItems = schedules.map((item) => scheduledItem(item, catalogue, artistsByName, imageMap, now, timeZone));
const scheduledMatches = new Set();
for (const schedule of schedules) {
  const live = catalogue.find((release) => sameRelease(release, schedule));
  if (live?.id) scheduledMatches.add(live.id);
}

const weekly = [];
for (const item of scheduleItems) {
  if (item.dateLocal >= bounds.start && item.dateLocal <= bounds.end) weekly.push(item);
}
for (const release of catalogue) {
  if (scheduledMatches.has(release.id)) continue;
  const item = catalogueItem(release, artistsByName, timeZone);
  if (item.dateLocal >= bounds.start && item.dateLocal <= bounds.end) weekly.push(item);
}
weekly.sort((a, b) => a.releaseAt.localeCompare(b.releaseAt) || a.artist.localeCompare(b.artist));

const futureSchedule = scheduleItems
  .filter((item) => item.status !== "live" && item.releaseAt > now.toISOString())
  .sort((a, b) => a.releaseAt.localeCompare(b.releaseAt));

const core = {
  timezone: timeZone,
  weekStart: bounds.start,
  weekEnd: bounds.end,
  weekLabel: formatWeekLabel(bounds.start, bounds.end),
  mode: weekly.length ? "week" : futureSchedule.length ? "next-up" : "empty",
  items: weekly,
  nextUp: futureSchedule[0] || null,
};

const outputPath = path.join(root, "this-week.json");
let generatedAt = now.toISOString();
if (fs.existsSync(outputPath)) {
  try {
    const previous = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    const previousCore = { ...previous };
    delete previousCore.generatedAt;
    if (JSON.stringify(previousCore) === JSON.stringify(core) && previous.generatedAt) generatedAt = previous.generatedAt;
  } catch (_) {
    // Rebuild cleanly if a previous generated feed is malformed.
  }
}
const output = { generatedAt, ...core };
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
updateHomepage(output);
console.log(`Weekly release feed built for ${output.weekLabel}: ${output.items.length} release(s), mode=${output.mode}.`);
