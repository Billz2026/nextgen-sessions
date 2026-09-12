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

const longMix = {
  id: "3MH2DQAKkmM",
  contentType: "long-mix",
  collection: "uk-rap",
  title: "UK Rap Mashup — Series II",
  rawTitle: "UK Rap Mashup 2 – In The Endz | Full UK Rap Mix 2026 | NextGen Sessions",
  published: "2026-09-11T17:00:38Z",
  durationSeconds: 2264
};

assert.equal(api.validLongMix(longMix), true);
assert.equal(api.validLongMix({ ...longMix, durationSeconds: 599 }), false);
assert.equal(api.validLongMix({ ...longMix, rawTitle: "UK Rap Mashup 2 #Shorts" }), false);

const selectedMixes = api.selectLongMixes({
  source: "youtube-mix-archives-and-channel-uploads",
  contentPolicy: { shortsAllowed: false },
  mixes: [longMix]
});
assert.deepEqual(selectedMixes.map(item => item.id), [longMix.id]);
assert.equal(selectedMixes[0].contentType, "long-mix");
assert.equal(selectedMixes[0].title, "UK Rap Mashup 2 – In The Endz");
assert.equal(selectedMixes[0].url, "/mixes/uk-rap-mashup-series-2/");

const album = {
  id: "Xj806cr_eS4",
  artist: "Jay Starks",
  albumTitle: "Queens in My Soul",
  rawTitle: "QUEENS MADE HIM | Jay Starks - Queens in My Soul | East Coast Hip-Hop Album 2026 | NextGen Sessions",
  published: "2026-07-03T17:00:01Z"
};

assert.equal(api.validAlbum(album), true);
assert.equal(api.validAlbum({ ...album, rawTitle: "Queens in My Soul teaser" }), false);
assert.equal(api.validAlbum({ ...album, rawTitle: "Queens in My Soul full project" }), false);

const selectedAlbums = api.selectAlbums({
  source: "youtube-album-playlist",
  albums: [album]
});
assert.deepEqual(selectedAlbums.map(item => item.id), [album.id]);
assert.equal(selectedAlbums[0].contentType, "album");
assert.equal(selectedAlbums[0].url, "/mixes/full-albums/");

const futureRelease = {
  ...fullRelease,
  id: "BBBBBBBBBBB",
  artist: "Scheduled Artist",
  title: "Embargoed Release",
  rawTitle: "Scheduled Artist – Embargoed Release",
  published: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  url: "/releases/scheduled-artist-embargoed-release/"
};
const futureSelected = api.selectFullReleases({
  source: "curated-youtube-playlists",
  releases: [futureRelease, fullRelease]
});
assert.deepEqual(
  futureSelected.map(item => item.id),
  [fullRelease.id],
  "Future-dated releases must remain embargoed from /api/latest"
);

const currentCatalogue = JSON.parse(
  await readFile(new URL("../releases.json", import.meta.url), "utf8")
);
const currentFullReleases = api.selectFullReleases(currentCatalogue);
assert.equal(currentFullReleases.length, currentCatalogue.total);
assert.equal(currentFullReleases[0].contentType, "full-release");
assert.ok(
  currentFullReleases.every((release, index) =>
    index === 0 || Date.parse(currentFullReleases[index - 1].published) >= Date.parse(release.published)
  ),
  "Verified full releases must be ordered newest first"
);
assert.ok(
  currentFullReleases.every(release => Date.parse(release.published) <= Date.now()),
  "Public release catalogue must not contain future-dated releases"
);

const currentMixCatalogue = JSON.parse(
  await readFile(new URL("../mixes.json", import.meta.url), "utf8")
);
const currentMixes = api.selectLongMixes(currentMixCatalogue);
assert.ok(currentMixes.length >= 1, "Verified mix catalogue must expose at least one eligible long mix");
assert.ok(currentMixes.every(item => item.contentType === "long-mix"));
assert.ok(currentMixes.every(item => Number(item.durationSeconds || 0) >= 600));
assert.equal(
  currentMixes.find(item => item.id === "3MH2DQAKkmM")?.url,
  "/mixes/uk-rap-mashup-series-2/",
  "UK Rap Mashup 2 must deep-link to its dedicated landing page"
);

const currentAlbumCatalogue = JSON.parse(
  await readFile(new URL("../albums.json", import.meta.url), "utf8")
);
const currentAlbums = api.selectAlbums(currentAlbumCatalogue);
assert.ok(currentAlbums.length >= 1, "Verified album catalogue must expose at least one eligible album");
assert.ok(currentAlbums.every(item => item.contentType === "album"));

assert.throws(
  () => api.selectFullReleases({ source: "youtube-videos-tab", releases: [fullRelease] }),
  /Unverified release catalogue source/
);
assert.throws(
  () => api.selectLongMixes({ source: "youtube-videos-tab", contentPolicy: { shortsAllowed: false }, mixes: [longMix] }),
  /Unverified mix catalogue source/
);
assert.throws(
  () => api.selectAlbums({ source: "youtube-videos-tab", albums: [album] }),
  /Unverified album catalogue source/
);

const productionWorker = await readFile(new URL("../.worker/index.js", import.meta.url), "utf8");
for (const marker of [
  'policy: "full-release-catalogue-only"',
  'item?.contentType === "full-release"',
  'payload?.source !== "curated-youtube-playlists"',
  'function releasedNow(item)',
  'timestamp <= Date.now()',
  'new URL("/api/latest?v=r3"',
]) {
  assert.ok(productionWorker.includes(marker), `Production Worker is missing: ${marker}`);
}

console.log("Latest accepts verified full songs, albums and long mixes while rejecting Shorts, promos and future content.");
