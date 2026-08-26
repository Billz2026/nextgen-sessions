import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  localScheduleToDate,
  normalise,
  releaseAtDate,
  sameRelease,
} from "./release-schedule.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const json = (name) => JSON.parse(read(name));

const schedulePayload = json("scheduled-releases.json");
const cataloguePayload = json("releases.json");
const feed = json("this-week.json");
const search = json("search-index.json");
const catalogue = Array.isArray(cataloguePayload.releases) ? cataloguePayload.releases : [];
const schedules = Array.isArray(schedulePayload.releases) ? schedulePayload.releases : [];
const defaultTimezone = schedulePayload.defaultTimezone || "Europe/London";
const now = new Date();

assert.equal(schedulePayload.policy, "metadata-only-no-media-identifiers");
assert.equal(defaultTimezone, "Europe/London");
assert.equal(feed.timezone, defaultTimezone);
assert.match(feed.weekStart, /^\d{4}-\d{2}-\d{2}$/);
assert.match(feed.weekEnd, /^\d{4}-\d{2}-\d{2}$/);
assert.ok(["week", "next-up", "empty"].includes(feed.mode), `invalid weekly feed mode: ${feed.mode}`);

const [sy, sm, sd] = feed.weekStart.split("-").map(Number);
const [ey, em, ed] = feed.weekEnd.split("-").map(Number);
assert.equal(new Date(Date.UTC(sy, sm - 1, sd)).getUTCDay(), 1, "weekly feed must start on Monday");
assert.equal(new Date(Date.UTC(ey, em - 1, ed)).getUTCDay(), 0, "weekly feed must end on Sunday");

assert.equal(localScheduleToDate("2026-07-01T18:00:00", "Europe/London").toISOString(), "2026-07-01T17:00:00.000Z", "BST conversion failed");
assert.equal(localScheduleToDate("2026-12-01T18:00:00", "Europe/London").toISOString(), "2026-12-01T18:00:00.000Z", "GMT conversion failed");
assert.throws(() => localScheduleToDate("2026-03-29T01:30:00", "Europe/London"), /does not resolve cleanly|ambiguous/, "non-existent DST time must be rejected");
assert.throws(() => localScheduleToDate("2026-10-25T01:30:00", "Europe/London"), /ambiguous/, "ambiguous DST time must be rejected");

const scheduleKeys = new Set();
for (const item of schedules) {
  assert.ok(item.artist && item.title && item.releaseLocal && item.artistPath && item.releaseSlug, `incomplete schedule item: ${JSON.stringify(item)}`);
  const key = `${normalise(item.artist)}::${normalise(item.title)}`;
  assert.ok(!scheduleKeys.has(key), `duplicate scheduled release: ${key}`);
  scheduleKeys.add(key);
  const releaseAt = releaseAtDate(item, defaultTimezone);
  assert.ok(Number.isFinite(releaseAt.getTime()), `invalid schedule time: ${key}`);
}

const feedKeys = new Set();
for (const item of feed.items || []) {
  const key = `${normalise(item.artist)}::${normalise(item.title)}`;
  assert.ok(!feedKeys.has(key), `duplicate weekly feed item: ${key}`);
  feedKeys.add(key);
  assert.ok(["upcoming", "publishing", "live"].includes(item.status), `invalid weekly status: ${item.status}`);
  assert.ok(item.artistUrl && item.releaseAt && item.dateLocal && item.dateLabel, `incomplete weekly item: ${key}`);
  const artistTarget = path.join(root, item.artistUrl.replace(/^\//, ""), "index.html");
  assert.ok(fs.existsSync(artistTarget), `weekly artist target missing: ${item.artistUrl}`);
  if (item.status === "live") {
    assert.ok(item.releaseUrl, `live weekly item missing release URL: ${key}`);
    const releaseTarget = path.join(root, item.releaseUrl.replace(/^\//, ""), "index.html");
    assert.ok(fs.existsSync(releaseTarget), `live weekly release target missing: ${item.releaseUrl}`);
  } else {
    assert.ok(!item.releaseUrl, `future/publishing weekly item must not expose release URL: ${key}`);
  }
}

for (const item of schedules) {
  const live = catalogue.find((release) => sameRelease(release, item));
  const artistPath = path.join(root, item.artistPath.replace(/^\//, ""), "index.html");
  const artistHtml = fs.readFileSync(artistPath, "utf8");
  const releaseAt = releaseAtDate(item, defaultTimezone);
  if (live) {
    assert.ok(!artistHtml.includes("<!-- ARTIST-SCHEDULE:START -->"), `live scheduled release should no longer render as upcoming: ${item.artist} — ${item.title}`);
  } else {
    assert.ok(artistHtml.includes("<!-- ARTIST-SCHEDULE:START -->"), `unmatched schedule must render on artist page: ${item.artist} — ${item.title}`);
    assert.ok(artistHtml.includes(`data-release-at="${releaseAt.toISOString()}"`), `artist schedule timestamp drift: ${item.artist} — ${item.title}`);
    assert.ok(!artistHtml.includes(`/releases/${item.releaseSlug}/`), `future release URL leaked on artist page: ${item.releaseSlug}`);
  }
}

const homepage = read("index.html");
assert.ok(homepage.includes("<!-- WEEKLY-FEED:START -->") && homepage.includes("<!-- WEEKLY-FEED:END -->"), "homepage weekly feed markers missing");
assert.ok(homepage.includes("/weekly-feed.css"), "homepage weekly feed stylesheet missing");
assert.ok(homepage.includes("/weekly-feed.js"), "homepage weekly feed runtime missing");
const homepageCards = (homepage.match(/class="weekly-release-card"/g) || []).length;
if ((feed.items || []).length) assert.equal(homepageCards, Math.min(feed.items.length, 4), "homepage weekly card cap drift");
else if (feed.nextUp) assert.equal(homepageCards, 1, "Next Up fallback must render one card");
else assert.equal(homepageCards, 0, "empty weekly state should not render cards");

const scheduleSearchItems = (search.items || []).filter((item) => item.source === "release-schedule");
const unmatchedSchedules = schedules.filter((item) => !catalogue.some((release) => sameRelease(release, item)));
assert.equal(scheduleSearchItems.length, unmatchedSchedules.length, "search upcoming-release count must match unmatched central schedule");
for (const item of scheduleSearchItems) {
  assert.equal(item.type, "release");
  assert.ok(["upcoming", "publishing"].includes(item.status));
  assert.ok(item.url.startsWith("/artists/"), `upcoming search result must point to artist profile: ${item.url}`);
  assert.ok(!item.url.startsWith("/releases/"), `upcoming search result leaked release page: ${item.url}`);
}

const client = read("weekly-feed.js");
assert.ok(client.includes("PUBLISHING SHORTLY"), "runtime must support the publishing transition");
assert.ok(client.includes("data-release-state-card") || client.includes("releaseStateCard"), "runtime must target release-state cards");
assert.ok(!/youtube\.com\/watch|youtube-nocookie\.com\/embed/.test(client), "weekly runtime must never carry media identifiers");

console.log(`Release operating system validated: ${feed.items.length} item(s) this week, ${unmatchedSchedules.length} unmatched scheduled release(s).`);
