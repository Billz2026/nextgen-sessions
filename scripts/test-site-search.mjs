import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sameRelease } from "./release-schedule.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadArtists() {
  const source = read("artists.js");
  const match = source.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(match, "artists.js must expose window.NGS_ARTISTS");
  return JSON.parse(match[1]);
}

function normalise(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9&+\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const artists = loadArtists();
const releasesPayload = JSON.parse(read("releases.json"));
const releases = Array.isArray(releasesPayload.releases) ? releasesPayload.releases : [];
const schedulePayload = JSON.parse(read("scheduled-releases.json"));
const schedules = Array.isArray(schedulePayload.releases) ? schedulePayload.releases : [];
const unmatchedSchedules = schedules.filter((item) => !releases.some((release) => sameRelease(release, item)));
const searchIndex = JSON.parse(read("search-index.json"));
const items = Array.isArray(searchIndex.items) ? searchIndex.items : [];

const mixesRoot = path.join(root, "mixes");
const mixPages = fs.readdirSync(mixesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(mixesRoot, entry.name, "index.html")));

assert.equal(searchIndex.counts.artists, artists.length, "search artist count must match artists.js");
assert.equal(searchIndex.counts.releases, releases.length + unmatchedSchedules.length, "search release count must include public + scheduled releases");
assert.equal(searchIndex.counts.upcomingReleases || 0, unmatchedSchedules.length, "search upcoming release count must match central schedule");
assert.equal(searchIndex.counts.genres, 6, "search must include all six genre hubs");
assert.equal(searchIndex.counts.mixes, mixPages.length, "search mix count must match dedicated mix pages");
assert.equal(searchIndex.total, items.length, "search total must match indexed items");
assert.equal(items.length, artists.length + releases.length + unmatchedSchedules.length + 6 + mixPages.length, "search index item count drift");
assert.ok(items.length >= 130, `search index unexpectedly small: ${items.length}`);

const allowedTypes = new Set(["artist", "release", "genre", "mix"]);
const seen = new Set();
for (const item of items) {
  assert.ok(allowedTypes.has(item.type), `invalid search type: ${item.type}`);
  assert.ok(String(item.title || "").trim(), `search item missing title: ${JSON.stringify(item)}`);
  assert.ok(/^\/(artists|releases|genres|mixes)\//.test(item.url || ""), `invalid search URL: ${item.url}`);
  const key = `${item.type}:${item.url}:${item.title}`;
  assert.ok(!seen.has(key), `duplicate search result: ${key}`);
  seen.add(key);

  const target = path.join(root, item.url.replace(/^\//, ""), "index.html");
  assert.ok(fs.existsSync(target), `search target does not exist: ${item.url}`);

  if (item.type === "release" && item.source === "release-schedule") {
    assert.ok(item.url.startsWith("/artists/"), `scheduled release must link to artist page until public: ${item.url}`);
    assert.ok(["upcoming", "publishing"].includes(item.status), `invalid scheduled search status: ${item.status}`);
  } else if (item.type === "release") {
    assert.ok(item.url.startsWith("/releases/"), `public release search result must link to release page: ${item.url}`);
  }
}

function matches(query) {
  const q = normalise(query);
  const tokens = q.split(" ").filter(Boolean);
  return items.filter((item) => {
    const haystack = normalise([item.title, item.subtitle, item.description, ...(item.keywords || [])].join(" "));
    return tokens.every((token) => haystack.includes(token));
  });
}

assert.ok(matches("Renz Cole").some((item) => item.type === "artist" && item.url === "/artists/renz-cole/"), "Renz Cole artist must be searchable");
assert.ok(matches("Top Shotta").some((item) => item.type === "release" && item.url === "/releases/rudii-marka-top-shotta/"), "Top Shotta release must be searchable");
assert.ok(matches("Dancehall").some((item) => item.type === "genre" && item.url === "/genres/dancehall/"), "Dancehall genre must be searchable");
assert.ok(matches("Dancehall").some((item) => item.type === "mix"), "Dancehall search should surface a mix/collection");
for (const scheduled of unmatchedSchedules) {
  assert.ok(matches(scheduled.title).some((item) => item.source === "release-schedule" && item.title === scheduled.title), `scheduled release must be searchable: ${scheduled.artist} — ${scheduled.title}`);
}

const page = read("search/index.html");
assert.ok(page.includes('data-site-search="true"'), "search page marker missing");
assert.ok(page.includes('id="siteSearchInput"'), "search input missing");
assert.ok(page.includes('data-search-filter="artist"'), "artist filter missing");
assert.ok(page.includes('data-search-filter="release"'), "release filter missing");
assert.ok(page.includes('data-search-filter="genre"'), "genre filter missing");
assert.ok(page.includes('data-search-filter="mix"'), "mix filter missing");
assert.ok(page.includes('/search.js'), "search client script missing");

const client = read("search.js");
assert.ok(client.includes('fetch("/search-index.json"'), "search client must load first-party index");
assert.ok(client.includes("function scoreItem"), "search ranking function missing");
assert.ok(!/algolia|typesense|meilisearch/i.test(client), "search must remain first-party unless explicitly changed");

console.log(`Universal site search validated: ${items.length} indexed items including ${unmatchedSchedules.length} scheduled release(s).`);
