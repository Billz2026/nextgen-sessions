import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payload = JSON.parse(fs.readFileSync(path.join(root, "releases.json"), "utf8"));
const releases = Array.isArray(payload.releases) ? payload.releases : [];

assert.ok(releases.length >= 80, `expected a substantial release catalogue, found ${releases.length}`);

let checked = 0;
for (const release of releases) {
  const relative = String(release.url || "").replace(/^\//, "") + "index.html";
  const pagePath = path.join(root, relative);
  assert.ok(fs.existsSync(pagePath), `missing release page ${relative}`);
  const source = fs.readFileSync(pagePath, "utf8");

  assert.ok(source.includes("<!-- RELEASE-DISCOVERY:START -->"), `${relative}: discovery block missing`);
  assert.ok(source.includes("<!-- RELEASE-RELATED-ARTISTS:START -->"), `${relative}: related-artist block missing`);
  assert.ok(source.includes('data-related-artists="true"'), `${relative}: related-artist marker missing`);

  const block = source.match(/<!-- RELEASE-RELATED-ARTISTS:START -->([\s\S]*?)<!-- RELEASE-RELATED-ARTISTS:END -->/)?.[1] || "";
  const links = [...block.matchAll(/href="(\/artists\/[^\"]+\/)"/g)].map((match) => match[1]);
  assert.ok(links.length >= 1 && links.length <= 3, `${relative}: expected 1-3 related artist links, found ${links.length}`);
  assert.equal(new Set(links).size, links.length, `${relative}: duplicate related artist links found`);
  for (const href of links) {
    const artistPage = path.join(root, href.replace(/^\//, ""), "index.html");
    assert.ok(fs.existsSync(artistPage), `${relative}: related artist target missing: ${href}`);
  }

  checked += 1;
}

const rudii = fs.readFileSync(path.join(root, "releases/rudii-marka-top-shotta/index.html"), "utf8");
const rudiiBlock = rudii.match(/<!-- RELEASE-RELATED-ARTISTS:START -->([\s\S]*?)<!-- RELEASE-RELATED-ARTISTS:END -->/)?.[1] || "";
for (const href of ["/artists/kemarco/", "/artists/reeko/", "/artists/javon-ranks/"]) {
  assert.ok(rudiiBlock.includes(`href="${href}"`), `Top Shotta should link to related artist ${href}`);
}
assert.ok(!rudiiBlock.includes('href="/artists/rudii-marka/"'), "Top Shotta must not recommend Rudii Marka as a related artist");

console.log(`Related-artist discovery passed: ${checked} release pages contain valid internal artist recommendations.`);
