import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../functions/api/latest.js", import.meta.url), "utf8");
const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const fullRelease = {
  id: "dV6_GbsHrxI",
  contentType: "full-release",
  artist: "Kemarco",
  title: "Badman Don’t Rush",
  rawTitle: "Kemarco – Badman Don’t Rush | Dancehall 2026",
  published: "2026-08-05T17:00:07Z",
  url: "/releases/kemarco-badman-dont-rush/"
};

assert.equal(api.validFullRelease(fullRelease), true);
assert.equal(api.validFullRelease({ ...fullRelease, contentType: "short" }), false);
assert.equal(api.validFullRelease({ ...fullRelease, title: "Badman Don’t Rush #Shorts" }), false);
assert.equal(api.validFullRelease({ ...fullRelease, rawTitle: "Badman Don’t Rush | Out Now" }), false);
assert.equal(api.validFullRelease({ ...fullRelease, url: "https://youtube.com/shorts/dV6_GbsHrxI" }), false);

const selected = api.selectFullReleases({
  source: "curated-youtube-playlists",
  releases: [
    { ...fullRelease, id: "AAAAAAAAAAA", contentType: "short", published: "2026-08-09T12:00:00Z" },
    fullRelease
  ]
});

assert.deepEqual(selected.map(item => item.id), [fullRelease.id]);

const currentCatalogue = JSON.parse(
  await readFile(new URL("../releases.json", import.meta.url), "utf8")
);
const currentFullReleases = api.selectFullReleases(currentCatalogue);
assert.equal(currentFullReleases.length, currentCatalogue.total);
assert.equal(currentFullReleases[0].id, "dV6_GbsHrxI");

assert.throws(
  () => api.selectFullReleases({ source: "youtube-videos-tab", releases: [fullRelease] }),
  /Unverified release catalogue source/
);

console.log("Latest Release accepts verified full releases and rejects Shorts/unverified sources.");
