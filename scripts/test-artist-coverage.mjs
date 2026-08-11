import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function runProfileFile(relativePath, context) {
  vm.runInContext(read(relativePath), context, { filename: relativePath });
}

const artistsSource = read("artists.js");
const artistsMatch = artistsSource.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(artistsMatch, "artists.js must expose window.NGS_ARTISTS");

const artists = JSON.parse(artistsMatch[1]);
const slugs = artists.map((artist) => artist.slug);
assert.equal(slugs.length, 32, "the roster should contain 32 artists");
assert.equal(new Set(slugs).size, slugs.length, "artist slugs must be unique");

const imageContext = vm.createContext({ window: {} });
vm.runInContext(read("artist-images.js"), imageContext, { filename: "artist-images.js" });
const imageMap = imageContext.window.NGS_ARTIST_IMAGES || {};
const portraitOverrides = new Set(
  fs.readdirSync(root)
    .filter((file) => file.endsWith("-portrait.js"))
    .flatMap((file) => {
      const source = read(file);
      return slugs.filter((slug) => source.includes(`NGS_ARTIST_IMAGES["${slug}"]`));
    }),
);

for (const artist of artists) {
  assert.ok(
    imageMap[artist.slug] || portraitOverrides.has(artist.slug),
    `${artist.name} must have a portrait mapping`,
  );
  assert.ok(
    fs.existsSync(path.join(root, "artists", artist.slug, "index.html")),
    `${artist.name} must have a published profile page`,
  );
}

const profileContext = vm.createContext({ window: {} });
runProfileFile("artist-profiles.js", profileContext);
runProfileFile("artist-profiles-expanded.js", profileContext);

for (const artist of artists) {
  const override = path.join("artists", artist.slug, "profile.js");
  if (fs.existsSync(path.join(root, override))) runProfileFile(override, profileContext);
}

const profiles = profileContext.window.NGS_ARTIST_PROFILES || {};
for (const artist of artists) {
  const profile = profiles[artist.slug];
  assert.ok(profile, `${artist.name} must have profile data`);
  assert.equal(profile.name, artist.name, `${artist.name} must use the roster name`);
  assert.equal(profile.path, `/artists/${artist.slug}/`, `${artist.name} must use its profile URL`);
  assert.ok(profile.genre, `${artist.name} must have a genre`);
  assert.ok(profile.headline, `${artist.name} must have a headline`);
  assert.ok(Array.isArray(profile.bio) && profile.bio.length, `${artist.name} must have a bio`);
  assert.ok(profile.image || profile.imageKey, `${artist.name} must reference a portrait`);
  assert.ok(profile.featuredVideo?.title, `${artist.name} must name a featured release`);

  const releaseDate = profile.featuredVideo.releaseDate
    ? Date.parse(profile.featuredVideo.releaseDate)
    : null;
  const isUpcoming = Number.isFinite(releaseDate) && releaseDate > Date.now();
  if (!isUpcoming) {
    assert.match(
      profile.featuredVideo.id || "",
      /^[A-Za-z0-9_-]{11}$/,
      `${artist.name}'s public featured release must have a valid YouTube video ID`,
    );
  }
}

console.log(`Artist coverage passed: ${artists.length} portraits, profiles and profile pages verified.`);
