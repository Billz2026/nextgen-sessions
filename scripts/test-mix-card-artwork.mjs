import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../mix-catalogue.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

const countElement = {
  dataset: { mixCount: "uk-rap" },
  textContent: "1 mix"
};
const image = {
  dataset: {},
  src: "old-artwork.jpg",
  alt: "Old artwork",
  onerror: null
};
const card = {
  dataset: { mixCard: "uk-rap" },
  querySelector(selector) {
    if (selector === "[data-mix-count]") return countElement;
    if (selector === "[data-mix-thumbnail]") return image;
    return null;
  }
};

const payload = {
  mixes: [
    {
      id: "AAAAAAAAAAA",
      contentType: "long-mix",
      collection: "uk-rap",
      title: "UK Rap Mashup — Series I",
      rawTitle: "UK Rap Mashup Series 1 | NextGen Sessions",
      published: "2026-03-20T19:00:02Z",
      sequence: 1,
      thumbnail: "https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg"
    },
    {
      id: "BBBBBBBBBBB",
      contentType: "long-mix",
      collection: "uk-rap",
      title: "UK Rap Mashup — Series II",
      rawTitle: "UK Rap Mashup 2 – In The Endz | Full UK Rap Mix 2026 | NextGen Sessions",
      published: "2026-09-11T17:00:38Z",
      sequence: 2,
      thumbnail: "https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg"
    }
  ]
};

const context = {
  document: {
    querySelectorAll(selector) {
      assert.equal(selector, "[data-mix-card]");
      return [card];
    }
  },
  fetch: async (url, options) => {
    assert.equal(url, "/mixes.json");
    assert.equal(options?.cache, "no-store");
    return {
      ok: true,
      json: async () => payload
    };
  },
  console,
  encodeURIComponent,
  setTimeout,
  clearTimeout
};

vm.runInNewContext(source, context, { filename: "mix-catalogue.js" });
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(countElement.textContent, "2 mixes");
assert.equal(image.dataset.latestMixId, "BBBBBBBBBBB");
assert.equal(
  image.src,
  "/api/release-image?id=BBBBBBBBBBB&size=hero",
  "Collection artwork must use the newest released mix and request the high-resolution image endpoint"
);
assert.match(image.alt, /UK Rap Mashup 2 – In The Endz artwork/);
assert.equal(typeof image.onerror, "function");
image.onerror.call(image);
assert.equal(
  image.src,
  "https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg",
  "Artwork must fall back to the catalogue thumbnail if the high-resolution proxy fails"
);

assert.match(
  styles,
  /\.mix-card-media\{[^}]*aspect-ratio:16\/9[^}]*overflow:hidden[^}]*\}/s,
  "Mix cards must keep a fixed 16:9 media box"
);
assert.match(
  styles,
  /\.mix-card-media img\{[^}]*width:100%[^}]*height:100%[^}]*object-fit:cover[^}]*\}/s,
  "Mix artwork must fill the 16:9 box with object-fit: cover"
);

console.log("Mix cards automatically use the newest collection artwork at a responsive 16:9 crop.");
