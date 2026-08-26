import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatScheduleLong,
  formatScheduleTime,
  normalise,
  releaseAtDate,
  sameRelease,
} from "./release-schedule.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const marker = /<!-- ARTIST-SCHEDULE:START -->[\s\S]*?<!-- ARTIST-SCHEDULE:END -->/g;

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

function cleanLegacySchedule(html) {
  return html
    .replace(marker, "")
    .replace(/\s*<script\s+src=["'][^"']*coming-soon\.js[^"']*["'][^>]*><\/script>/gi, "");
}

function ensureAssets(html) {
  let next = html;
  if (!next.includes("/weekly-feed.css")) {
    next = next.replace("</head>", '  <link rel="stylesheet" href="/weekly-feed.css?v=20260826-week1">\n</head>');
  }
  if (!next.includes("/weekly-feed.js")) {
    next = next.replace("</body>", '<script src="/weekly-feed.js?v=20260826-week1" defer></script>\n</body>');
  }
  return next;
}

function scheduleBlock(item, genre, defaultTimezone, now) {
  const releaseAt = releaseAtDate(item, defaultTimezone);
  const timeZone = item.timezone || defaultTimezone;
  const status = now >= releaseAt ? "publishing" : "upcoming";
  const label = status === "publishing" ? "PUBLISHING SHORTLY" : `COMING · ${formatScheduleTime(releaseAt, timeZone)}`;
  return `<!-- ARTIST-SCHEDULE:START -->
    <section class="profile-section" aria-labelledby="artist-next-release-title">
      <div class="profile-upcoming-release" data-release-state-card data-release-status="${escapeHtml(status)}" data-release-at="${escapeHtml(releaseAt.toISOString())}">
        <div>
          <p class="eyebrow">Next release</p>
          <h2 id="artist-next-release-title">${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(genre)} · ${escapeHtml(formatScheduleLong(releaseAt, timeZone))} · ${escapeHtml(formatScheduleTime(releaseAt, timeZone))} UK time</p>
        </div>
        <div class="profile-upcoming-status">
          <strong data-release-state-label>${escapeHtml(label)}</strong>
          <span>Release link activates only after the public catalogue confirms the track.</span>
        </div>
      </div>
    </section>
<!-- ARTIST-SCHEDULE:END -->`;
}

const schedulePayload = JSON.parse(read("scheduled-releases.json"));
const cataloguePayload = JSON.parse(read("releases.json"));
const catalogue = Array.isArray(cataloguePayload.releases) ? cataloguePayload.releases : [];
const schedules = Array.isArray(schedulePayload.releases) ? schedulePayload.releases : [];
const defaultTimezone = schedulePayload.defaultTimezone || "Europe/London";
const artists = loadArtists();
const artistByName = new Map(artists.map((artist) => [normalise(artist.name), artist]));
const now = new Date();

for (const artist of artists) {
  const pagePath = path.join(root, "artists", artist.slug, "index.html");
  if (!fs.existsSync(pagePath)) continue;
  const source = fs.readFileSync(pagePath, "utf8");
  const cleaned = cleanLegacySchedule(source);
  if (cleaned !== source) fs.writeFileSync(pagePath, cleaned, "utf8");
}

let enriched = 0;
for (const item of schedules) {
  const artist = artistByName.get(normalise(item.artist));
  if (!artist) throw new Error(`Scheduled artist missing from roster: ${item.artist}`);
  if (catalogue.some((release) => sameRelease(release, item))) continue;

  const relativePath = String(item.artistPath || `/artists/${artist.slug}/`).replace(/^\//, "") + "index.html";
  const pagePath = path.join(root, relativePath);
  if (!fs.existsSync(pagePath)) throw new Error(`Scheduled artist page missing: ${relativePath}`);

  let html = cleanLegacySchedule(fs.readFileSync(pagePath, "utf8"));
  const block = scheduleBlock(item, artist.genre || "NextGen Sessions", defaultTimezone, now);
  const hero = /(<section\s+class="profile-hero"[^>]*>[\s\S]*?<\/section>)/i;
  if (!hero.test(html)) throw new Error(`Artist hero missing for scheduled release: ${relativePath}`);
  html = html.replace(hero, `$1\n\n    ${block}`);
  html = ensureAssets(html);
  fs.writeFileSync(pagePath, html, "utf8");
  enriched += 1;
}

console.log(`Artist schedule enrichment complete: ${enriched} upcoming/publishing release(s) rendered from the central schedule.`);
