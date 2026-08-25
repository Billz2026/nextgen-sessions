import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function normalise(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const artistsSource = read("artists.js");
const artistsMatch = artistsSource.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(artistsMatch, "artists.js must expose window.NGS_ARTISTS");
const artists = JSON.parse(artistsMatch[1]);
assert.ok(artists.length >= 30, `expected a substantial roster, found ${artists.length}`);

const profileContext = vm.createContext({ window: {} });
for (const relativePath of ["artist-profiles.js", "artist-profiles-expanded.js"]) {
  if (fs.existsSync(path.join(root, relativePath))) {
    vm.runInContext(read(relativePath), profileContext, { filename: relativePath });
  }
}
for (const artist of artists) {
  const relativePath = path.join("artists", artist.slug, "profile.js");
  if (fs.existsSync(path.join(root, relativePath))) {
    vm.runInContext(read(relativePath), profileContext, { filename: relativePath });
  }
}
const profiles = profileContext.window.NGS_ARTIST_PROFILES || {};

const catalogue = JSON.parse(read("releases.json")).releases || [];
const catalogueUrls = new Set(catalogue.map((release) => release.url).filter(Boolean));

function releasesFor(profile) {
  const aliases = [profile.name, ...(profile.catalogueAliases || [])].map(normalise).filter(Boolean);
  return catalogue.filter((release) => {
    const releaseArtist = normalise(release.artist);
    return aliases.some((alias) => releaseArtist === alias || releaseArtist.includes(alias));
  });
}

for (const artist of artists) {
  const profile = profiles[artist.slug];
  assert.ok(profile, `${artist.name} must have profile data`);
  const page = read(path.join("artists", artist.slug, "index.html"));

  assert.ok(
    page.includes('data-static-profile="true"'),
    `${artist.name} must ship a pre-rendered artist profile`,
  );
  assert.ok(
    !page.includes("Loading artist profile"),
    `${artist.name} must not ship the old loading-only placeholder`,
  );
  assert.ok(
    page.includes(`<h1 class="profile-title">${escapeHtml(artist.name)}</h1>`),
    `${artist.name} must expose its H1 in HTML`,
  );
  assert.ok(
    page.includes(escapeHtml(profile.headline)),
    `${artist.name} must expose its headline in HTML`,
  );
  assert.ok(page.includes('id="artist-discography"'), `${artist.name} must expose a crawlable discography section`);
  assert.ok(page.includes('id="about-artist"'), `${artist.name} must expose a crawlable biography section`);
  assert.ok(page.includes("data-static-bio"), `${artist.name} must expose biography copy in HTML`);

  const staticMain = page.match(/<main\b[^>]*\bid=["']artistProfile["'][^>]*>[\s\S]*?<\/main>/i)?.[0] || "";
  const releaseLinks = [...staticMain.matchAll(/href=["'](\/releases\/[^"']*)["']/g)].map((match) => match[1]);
  for (const url of releaseLinks) {
    if (url === "/releases/") continue;
    assert.ok(catalogueUrls.has(url), `${artist.name} must not expose non-catalogue release URL ${url}`);
  }

  const published = releasesFor(profile);
  if (published.length) {
    const latest = [...published].sort((a, b) => (Date.parse(b.published || "") || 0) - (Date.parse(a.published || "") || 0))[0];
    assert.ok(page.includes(escapeHtml(latest.title)), `${artist.name} must expose its latest catalogue release in HTML`);
    assert.ok(page.includes(latest.url), `${artist.name} must link to its latest release page in HTML`);
  }
}

console.log(`Static artist render passed: ${artists.length} artist pages expose crawlable profile, biography and verified discography content.`);
