import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH_RE = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*data-schema-graph=["']nextgen["'][^>]*>([\s\S]*?)<\/script>/i;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function nodes(relativePath) {
  const match = GRAPH_RE.exec(read(relativePath));
  if (!match) throw new Error(`${relativePath}: schema graph missing`);
  const doc = JSON.parse(match[1]);
  return doc["@graph"] || [];
}

let artistPages = 0;
for (const entry of fs.readdirSync(path.join(root, "artists"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const relativePath = `artists/${entry.name}/index.html`;
  if (!fs.existsSync(path.join(root, relativePath))) continue;
  const artist = nodes(relativePath).find((node) => node?.["@type"] === "MusicGroup");
  if (!artist) continue;
  for (const url of artist.sameAs || []) {
    if (/youtube\.com\/results\?/i.test(String(url))) throw new Error(`${relativePath}: search-results URL must not be used as sameAs`);
  }
  artistPages += 1;
}

const knownMix = nodes("mixes/uk-rap-mashup-series-1/index.html").find((node) => node?.["@type"] === "VideoObject");
if (!knownMix) throw new Error("UK Rap mix VideoObject missing");
if (knownMix.thumbnailUrl !== "https://i.ytimg.com/vi/0nnoKsnkQok/hqdefault.jpg") {
  throw new Error(`UK Rap mix must use its actual YouTube thumbnail, got ${knownMix.thumbnailUrl}`);
}

console.log(`Schema quality validated: ${artistPages} artist identity graphs and authoritative long-mix thumbnail.`);
