import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_RE = /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*data-schema-graph=["']nextgen["'][^>]*>)([\s\S]*?)(<\/script>)/i;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, "utf8");
}

function updateGraph(relativePath, mutator) {
  const html = read(relativePath);
  const match = SCHEMA_RE.exec(html);
  if (!match) throw new Error(`${relativePath}: NextGen schema graph missing`);
  const doc = JSON.parse(match[2]);
  if (!Array.isArray(doc?.["@graph"])) throw new Error(`${relativePath}: invalid @graph`);
  mutator(doc["@graph"]);
  const json = JSON.stringify(doc).replaceAll("</", "<\\/");
  write(relativePath, html.replace(SCHEMA_RE, `${match[1]}${json}${match[3]}`));
}

function isIdentityUrl(value) {
  const url = String(value || "").trim();
  if (!/^https:\/\//i.test(url)) return false;
  if (/youtube\.com\/results\?/i.test(url)) return false;
  return true;
}

let artistPages = 0;
for (const entry of fs.readdirSync(path.join(root, "artists"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const relativePath = `artists/${entry.name}/index.html`;
  if (!fs.existsSync(path.join(root, relativePath))) continue;
  updateGraph(relativePath, (nodes) => {
    const artist = nodes.find((node) => node?.["@type"] === "MusicGroup");
    if (!artist) return;
    if (Array.isArray(artist.sameAs)) {
      const clean = artist.sameAs.filter(isIdentityUrl);
      if (clean.length) artist.sameAs = clean;
      else delete artist.sameAs;
    }
  });
  artistPages += 1;
}

const mixPayload = fs.existsSync(path.join(root, "mixes.json")) ? JSON.parse(read("mixes.json")) : { mixes: [] };
const mixById = new Map((mixPayload.mixes || []).map((mix) => [String(mix.id), mix]));
let mixPages = 0;

for (const entry of fs.readdirSync(path.join(root, "mixes"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const relativePath = `mixes/${entry.name}/index.html`;
  if (!fs.existsSync(path.join(root, relativePath))) continue;
  updateGraph(relativePath, (nodes) => {
    const video = nodes.find((node) => node?.["@type"] === "VideoObject");
    if (!video) return;
    const idMatch = String(video.contentUrl || "").match(/[?&]v=([A-Za-z0-9_-]{6,20})/);
    const mix = idMatch ? mixById.get(idMatch[1]) : null;
    if (mix?.thumbnail) video.thumbnailUrl = mix.thumbnail;
  });
  mixPages += 1;
}

console.log(`Refined schema quality across ${artistPages} artist pages and ${mixPages} mix pages.`);
