import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function metaDescription(html) {
  const direct = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (direct) return decodeHtml(direct[1]);
  const reverse = html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  return reverse ? decodeHtml(reverse[1]) : "";
}

function pageH1(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripTags(match[1]) : "";
}

function loadArtists() {
  const source = read("artists.js");
  const match = source.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("artists.js must expose window.NGS_ARTISTS");
  return JSON.parse(match[1]);
}

const GENRES = [
  { slug: "uk-rap-grime", name: "UK Rap & Grime", keywords: ["UK rap", "grime", "London rap"] },
  { slug: "hip-hop-g-funk", name: "Hip-Hop & G-Funk", keywords: ["hip hop", "G-Funk", "West Coast", "New York"] },
  { slug: "dancehall", name: "Dancehall", keywords: ["Jamaican dancehall", "bashment", "gully"] },
  { slug: "reggae-lovers-rock", name: "Reggae & Lovers Rock", keywords: ["reggae", "lovers rock", "Jamaica"] },
  { slug: "rnb-soul", name: "R&B & Soul", keywords: ["R&B", "soul", "rhythm and blues"] },
  { slug: "global-sounds", name: "Global Sounds", keywords: ["Punjabi", "South Asian", "Arabic", "Afro"] },
];

const artists = loadArtists();
const releasePayload = JSON.parse(read("releases.json"));
const releases = Array.isArray(releasePayload.releases) ? releasePayload.releases : [];
const mixPayload = JSON.parse(read("mixes.json"));
const catalogueMixes = Array.isArray(mixPayload.mixes) ? mixPayload.mixes : [];

function mixGroup(html) {
  const tags = String(html || "").match(/<[^>]+>/g) || [];
  for (const tag of tags) {
    if (!tag.includes('data-source="/mixes.json"') || !tag.includes('data-source-type="mixes"')) continue;
    const match = tag.match(/data-group="([^"]+)"/i);
    if (match) return match[1].trim();
  }
  return "";
}

function mixLeadTitle(item) {
  const raw = String(item?.rawTitle || "").trim();
  if (raw) return raw.split("|")[0].trim();
  return String(item?.title || "").trim();
}

const artistItems = artists.map((artist) => ({
  type: "artist",
  title: artist.name,
  subtitle: artist.genre || "Artist",
  description: artist.summary || "NextGen Sessions artist profile.",
  url: `/artists/${artist.slug}/`,
  keywords: [artist.name, artist.genre, artist.summary].filter(Boolean),
}));

const releaseItems = releases.map((release) => ({
  type: "release",
  title: release.title,
  subtitle: release.artist,
  description: `${release.group || "Release"}${release.published ? ` · ${String(release.published).slice(0, 10)}` : ""}`,
  url: release.url,
  date: release.published || "",
  keywords: [release.artist, release.group, release.rawTitle, release.title].filter(Boolean),
}));

const genreItems = GENRES.map((genre) => {
  const relative = `genres/${genre.slug}/index.html`;
  const html = read(relative);
  return {
    type: "genre",
    title: genre.name,
    subtitle: "Genre hub",
    description: metaDescription(html) || `Explore ${genre.name} on NextGen Sessions.`,
    url: `/genres/${genre.slug}/`,
    keywords: [genre.name, ...genre.keywords],
  };
});

const mixesRoot = path.join(root, "mixes");
const mixItems = fs.readdirSync(mixesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const relative = path.join("mixes", entry.name, "index.html");
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return null;
    const html = fs.readFileSync(absolute, "utf8");
    const title = pageH1(html) || entry.name.replaceAll("-", " ");
    const description = metaDescription(html) || "Long-form NextGen Sessions listening page.";
    const group = mixGroup(html);
    const collectionMixes = group
      ? catalogueMixes.filter((item) => String(item?.collection || "").trim() === group)
      : [];
    const collectionKeywords = collectionMixes.flatMap((item) => [
      mixLeadTitle(item),
      item?.title,
      item?.rawTitle,
      item?.label,
      item?.name,
    ]).filter(Boolean);
    return {
      type: "mix",
      title,
      subtitle: "Mix / collection",
      description,
      url: `/mixes/${entry.name}/`,
      keywords: [title, description, entry.name.replaceAll("-", " "), ...collectionKeywords],
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.title.localeCompare(b.title));

const items = [
  ...artistItems.sort((a, b) => a.title.localeCompare(b.title)),
  ...releaseItems,
  ...genreItems,
  ...mixItems,
];

const output = {
  generatedAt: new Date().toISOString(),
  total: items.length,
  counts: {
    artists: artistItems.length,
    releases: releaseItems.length,
    genres: genreItems.length,
    mixes: mixItems.length,
  },
  items,
};

fs.writeFileSync(path.join(root, "search-index.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Search index built: ${output.total} items (${artistItems.length} artists, ${releaseItems.length} releases, ${genreItems.length} genres, ${mixItems.length} mixes).`);
