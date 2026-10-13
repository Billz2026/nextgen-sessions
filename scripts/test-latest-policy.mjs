import assert from "node:assert/strict";
import vm from "node:vm";
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

assert.ok(source.includes("desi\\s+junction"), "Live homepage Latest must recognise Desi Junction as a long mix");
assert.ok(
  (await readFile(new URL("./update-latest-feed.py", import.meta.url), "utf8")).includes("desi\\s+junction"),
  "Quota-free homepage Latest must also recognise Desi Junction as a long mix"
);

const genericMix = {
  id: "bhangramix1",
  contentType: "long-mix",
  collection: "other",
  title: "Bhangra Mix 2026",
  rawTitle: "Bhangra Mix 2026 | NextGen Sessions",
  published: "2026-09-12T08:00:00Z",
  durationSeconds: 1800
};
assert.equal(api.validLongMix(genericMix), true, "Generic future long mixes must be eligible");

const selectedMixes = api.selectLongMixes({
  source: "youtube-mix-archives-and-channel-uploads",
  contentPolicy: { shortsAllowed: false },
  mixes: [longMix, genericMix]
});
assert.deepEqual(selectedMixes.map(item => item.id), [genericMix.id, longMix.id]);
assert.equal(selectedMixes[0].contentType, "long-mix");
assert.equal(selectedMixes[0].title, "Bhangra Mix 2026");
assert.equal(selectedMixes[0].url, "/mixes/", "Unknown mix collections must safely fall back to the mix hub");
assert.equal(selectedMixes[1].title, "UK Rap Mashup 2 – In The Endz");
assert.equal(selectedMixes[1].url, "/mixes/uk-rap-mashup-series-2/");

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

const futureMix = {
  ...genericMix,
  id: "CCCCCCCCCCC",
  published: new Date(Date.now() + 60 * 60 * 1000).toISOString()
};
const futureMixSelected = api.selectLongMixes({
  source: "youtube-mix-archives-and-channel-uploads",
  contentPolicy: { shortsAllowed: false },
  mixes: [futureMix, longMix]
});
assert.deepEqual(
  futureMixSelected.map(item => item.id),
  [longMix.id],
  "Future-dated mixes must remain embargoed until YouTube publication time"
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

for (const marker of [
  'policy: "songs-albums-mixes-no-shorts"',
  'fetchMixCatalogue(context)',
  'fetchAlbumCatalogue(context)',
  'LATEST_CHANNEL_FEED_URL',
  'fetchLiveChannelLatest()',
  'selectLongMixes',
  'selectAlbums',
  'new URL("/api/latest?v=r5"',
]) {
  assert.ok(source.includes(marker), `Latest API source is missing: ${marker}`);
}
assert.ok(!source.includes('policy: "full-release-catalogue-only"'), "Song-only Latest policy must never return");
const homepageSource = await readFile(new URL("../site.js", import.meta.url), "utf8");
const homepageHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const latestFeedUpdater = await readFile(new URL("./update-latest-feed.py", import.meta.url), "utf8");
const fallbackSync = await readFile(new URL("./sync-homepage-fallback.py", import.meta.url), "utf8");

assert.ok(!source.includes('const FALLBACK_RELEASES = ['), "Latest API must not fall back to an ancient hard-coded release list");
assert.ok(
  homepageSource.includes('fetchJson("/latest-feed.json?v=2")'),
  "Homepage must read the quota-free Latest feed"
);
assert.ok(
  homepageSource.includes("Promise.allSettled"),
  "Homepage Latest must tolerate either dynamic source failing"
);
for (const marker of [
  "youtube.com/feeds/videos.xml?channel_id=",
  "public-youtube-channel-feed",
  "retaining last-known-good Latest"
]) {
  assert.ok(latestFeedUpdater.includes(marker), `Quota-free Latest updater missing: ${marker}`);
}

for (const expected of [
  'case "long-mix"',
  'label: "Latest mix"',
  'playCta: "Play full mix"',
  'case "album"',
  'label: "Latest album"',
  'playCta: "Play full album"',
  'label: "Latest release"',
  'heroLink.textContent = presentation.heroCta',
  'latestShell.dataset.contentKind = presentation.kind',
  'function latestDestination(item)',
  'if (item?.contentType === "long-mix") return "/mixes/"'
]) {
  assert.ok(homepageSource.includes(expected), `Homepage Latest presentation missing: ${expected}`);
}

for (const expected of [
  'def content_presentation(content_type: str)',
  '"label": "Latest mix"',
  '"label": "Latest album"',
  '"label": "Latest release"',
  'presentation["heroCta"]',
  'presentation["playCta"]',
  'def latest_destination(item: dict)',
  'return "/mixes/"'
]) {
  assert.ok(fallbackSync.includes(expected), `Homepage fallback sync missing: ${expected}`);
}

const currentLatest = [...currentFullReleases, ...currentMixes, ...currentAlbums]
  .filter(item => Date.parse(item?.published || "") <= Date.now())
  .sort((a, b) => Date.parse(b.published || "") - Date.parse(a.published || ""))[0];

assert.ok(currentLatest, "At least one eligible current Latest item must exist");

const presentationByType = {
  "long-mix": {
    kind: "mix",
    label: "Latest mix",
    cta: "Explore latest mix",
    play: "Play full mix",
    destination: "/mixes/"
  },
  album: {
    kind: "album",
    label: "Latest album",
    cta: "Explore latest album",
    play: "Play full album",
    destination: currentLatest?.url
  },
  "full-release": {
    kind: "release",
    label: "Latest release",
    cta: "Explore latest release",
    play: "Play latest release",
    destination: currentLatest?.url
  }
};

const expectedPresentation = presentationByType[currentLatest.contentType];
assert.ok(expectedPresentation, `Unexpected Latest content type: ${currentLatest.contentType}`);

assert.ok(
  homepageHtml.includes(`data-video-id="${currentLatest.id}"`),
  "Homepage static Latest video id must match the newest eligible catalogue item"
);
assert.ok(
  homepageHtml.includes(`data-content-kind="${expectedPresentation.kind}"`),
  "Homepage static Latest content kind must match the newest eligible catalogue item"
);
assert.ok(
  homepageHtml.includes(`id="latestTypeLabel">${expectedPresentation.label}</strong>`),
  "Homepage static Latest label must match the newest eligible catalogue item"
);
assert.ok(
  homepageHtml.includes(`id="latestPlayCopy">${expectedPresentation.play}</span>`),
  "Homepage static Latest play copy must match the newest eligible catalogue item"
);
assert.ok(
  homepageHtml.includes(`id="heroLatestLink" href="${expectedPresentation.destination}">${expectedPresentation.cta}</a>`),
  "Homepage Latest CTA must match the newest eligible catalogue item"
);

assert.match(
  homepageHtml,
  /class="video-no-script" href="[^"]+">Watch the latest (?:release|mix|album) on YouTube<\/a>/,
  "Homepage no-script Latest link must be valid closed anchor HTML"
);
assert.ok(
  !/href="[^"]*"(?:Explore|Watch the latest)/.test(homepageHtml),
  "Homepage Latest links must never omit the closing > after href"
);
assert.ok(
  homepageSource.includes('https://i.ytimg.com/vi/'),
  "Latest artwork must have a direct YouTube fallback"
);

console.log(`Latest policy validated for current ${currentLatest.contentType}: ${currentLatest.id}`);



// Exercise the real homepage script with stubbed HTTP responses. In particular,
// /releases/ from the quota-free feed must never be treated as a specific song page.
async function simulateHomepageLinks(payloads) {
  const hero = {
    href: "",
    textContent: "",
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  };
  const grid = { innerHTML: "" };
  const title = { textContent: "" };
  const nodes = {
    heroLatestLink: hero,
    releaseGrid: grid,
    latestVideoTitle: title
  };
  const document = {
    querySelector(selector) {
      // The page already loads the analytics script; avoid adding a DOM mock.
      return selector === 'script[src="/site-metrics.js"]' ? {} : null;
    },
    getElementById(id) { return nodes[id] || null; }
  };
  const fetch = async url => {
    const source = String(url).split("?")[0];
    if (!Object.hasOwn(payloads, source)) return { ok: false, status: 503 };
    return { ok: true, status: 200, json: async () => payloads[source] };
  };

  vm.runInNewContext(homepageSource, {
    document, fetch,
    window: { NGS_ARTISTS: [], NGS_ARTIST_IMAGES: {} }
  }, { filename: "site.js" });
  await new Promise(resolve => setImmediate(resolve));
  return { hero, grid: grid.innerHTML, title: title.textContent };
}

const deepLinkTrack = {
  id: "NNNNNNNNNNN",
  contentType: "full-release",
  artist: "Test Artist",
  title: "Exact Page",
  published: "2026-10-12T23:58:00Z",
  url: "/releases/test-artist-exact-page/"
};
const genericFeedTrack = { ...deepLinkTrack, url: "/releases/" };
const verifiedCatalogue = { releases: [deepLinkTrack] };
const channelFeed = { latest: genericFeedTrack };

const recoveredStaticLink = await simulateHomepageLinks({
  "/latest-feed.json": channelFeed,
  "/releases.json": verifiedCatalogue
});
assert.equal(recoveredStaticLink.hero.href, deepLinkTrack.url, "Static catalogue should resolve the exact release URL if the API is down");
assert.ok(recoveredStaticLink.grid.includes('href="' + deepLinkTrack.url + '"'), "Homepage release cards must use the exact resolved page");
assert.equal(recoveredStaticLink.hero.attributes.target, undefined, "Internal release pages must not open a new tab");

const recoveredApiLink = await simulateHomepageLinks({
  "/api/latest": { latest: deepLinkTrack, releases: [deepLinkTrack] },
  "/latest-feed.json": channelFeed
});
assert.equal(recoveredApiLink.hero.href, deepLinkTrack.url, "API catalogue should resolve the exact release URL if the static catalogue is down");

// If a newly published upload is absent from both verified catalogues,
// its CTA must play that video instead of taking visitors to /releases/.
const watchOnlyTrack = {
  ...genericFeedTrack,
  id: "QQQQQQQQQQQ",
  title: "Fresh Unknown Track"
};
const watchFallback = await simulateHomepageLinks({
  "/latest-feed.json": { latest: watchOnlyTrack }
});
const watchUrl = "https://www.youtube.com/watch?v=QQQQQQQQQQQ";
assert.equal(watchFallback.hero.href, watchUrl, "Uncatalogued uploads must link directly to their YouTube video");
assert.equal(watchFallback.hero.attributes.target, "_blank", "YouTube links must open in a new tab");
assert.equal(watchFallback.hero.attributes.rel, "noopener noreferrer", "External Latest links must be safe");
assert.equal(watchFallback.hero.textContent, "Watch latest release on YouTube");
assert.ok(watchFallback.grid.includes('href="' + watchUrl + '"'), "Uncatalogued release cards must point at the correct video");
assert.ok(watchFallback.grid.includes("Watch on YouTube"), "Uncatalogued release cards must be accurately labelled");
assert.ok(!watchFallback.grid.includes('href="/releases/"'), "No fresh upload should have a generic archive link");

const albumFallback = await simulateHomepageLinks({
  "/latest-feed.json": {
    latest: {
      id: "PPPPPPPPPPP",
      contentType: "album",
      title: "Complete Album",
      published: "2026-10-12T23:58:00Z",
      url: "/mixes/full-albums/"
    }
  }
});
assert.equal(albumFallback.hero.href, "/mixes/full-albums/", "Album routing must remain unchanged");

const mixFallback = await simulateHomepageLinks({
  "/latest-feed.json": {
    latest: {
      id: "MMMMMMMMMMM",
      contentType: "long-mix",
      title: "Full Mix",
      published: "2026-10-12T23:58:00Z",
      url: "/mixes/"
    }
  }
});
assert.equal(mixFallback.hero.href, "/mixes/", "Mix routing must remain unchanged");

console.log("Homepage Latest deep-link safeguards passed: verified song pages, YouTube fallback, albums and mixes.");
