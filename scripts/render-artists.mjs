import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artistsDir = path.join(root, "artists");

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

function formatDate(value) {
  if (!value) return "Official release";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Official release";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(date);
}

function loadRoster() {
  const source = read("artists.js");
  const match = source.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("artists.js must expose window.NGS_ARTISTS");
  return JSON.parse(match[1]);
}

function loadProfiles(roster) {
  const context = vm.createContext({ window: {} });
  for (const relativePath of ["artist-profiles.js", "artist-profiles-expanded.js"]) {
    if (!fs.existsSync(path.join(root, relativePath))) continue;
    vm.runInContext(read(relativePath), context, { filename: relativePath });
  }

  for (const artist of roster) {
    const relativePath = path.join("artists", artist.slug, "profile.js");
    if (!fs.existsSync(path.join(root, relativePath))) continue;
    vm.runInContext(read(relativePath), context, { filename: relativePath });
  }

  return context.window.NGS_ARTIST_PROFILES || {};
}

function loadImages() {
  const context = vm.createContext({ window: {} });
  if (fs.existsSync(path.join(root, "artist-images.js"))) {
    vm.runInContext(read("artist-images.js"), context, { filename: "artist-images.js" });
  }
  return context.window.NGS_ARTIST_IMAGES || {};
}

function aliasesFor(profile) {
  return [profile?.name, ...(Array.isArray(profile?.catalogueAliases) ? profile.catalogueAliases : [])]
    .map(normalise)
    .filter(Boolean);
}

function releaseMatchesProfile(release, profile) {
  const releaseArtist = normalise(release?.artist);
  if (!releaseArtist) return false;
  return aliasesFor(profile).some((alias) => {
    if (releaseArtist === alias) return true;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)(?:${escaped})(?:\\s|$|,|&|x|feat\\.?|ft\\.?)`, "i").test(releaseArtist);
  });
}

function releasesFor(profile, catalogue) {
  const matched = catalogue.filter((release) => releaseMatchesProfile(release, profile));
  const seen = new Set(matched.map((release) => release.id));
  const extras = Array.isArray(profile?.additionalReleases) ? profile.additionalReleases : [];

  for (const release of extras) {
    const id = String(release?.id || "").trim();
    if (!id || seen.has(id)) continue;
    matched.push({
      id,
      artist: release.artist || profile.name,
      title: release.title || profile.featuredVideo?.title || "Official release",
      group: release.group || profile.genre,
      published: release.published || "",
      slug: release.slug || "",
      url: release.url || "",
    });
    seen.add(id);
  }

  matched.sort((a, b) => {
    const aTime = Date.parse(a.published || "") || 0;
    const bTime = Date.parse(b.published || "") || 0;
    return bTime - aTime || String(a.title || "").localeCompare(String(b.title || ""), "en-GB");
  });
  return matched;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function releasePath(release) {
  if (String(release?.url || "").startsWith("/releases/")) return release.url;
  const slug = String(release?.slug || "").trim() || slugify(`${release?.artist || "release"}-${release?.title || "track"}`);
  return `/releases/${slug}/`;
}

function monogram(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join("") || "NG").toUpperCase();
}

function extractOgImage(html) {
  const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  return match ? match[1] : "";
}

function portraitFor(profile, imageMap, originalHtml) {
  const library = profile.imageKey ? imageMap[profile.imageKey] : null;
  return String(
    profile.image
      || library?.portrait
      || library?.src
      || extractOgImage(originalHtml)
      || "",
  ).trim();
}

function renderPortrait(profile, imageMap, originalHtml) {
  const src = portraitFor(profile, imageMap, originalHtml);
  const position = String(profile.imagePosition || imageMap[profile.imageKey]?.position || "50% 35%").trim();
  if (!src) {
    return `<div class="profile-image-shell profile-image-missing" aria-label="${escapeHtml(profile.name)} portrait unavailable"></div>`;
  }
  return `
      <div class="profile-image-shell">
        <img class="profile-image" src="${escapeHtml(src)}" alt="${escapeHtml(profile.name)} artist portrait" style="object-position:${escapeHtml(position)}">
        <div class="profile-image-label"><strong>${escapeHtml(profile.name)}</strong><span>${escapeHtml(profile.genre)}</span></div>
      </div>`;
}

function renderReleaseCard(release) {
  return `
        <article class="discography-card">
          <a class="discography-art" data-monogram="${escapeHtml(monogram(release.artist))}" href="${escapeHtml(releasePath(release))}" aria-label="View ${escapeHtml(release.title)} by ${escapeHtml(release.artist)}">
            <img loading="lazy" decoding="async" src="/api/release-image?id=${encodeURIComponent(release.id)}" alt="${escapeHtml(release.title)} by ${escapeHtml(release.artist)} artwork">
            <span class="discography-play-mark" aria-hidden="true">▶</span>
          </a>
          <div class="discography-card-body">
            <span class="discography-genre">${escapeHtml(release.group || "Official release")}</span>
            <h3>${escapeHtml(release.title)}</h3>
            <p>${escapeHtml(formatDate(release.published))}</p>
            <div class="discography-card-actions">
              <a href="${escapeHtml(releasePath(release))}">Release page →</a>
              <a href="https://www.youtube.com/watch?v=${encodeURIComponent(release.id)}" target="_blank" rel="noopener">YouTube ↗</a>
            </div>
          </div>
        </article>`;
}

function relatedProfile(profile, profileByName) {
  const related = Array.isArray(profile.related) ? profile.related : [];
  if (!related.length) return "";
  const cards = related.map((item) => {
    const target = profileByName.get(normalise(item.name));
    const href = target?.path || `https://www.youtube.com/results?search_query=${encodeURIComponent(`NextGen Sessions ${item.name}`)}`;
    const external = target?.path ? "" : ' target="_blank" rel="noopener"';
    return `
            <a class="related-card" href="${escapeHtml(href)}"${external}>
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.genre || "NextGen Sessions artist")}</span>
            </a>`;
  }).join("");
  return `
        <aside class="profile-related">
          <h3>Related artists</h3>
          <div class="related-list">${cards}
          </div>
        </aside>`;
}

function renderMain(slug, profile, releases, imageMap, originalHtml, profileByName) {
  const latest = releases[0] || null;
  const bio = Array.isArray(profile.bio) ? profile.bio : [];
  const bioMarkup = bio.map((paragraph) => `<p data-static-bio>${escapeHtml(paragraph)}</p>`).join("\n          ");
  const releaseMarkup = releases.length
    ? releases.map(renderReleaseCard).join("")
    : '<div class="discography-empty">No published catalogue releases are available for this artist yet.</div>';
  const latestAction = latest
    ? `<a class="button button-primary" href="${escapeHtml(releasePath(latest))}">Latest release: ${escapeHtml(latest.title)}</a>`
    : "";
  const youtubeAction = profile.youtubeUrl
    ? `<a class="button button-secondary" href="${escapeHtml(profile.youtubeUrl)}" target="_blank" rel="noopener">Explore on YouTube</a>`
    : "";

  return `<main class="profile-main" id="artistProfile" data-artist="${escapeHtml(slug)}" data-static-profile="true">
    <section class="profile-hero">
      <div>
        <a class="profile-back" href="/artists/">← Back to all artists</a>
        <span class="profile-genre">${escapeHtml(profile.genre)}</span>
        <h1 class="profile-title">${escapeHtml(profile.name)}</h1>
        <p class="profile-headline">${escapeHtml(profile.headline)}</p>
        <p class="profile-location">${escapeHtml(profile.location || "NextGen Sessions")}</p>
        <div class="discography-actions">${latestAction}${youtubeAction}</div>
      </div>
      ${renderPortrait(profile, imageMap, originalHtml)}
    </section>

    <section class="profile-section" id="artist-discography" aria-labelledby="artistDiscographyTitle">
      <div class="profile-section-heading profile-section-heading-split">
        <div>
          <p class="eyebrow">Official catalogue</p>
          <h2 id="artistDiscographyTitle">${escapeHtml(profile.name)} releases</h2>
          <p>Published NextGen Sessions releases from the verified catalogue.</p>
        </div>
        <span class="discography-count">${releases.length} release${releases.length === 1 ? "" : "s"}</span>
      </div>
      <div class="discography-grid">${releaseMarkup}
      </div>
    </section>

    <section class="profile-section" id="about-artist" aria-labelledby="aboutArtistTitle">
      <div class="profile-section-heading">
        <p class="eyebrow">Artist profile</p>
        <h2 id="aboutArtistTitle">About ${escapeHtml(profile.name)}</h2>
        <p>${escapeHtml(profile.headline)}</p>
      </div>
      <div class="profile-bio-grid">
        <div class="profile-bio">
          ${bioMarkup || `<p data-static-bio>${escapeHtml(profile.headline)}</p>`}
        </div>
        ${relatedProfile(profile, profileByName)}
      </div>
    </section>

    <section class="profile-section">
      <div class="profile-cta">
        <div>
          <p class="eyebrow">NextGen Sessions</p>
          <h2>Discover more original music.</h2>
          <p>Explore the full artist roster and verified release catalogue.</p>
        </div>
        <div class="discography-actions">
          <a class="button button-primary" href="/releases/">Browse releases</a>
          <a class="button button-secondary" href="/artists/">All artists</a>
        </div>
      </div>
    </section>
  </main>`;
}

function replaceMain(html, replacement) {
  const pattern = /<main\b[^>]*\bid=["']artistProfile["'][^>]*>[\s\S]*?<\/main>/i;
  if (!pattern.test(html)) throw new Error("artist page does not contain #artistProfile main element");
  return html.replace(pattern, replacement);
}

const roster = loadRoster();
const profiles = loadProfiles(roster);
const imageMap = loadImages();
const releasePayload = JSON.parse(read("releases.json"));
const catalogue = Array.isArray(releasePayload.releases) ? releasePayload.releases : [];
const profileByName = new Map(Object.values(profiles).map((profile) => [normalise(profile.name), profile]));
let rendered = 0;

for (const rosterArtist of roster) {
  const slug = rosterArtist.slug;
  const profile = profiles[slug];
  if (!profile) throw new Error(`Missing profile data for ${rosterArtist.name} (${slug})`);

  const pagePath = path.join(artistsDir, slug, "index.html");
  if (!fs.existsSync(pagePath)) throw new Error(`Missing artist page: artists/${slug}/index.html`);

  const originalHtml = fs.readFileSync(pagePath, "utf8");
  const releases = releasesFor(profile, catalogue);
  const main = renderMain(slug, profile, releases, imageMap, originalHtml, profileByName);
  const nextHtml = replaceMain(originalHtml, main);
  fs.writeFileSync(pagePath, nextHtml);
  rendered += 1;
}

console.log(`Rendered ${rendered} crawlable artist profiles from the shared profile data and verified catalogue.`);
