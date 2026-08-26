import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const START = "<!-- RELEASE-RELATED-ARTISTS:START -->";
const END = "<!-- RELEASE-RELATED-ARTISTS:END -->";

const LANE_TERMS = {
  "UK Rap & Grime": ["uk rap", "grime"],
  "Hip-Hop / G-Funk": ["hip-hop", "g-funk", "west coast"],
  Dancehall: ["dancehall"],
  Reggae: ["reggae", "lovers rock"],
  "Lovers Rock": ["reggae", "lovers rock"],
  "R&B & Soul": ["r&b", "soul"],
  Asian: ["punjabi", "south asian", "asian"],
  Arabic: ["arabic", "oud"],
  "Late Night Afro": ["afro"],
  "Late Night Vibes": ["r&b", "afro", "hip-hop"],
};

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

function loadRoster() {
  const source = read("artists.js");
  const match = source.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("artists.js must expose window.NGS_ARTISTS");
  return JSON.parse(match[1]);
}

function loadProfiles(roster) {
  const context = vm.createContext({ window: {} });
  for (const relativePath of ["artist-profiles.js", "artist-profiles-expanded.js"]) {
    if (fs.existsSync(path.join(root, relativePath))) {
      vm.runInContext(read(relativePath), context, { filename: relativePath });
    }
  }
  for (const artist of roster) {
    const relativePath = path.join("artists", artist.slug, "profile.js");
    if (fs.existsSync(path.join(root, relativePath))) {
      vm.runInContext(read(relativePath), context, { filename: relativePath });
    }
  }
  return context.window.NGS_ARTIST_PROFILES || {};
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

function profileForRelease(release, profiles) {
  for (const [slug, profile] of Object.entries(profiles)) {
    if (releaseMatchesProfile(release, profile)) return { slug, profile };
  }
  return null;
}

function buildProfileIndexes(roster, profiles) {
  const byName = new Map();
  const bySlug = new Map();
  for (const artist of roster) {
    const profile = profiles[artist.slug];
    if (!profile) continue;
    const item = { slug: artist.slug, roster: artist, profile };
    bySlug.set(artist.slug, item);
    byName.set(normalise(profile.name || artist.name), item);
    byName.set(normalise(artist.name), item);
  }
  return { byName, bySlug };
}

function relatedArtists(release, profileInfo, roster, profiles, indexes) {
  const selected = [];
  const seen = new Set(profileInfo?.slug ? [profileInfo.slug] : []);

  function add(item) {
    if (!item || seen.has(item.slug)) return;
    const page = path.join(root, "artists", item.slug, "index.html");
    if (!fs.existsSync(page)) return;
    seen.add(item.slug);
    selected.push(item);
  }

  for (const relation of profileInfo?.profile?.related || []) {
    add(indexes.byName.get(normalise(relation?.name)));
    if (selected.length >= 3) return selected;
  }

  const terms = LANE_TERMS[release.group] || [];
  const fallback = roster
    .filter((artist) => {
      if (seen.has(artist.slug)) return false;
      const genre = normalise(artist.genre);
      return terms.some((term) => genre.includes(term));
    })
    .sort((a, b) => {
      const aRank = a.featured ? Number(a.featuredRank || 999) : 1999;
      const bRank = b.featured ? Number(b.featuredRank || 999) : 1999;
      return aRank - bRank || String(a.name).localeCompare(String(b.name), "en-GB");
    });

  for (const artist of fallback) {
    add(indexes.bySlug.get(artist.slug));
    if (selected.length >= 3) break;
  }

  return selected;
}

function artistCard(item) {
  const name = item.profile.name || item.roster.name;
  const genre = item.profile.genre || item.roster.genre || "NextGen Sessions artist";
  return `<a class="release-related-card" href="/artists/${escapeHtml(item.slug)}/"><span>${escapeHtml(genre)}</span><strong>${escapeHtml(name)}</strong><small>View artist profile →</small></a>`;
}

function relatedBlock(release, profileInfo, artists) {
  const artistName = profileInfo?.profile?.name || release.artist;
  const cards = artists.map(artistCard).join("");
  if (!cards) {
    throw new Error(`${release.artist} — ${release.title}: unable to resolve any related artist profiles`);
  }
  return `${START}
    <div class="release-related-subsection" data-related-artists="true">
      <div class="section-heading"><p class="eyebrow">Related artists</p><h2>Artists connected to ${escapeHtml(artistName)}</h2><p>Continue into artist profiles with a related sound, scene or catalogue lane.</p></div>
      <div class="release-related-grid">${cards}</div>
    </div>
    ${END}`;
}

function replaceOrInsert(source, block) {
  if (source.includes(START) && source.includes(END)) {
    const pattern = new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    return source.replace(pattern, block);
  }

  const anchor = /\n  <\/section>\n  <nav class="release-chronology"/;
  if (!anchor.test(source)) {
    throw new Error("Release page is missing the discovery section / chronology insertion point");
  }
  return source.replace(anchor, `\n    ${block}\n  </section>\n  <nav class="release-chronology"`);
}

const roster = loadRoster();
const profiles = loadProfiles(roster);
const indexes = buildProfileIndexes(roster, profiles);
const payload = JSON.parse(read("releases.json"));
const releases = Array.isArray(payload.releases) ? payload.releases : [];

let rendered = 0;
for (const release of releases) {
  const relative = String(release.url || "").replace(/^\//, "") + "index.html";
  const pagePath = path.join(root, relative);
  if (!fs.existsSync(pagePath)) throw new Error(`Missing release page: ${relative}`);

  const profileInfo = profileForRelease(release, profiles);
  const related = relatedArtists(release, profileInfo, roster, profiles, indexes);
  const block = relatedBlock(release, profileInfo, related);
  const source = fs.readFileSync(pagePath, "utf8");
  const next = replaceOrInsert(source, block);
  fs.writeFileSync(pagePath, next);
  rendered += 1;
}

console.log(`Related-artist discovery rendered on ${rendered} release pages.`);
