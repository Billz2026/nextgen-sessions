import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://nextgensessions.com";
const ORG_ID = `${SITE}/#organization`;
const WEBSITE_ID = `${SITE}/#website`;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function graph(relativePath) {
  const html = read(relativePath);
  const matches = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*data-schema-graph=["']nextgen["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (matches.length !== 1) throw new Error(`${relativePath}: expected exactly one NextGen schema graph, found ${matches.length}`);
  let parsed;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch (error) {
    throw new Error(`${relativePath}: schema JSON is invalid: ${error.message}`);
  }
  if (parsed["@context"] !== "https://schema.org" || !Array.isArray(parsed["@graph"])) {
    throw new Error(`${relativePath}: expected schema.org @graph document`);
  }
  const raw = JSON.stringify(parsed);
  if (raw.includes("pages.dev") || raw.includes("http://nextgensessions.com") || raw.includes("https://www.nextgensessions.com")) {
    throw new Error(`${relativePath}: non-canonical domain leaked into schema`);
  }
  return parsed["@graph"];
}

function typeIncludes(node, type) {
  return node && (node["@type"] === type || (Array.isArray(node["@type"]) && node["@type"].includes(type)));
}

function findType(nodes, type) {
  return nodes.find((node) => typeIncludes(node, type));
}

function requireType(nodes, type, relativePath) {
  const node = findType(nodes, type);
  if (!node) throw new Error(`${relativePath}: missing ${type}`);
  return node;
}

function requireId(nodes, id, relativePath) {
  const node = nodes.find((item) => item?.["@id"] === id);
  if (!node) throw new Error(`${relativePath}: missing node ${id}`);
  return node;
}

const rosterSource = read("artists.js");
const rosterMatch = rosterSource.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
if (!rosterMatch) throw new Error("artists.js roster missing");
const roster = JSON.parse(rosterMatch[1]);
const releasePayload = JSON.parse(read("releases.json"));
const releases = releasePayload.releases || [];

const home = graph("index.html");
const org = requireId(home, ORG_ID, "index.html");
const website = requireId(home, WEBSITE_ID, "index.html");
requireType(home, "WebPage", "index.html");
if (org.url !== `${SITE}/` || website.publisher?.["@id"] !== ORG_ID) throw new Error("Homepage organization/website relationship is broken");

const artistsIndex = graph("artists/index.html");
requireType(artistsIndex, "CollectionPage", "artists/index.html");
const artistList = requireType(artistsIndex, "ItemList", "artists/index.html");
requireType(artistsIndex, "BreadcrumbList", "artists/index.html");
if (artistList.numberOfItems !== roster.length || artistList.itemListElement?.length !== roster.length) {
  throw new Error(`artists/index.html: schema artist count must be ${roster.length}`);
}

let artistPages = 0;
for (const artist of roster) {
  const relativePath = `artists/${artist.slug}/index.html`;
  const nodes = graph(relativePath);
  const musicGroup = requireType(nodes, "MusicGroup", relativePath);
  const page = requireType(nodes, "ProfilePage", relativePath);
  requireType(nodes, "BreadcrumbList", relativePath);
  const expectedId = `${SITE}/artists/${artist.slug}/#artist`;
  if (musicGroup["@id"] !== expectedId) throw new Error(`${relativePath}: wrong artist @id`);
  if (musicGroup.url !== `${SITE}/artists/${artist.slug}/`) throw new Error(`${relativePath}: wrong artist URL`);
  if (page.mainEntity?.["@id"] !== expectedId) throw new Error(`${relativePath}: ProfilePage does not point at artist entity`);
  artistPages += 1;
}

const releasesIndex = graph("releases/index.html");
requireType(releasesIndex, "CollectionPage", "releases/index.html");
const releaseList = requireType(releasesIndex, "ItemList", "releases/index.html");
if (releaseList.numberOfItems !== releases.length || releaseList.itemListElement?.length !== releases.length) {
  throw new Error(`releases/index.html: schema release count must be ${releases.length}`);
}

let releasePages = 0;
for (const release of releases) {
  const relativePath = `.${release.url}index.html`.replace(/^\.\//, "");
  const nodes = graph(relativePath);
  const recording = requireType(nodes, "MusicRecording", relativePath);
  const video = requireType(nodes, "VideoObject", relativePath);
  const page = requireType(nodes, "WebPage", relativePath);
  requireType(nodes, "BreadcrumbList", relativePath);
  const canonical = `${SITE}${release.url}`;
  if (recording["@id"] !== `${canonical}#recording`) throw new Error(`${relativePath}: recording @id mismatch`);
  if (recording.subjectOf?.["@id"] !== `${canonical}#video`) throw new Error(`${relativePath}: recording/video relation missing`);
  if (recording.publisher?.["@id"] !== ORG_ID || video.publisher?.["@id"] !== ORG_ID) throw new Error(`${relativePath}: publisher relation missing`);
  if (page.mainEntity?.["@id"] !== recording["@id"]) throw new Error(`${relativePath}: WebPage mainEntity mismatch`);
  if (recording.byArtist?.url && !recording.byArtist.url.startsWith(`${SITE}/artists/`)) throw new Error(`${relativePath}: artist relation is not canonical`);
  if (!video.contentUrl?.includes(release.id) || !video.embedUrl?.includes(release.id)) throw new Error(`${relativePath}: video ID mismatch`);
  releasePages += 1;
}

const genreIndex = graph("genres/index.html");
requireType(genreIndex, "CollectionPage", "genres/index.html");
const genreList = requireType(genreIndex, "ItemList", "genres/index.html");
if (genreList.numberOfItems !== 6) throw new Error("genres/index.html: expected six genre hubs");

const genreSlugs = ["uk-rap-grime", "hip-hop-g-funk", "dancehall", "reggae-lovers-rock", "rnb-soul", "global-sounds"];
let genrePages = 0;
for (const slug of genreSlugs) {
  const relativePath = `genres/${slug}/index.html`;
  const nodes = graph(relativePath);
  const page = requireType(nodes, "CollectionPage", relativePath);
  const list = requireType(nodes, "ItemList", relativePath);
  requireType(nodes, "BreadcrumbList", relativePath);
  if (!Array.isArray(page.mentions) || page.mentions.length < 1) throw new Error(`${relativePath}: artist mentions missing`);
  if (!Number.isInteger(list.numberOfItems) || list.numberOfItems < 1 || list.itemListElement?.length !== list.numberOfItems) {
    throw new Error(`${relativePath}: release ItemList is invalid`);
  }
  for (const item of list.itemListElement) {
    if (!item.item?.["@id"]?.startsWith(`${SITE}/releases/`)) throw new Error(`${relativePath}: non-release item in genre schema`);
  }
  genrePages += 1;
}

const mixIndex = graph("mixes/index.html");
requireType(mixIndex, "CollectionPage", "mixes/index.html");
const mixList = requireType(mixIndex, "ItemList", "mixes/index.html");
requireType(mixIndex, "BreadcrumbList", "mixes/index.html");

const mixDirs = fs.readdirSync(path.join(root, "mixes"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, "mixes", entry.name, "index.html")))
  .map((entry) => entry.name);
if (mixList.numberOfItems !== mixDirs.length || mixList.itemListElement?.length !== mixDirs.length) {
  throw new Error(`mixes/index.html: schema mix count must be ${mixDirs.length}`);
}

let mixPages = 0;
for (const slug of mixDirs) {
  const relativePath = `mixes/${slug}/index.html`;
  const nodes = graph(relativePath);
  const page = requireType(nodes, "WebPage", relativePath);
  requireType(nodes, "BreadcrumbList", relativePath);
  const main = nodes.find((node) => typeIncludes(node, "VideoObject") || typeIncludes(node, "MusicPlaylist"));
  if (!main) throw new Error(`${relativePath}: missing VideoObject or MusicPlaylist`);
  if (page.mainEntity?.["@id"] !== main["@id"]) throw new Error(`${relativePath}: mix WebPage mainEntity mismatch`);
  if (main.publisher?.["@id"] !== ORG_ID) throw new Error(`${relativePath}: mix publisher relation missing`);
  if (typeIncludes(main, "MusicPlaylist") && Array.isArray(main.track)) {
    for (const track of main.track) {
      if (track["@id"] && !track["@id"].startsWith(`${SITE}/releases/`)) throw new Error(`${relativePath}: playlist track reference is not canonical`);
    }
  }
  mixPages += 1;
}

console.log(`Schema graph validated: homepage, ${artistPages} artist pages, ${releasePages} release pages, ${genrePages} genre hubs, and ${mixPages} mix pages.`);
