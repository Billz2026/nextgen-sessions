import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pagePath = path.join(root, "artists", "index.html");

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

function loadRoster() {
  const source = read("artists.js");
  const match = source.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("artists.js must expose window.NGS_ARTISTS");
  return JSON.parse(match[1]);
}

function loadImages() {
  const context = vm.createContext({ window: {} });
  const imagePath = path.join(root, "artist-images.js");
  if (fs.existsSync(imagePath)) {
    vm.runInContext(read("artist-images.js"), context, { filename: "artist-images.js" });
  }
  return context.window.NGS_ARTIST_IMAGES || {};
}

function renderCard(artist, images) {
  const image = images[artist.slug];
  const hasImage = Boolean(image?.src);
  const fallback = image?.fallback ? ` data-fallback="${escapeHtml(image.fallback)}"` : "";
  const srcset = image?.srcset
    ? ` srcset="${escapeHtml(image.srcset)}" sizes="(max-width: 720px) calc(50vw - 28px), (max-width: 980px) 33vw, 25vw"`
    : "";
  const position = escapeHtml(image?.position || "50% 38%");
  const portrait = hasImage
    ? `<img class="artist-roster-image featured-artist-image" loading="lazy" decoding="async" src="${escapeHtml(image.src)}"${srcset}${fallback} alt="${escapeHtml(artist.name)} portrait" style="--artist-image-position:${position}">`
    : "";

  return `
      <a class="artist-roster-card${hasImage ? " has-image" : ""}" href="/artists/${escapeHtml(artist.slug)}/" aria-label="View ${escapeHtml(artist.name)} artist profile">
        ${portrait}
        <div class="artist-roster-copy">
          <span class="artist-genre">${escapeHtml(artist.genre)}</span>
          <h3>${escapeHtml(artist.name)}</h3>
          <p>${escapeHtml(artist.summary)}</p>
        </div>
      </a>`;
}

function renderRoster(artists, images) {
  const sorted = [...artists].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  return sorted.map((artist) => renderCard(artist, images)).join("");
}

function installRoster(html, rosterMarkup) {
  const start = "<!-- NEXTGEN-ARTIST-ROSTER:START -->";
  const end = "<!-- NEXTGEN-ARTIST-ROSTER:END -->";
  const block = `${start}${rosterMarkup}\n    ${end}`;

  if (html.includes(start) && html.includes(end)) {
    return html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block);
  }

  const emptyGrid = /<div class="artist-roster-grid" id="artistRosterGrid" aria-live="polite"><\/div>/;
  if (!emptyGrid.test(html)) {
    throw new Error("artists/index.html must contain the artist roster grid or static roster markers");
  }
  return html.replace(
    emptyGrid,
    `<div class="artist-roster-grid" id="artistRosterGrid" aria-live="polite" data-static-roster="true">${block}\n    </div>`,
  );
}

const artists = loadRoster();
const images = loadImages();
let html = fs.readFileSync(pagePath, "utf8");
html = installRoster(html, renderRoster(artists, images));
html = html.replace(/<div class="roster-count" id="rosterCount">[^<]*<\/div>/, `<div class="roster-count" id="rosterCount">${artists.length} artists</div>`);
html = html.replace(/<noscript><p class="catalogue-note">Enable JavaScript to browse the full artist roster\.<\/p><\/noscript>/, "<noscript><p class=\"catalogue-note\">All artist profiles remain available without JavaScript.</p></noscript>");
fs.writeFileSync(pagePath, html);

console.log(`Rendered ${artists.length} crawlable artist cards into artists/index.html.`);
