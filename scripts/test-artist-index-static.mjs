import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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

const artistsSource = read("artists.js");
const artistsMatch = artistsSource.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(artistsMatch, "artists.js must expose window.NGS_ARTISTS");
const artists = JSON.parse(artistsMatch[1]);
const page = read("artists/index.html");

assert.ok(page.includes('data-static-roster="true"'), "artists index must ship a pre-rendered roster");
assert.ok(page.includes("<!-- NEXTGEN-ARTIST-ROSTER:START -->"), "artists index must expose roster start marker");
assert.ok(page.includes("<!-- NEXTGEN-ARTIST-ROSTER:END -->"), "artists index must expose roster end marker");
assert.ok(!page.includes("Enable JavaScript to browse the full artist roster"), "artists index must not depend on JavaScript for roster discovery");

const staticBlock = page.match(/<!-- NEXTGEN-ARTIST-ROSTER:START -->([\s\S]*?)<!-- NEXTGEN-ARTIST-ROSTER:END -->/)?.[1] || "";
const cardCount = (staticBlock.match(/class="artist-roster-card(?:\s|\")/g) || []).length;
assert.equal(cardCount, artists.length, `expected ${artists.length} static artist cards, found ${cardCount}`);

const sorted = [...artists].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
let previousIndex = -1;
for (const artist of sorted) {
  const href = `/artists/${artist.slug}/`;
  assert.ok(staticBlock.includes(`href="${href}"`), `${artist.name} must have a crawlable profile link`);
  assert.ok(staticBlock.includes(`<h3>${escapeHtml(artist.name)}</h3>`), `${artist.name} must expose its name in HTML`);
  assert.ok(staticBlock.includes(escapeHtml(artist.genre)), `${artist.name} must expose its genre in HTML`);
  assert.ok(staticBlock.includes(escapeHtml(artist.summary)), `${artist.name} must expose its summary in HTML`);
  const currentIndex = staticBlock.indexOf(`<h3>${escapeHtml(artist.name)}</h3>`);
  assert.ok(currentIndex > previousIndex, `${artist.name} must appear in the expected alphabetical order`);
  previousIndex = currentIndex;
}

console.log(`Static artist index passed: ${artists.length} crawlable roster cards with profile links, genre and summaries.`);
