import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { weeklyMixItems } from "./weekly-mix-items.mjs";

const week = { start: "2026-10-12", end: "2026-10-18" };
const fixture = {
  source: "youtube-mix-archives-and-channel-uploads",
  contentPolicy: { shortsAllowed: false },
  mixes: [{
    id: "AAAAAAAAAAA",
    contentType: "long-mix",
    collection: "bhangra",
    rawTitle: "Desi Junction | Desi Mix 2026 | NextGen Sessions",
    published: "2026-10-16T17:00:00Z",
    durationSeconds: 2730
  }]
};
const before = new Date("2026-10-16T16:59:00Z");
const after = new Date("2026-10-16T17:01:00Z");

assert.equal(weeklyMixItems(fixture, week, before).length, 0, "No Desi Junction before publication");
const released = weeklyMixItems(fixture, week, after);
assert.equal(released.length, 1);
assert.equal(released[0].title, "Desi Junction");
assert.equal(released[0].genre, "Desi Mixes");
assert.equal(released[0].releaseUrl, "/mixes/");
assert.equal(released[0].status, "live");
assert.equal(released[0].dateLocal, "2026-10-16");
assert.equal(weeklyMixItems({ ...fixture, source: "unverified-scheduled" }, week, after).length, 0);
assert.equal(weeklyMixItems({ ...fixture, contentPolicy: { shortsAllowed: true } }, week, after).length, 0);
assert.equal(weeklyMixItems({ ...fixture, mixes: [{ ...fixture.mixes[0], durationSeconds: 599 }] }, week, after).length, 0);
assert.equal(weeklyMixItems({ ...fixture, mixes: [{ ...fixture.mixes[0], rawTitle: "Desi Junction Teaser" }] }, week, after).length, 0);
assert.equal(weeklyMixItems(fixture, { start: "2026-10-19", end: "2026-10-25" }, after).length, 0);
const qawwali = weeklyMixItems({ ...fixture, mixes: [{
  ...fixture.mixes[0], id: "BBBBBBBBBBB",
  rawTitle: "Qawwali Nights Vol. 1 | NextGen Sessions",
  published: "2026-10-30T18:00:00Z"
}] }, { start: "2026-10-26", end: "2026-11-01" }, new Date("2026-10-30T18:01:00Z"));
assert.equal(qawwali[0]?.genre, "Desi Mixes");

const currentMixes = JSON.parse(await readFile(new URL("../mixes.json", import.meta.url), "utf8"));
const currentWeek = JSON.parse(await readFile(new URL("../this-week.json", import.meta.url), "utf8"));
const expected = weeklyMixItems(currentMixes, { start: currentWeek.weekStart, end: currentWeek.weekEnd });
const actual = currentWeek.items.filter(item => item.source === "mix-catalogue");
assert.deepEqual(actual.map(item => item.title).sort(), expected.map(item => item.title).sort(),
  "Homepage weekly mix cards must match the public mix catalogue");
console.log("Desi Junction release-day simulation and verified weekly mix eligibility passed.");
