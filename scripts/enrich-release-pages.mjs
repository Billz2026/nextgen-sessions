import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EDITORIAL_START = "<!-- RELEASE-EDITORIAL:START -->";
const EDITORIAL_END = "<!-- RELEASE-EDITORIAL:END -->";
const DISCOVERY_START = "<!-- RELEASE-DISCOVERY:START -->";
const DISCOVERY_END = "<!-- RELEASE-DISCOVERY:END -->";
const BREADCRUMB_START = "<!-- RELEASE-BREADCRUMBS:START -->";
const BREADCRUMB_END = "<!-- RELEASE-BREADCRUMBS:END -->";
const CSS_VERSION = "20260825-editorial1";

const LANES = {
  "UK Rap & Grime": { slug: "uk-rap-grime", name: "UK Rap & Grime", groups: ["UK Rap & Grime"] },
  "Hip-Hop / G-Funk": { slug: "hip-hop-g-funk", name: "Hip-Hop & G-Funk", groups: ["Hip-Hop / G-Funk"] },
  Dancehall: { slug: "dancehall", name: "Dancehall", groups: ["Dancehall"] },
  Reggae: { slug: "reggae-lovers-rock", name: "Reggae & Lovers Rock", groups: ["Reggae", "Lovers Rock"] },
  "Lovers Rock": { slug: "reggae-lovers-rock", name: "Reggae & Lovers Rock", groups: ["Reggae", "Lovers Rock"] },
  "R&B & Soul": { slug: "rnb-soul", name: "R&B & Soul", groups: ["R&B & Soul"] },
  Asian: { slug: "global-sounds", name: "Global Sounds", groups: ["Asian", "Arabic", "Late Night Afro", "Late Night Vibes"] },
  Arabic: { slug: "global-sounds", name: "Global Sounds", groups: ["Asian", "Arabic", "Late Night Afro", "Late Night Vibes"] },
  "Late Night Afro": { slug: "global-sounds", name: "Global Sounds", groups: ["Asian", "Arabic", "Late Night Afro", "Late Night Vibes"] },
  "Late Night Vibes": { slug: "global-sounds", name: "Global Sounds", groups: ["Asian", "Arabic", "Late Night Afro", "Late Night Vibes"] },
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

function formatDate(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "Official release";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(date);
}

function formatDuration(seconds) {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total) || total <= 0) return "Full-length release";
  const minutes = Math.floor(total / 60);
  const remainder = Math.floor(total % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function isoDuration(seconds) {
  const total = Math.floor(Number(seconds || 0));
  if (!Number.isFinite(total) || total <= 0) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${secs || (!hours && !minutes) ? `${secs}S` : ""}`;
}

function loadRosterAndProfiles() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(read("artists.js"), context, { filename: "artists.js" });
  const roster = Array.isArray(context.window.NGS_ARTISTS) ? context.window.NGS_ARTISTS : [];

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
  return { roster, profiles: context.window.NGS_ARTIST_PROFILES || {} };
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

function campaignLine(release) {
  const pieces = String(release.rawTitle || "").split("|").map((part) => part.trim()).filter(Boolean);
  if (pieces.length < 2) return "";
  const first = pieces[0];
  const firstNormal = normalise(first);
  const artistNormal = normalise(release.artist);
  const titleNormal = normalise(release.title);
  if (firstNormal.includes(artistNormal) && firstNormal.includes(titleNormal)) return "";
  if (first.length < 4 || first.length > 90) return "";
  return first;
}

function metaDescription(release) {
  const released = formatDate(release.published);
  const value = `${release.title} by ${release.artist}: official ${release.group} release on NextGen Sessions, released ${released}. Watch the full video and explore related releases.`;
  return value.length <= 175 ? value : `${release.title} by ${release.artist}: official ${release.group} release on NextGen Sessions. Watch the full video and explore the artist catalogue.`;
}

function replaceMetaDescription(source, description) {
  const escaped = escapeHtml(description);
  source = source.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${escaped}">`);
  source = source.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:description" content="${escaped}">`);
  source = source.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:description" content="${escaped}">`);
  return source;
}

function updateMusicSchema(source, release, profileInfo) {
  let updated = false;
  return source.replace(/(<script\s+type="application\/ld\+json">)([\s\S]*?)(<\/script>)/gi, (full, open, payload, close) => {
    if (updated) return full;
    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      return full;
    }
    if (data?.["@type"] !== "MusicRecording") return full;
    const duration = isoDuration(release.durationSeconds);
    if (duration) data.duration = duration;
    if (profileInfo?.slug && data.byArtist && typeof data.byArtist === "object") {
      data.byArtist.url = `https://nextgensessions.com/artists/${profileInfo.slug}/`;
    }
    data.isPartOf = {
      "@type": "CollectionPage",
      name: "NextGen Sessions release catalogue",
      url: "https://nextgensessions.com/releases/",
    };
    updated = true;
    const json = JSON.stringify(data).replaceAll("</", "<\\/");
    return `${open}${json}${close}`;
  });
}

function breadcrumbMarkup(release, lane, profileInfo) {
  const elements = [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://nextgensessions.com/" },
    { "@type": "ListItem", position: 2, name: "Releases", item: "https://nextgensessions.com/releases/" },
  ];
  if (profileInfo?.slug) {
    elements.push({
      "@type": "ListItem",
      position: 3,
      name: profileInfo.profile.name || release.artist,
      item: `https://nextgensessions.com/artists/${profileInfo.slug}/`,
    });
  }
  elements.push({
    "@type": "ListItem",
    position: elements.length + 1,
    name: release.title,
    item: `https://nextgensessions.com${release.url}`,
  });
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements,
  };
  return `${BREADCRUMB_START}\n  <script type="application/ld+json">${JSON.stringify(schema).replaceAll("</", "<\\/")}</script>\n  ${BREADCRUMB_END}`;
}

function replaceMarkedBlock(source, start, end, block, insertPattern = null) {
  if (source.includes(start) && source.includes(end)) {
    const pattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    return source.replace(pattern, block);
  }
  if (!insertPattern) return source;
  return source.replace(insertPattern, (match) => `${match}\n  ${block}`);
}

function fact(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`;
}

function recommendationCard(item) {
  return `<a class="release-related-card" href="${escapeHtml(item.url)}"><span>${escapeHtml(item.group)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.artist)}</small></a>`;
}

function chronologyCard(item, label) {
  if (!item) return "";
  return `<a class="release-chronology-card" href="${escapeHtml(item.url)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(item.artist)} — ${escapeHtml(item.title)}</strong></a>`;
}

function editorialBlock(release, profileInfo, artistReleases, laneReleases, lane) {
  const duration = formatDuration(release.durationSeconds);
  const released = formatDate(release.published);
  const hook = campaignLine(release);
  const profile = profileInfo?.profile || null;
  const artistProfileUrl = profileInfo?.slug ? `/artists/${profileInfo.slug}/` : "";
  const artistName = profile?.name || release.artist;
  const artistContext = Array.isArray(profile?.bio) && profile.bio[0]
    ? profile.bio[0]
    : (profile?.headline || `Explore ${artistName}'s artist page for the verified discography and current NextGen Sessions profile.`);
  const location = String(profile?.location || "").trim();
  const laneHref = `/genres/${lane.slug}/`;

  const facts = [
    fact("Artist", artistProfileUrl ? `<a href="${escapeHtml(artistProfileUrl)}">${escapeHtml(artistName)}</a>` : escapeHtml(release.artist)),
    fact("Genre", `<a href="${escapeHtml(laneHref)}">${escapeHtml(lane.name)}</a>`),
    fact("Released", escapeHtml(released)),
    fact("Duration", escapeHtml(duration)),
    fact("Artist catalogue", `${artistReleases.length} verified release${artistReleases.length === 1 ? "" : "s"}`),
    fact("Genre hub", `${laneReleases.length} published release${laneReleases.length === 1 ? "" : "s"}`),
  ];
  if (location && !/undisclosed/i.test(location)) facts.splice(2, 0, fact("Artist location", escapeHtml(location)));

  return `${EDITORIAL_START}
  <section class="release-editorial" aria-labelledby="release-about-title" data-release-editorial="true">
    <div class="release-editorial-copy">
      <p class="eyebrow">About the release</p>
      <h2 id="release-about-title">${escapeHtml(release.title)} on NextGen Sessions</h2>
      <p><strong>${escapeHtml(release.title)}</strong> is an official ${escapeHtml(release.group)} release by ${escapeHtml(release.artist)}, published on ${escapeHtml(released)}. The verified full-length release video runs ${escapeHtml(duration)} and can be played on this page or opened directly on YouTube.</p>
      ${hook ? `<p class="release-launch-line"><span>Launch line</span>“${escapeHtml(hook)}”</p>` : ""}
      <p class="release-artist-context"><strong>Artist context.</strong> ${escapeHtml(artistContext)}${artistProfileUrl ? ` <a href="${escapeHtml(artistProfileUrl)}">Explore ${escapeHtml(artistName)}'s full profile.</a>` : ""}</p>
      <p class="release-catalogue-context">This release is one of ${artistReleases.length} verified full-length ${artistReleases.length === 1 ? "release" : "releases"} by ${escapeHtml(artistName)} in the NextGen Sessions catalogue. The ${escapeHtml(lane.name)} hub currently brings together ${laneReleases.length} published ${laneReleases.length === 1 ? "release" : "releases"}, giving this page a direct route into the wider sound and related artists.</p>
    </div>
    <aside class="release-facts" aria-label="Release details">
      <p class="eyebrow">Release details</p>
      <dl>${facts.join("")}</dl>
    </aside>
  </section>
  ${EDITORIAL_END}`;
}

function discoveryBlock(release, sameArtist, sameLane, newer, older, lane, profileInfo) {
  const artistName = profileInfo?.profile?.name || release.artist;
  const artistCards = sameArtist.slice(0, 3).map(recommendationCard).join("") || (
    profileInfo?.slug
      ? `<a class="release-related-card" href="/artists/${escapeHtml(profileInfo.slug)}/"><span>Artist profile</span><strong>Explore ${escapeHtml(artistName)}</strong><small>Full profile and verified discography</small></a>`
      : `<a class="release-related-card" href="/releases/"><span>Catalogue</span><strong>Explore all releases</strong><small>Browse the full NextGen Sessions archive</small></a>`
  );
  const laneCards = sameLane.slice(0, 3).map(recommendationCard).join("");
  const chronology = `${chronologyCard(newer, "Newer release")}${chronologyCard(older, "Earlier release")}`;

  return `${DISCOVERY_START}
  <section class="release-related" aria-labelledby="related-title">
    <div class="section-heading"><p class="eyebrow">Keep listening</p><h2 id="related-title">More from ${escapeHtml(artistName)}</h2><p>Continue through the verified catalogue from the same artist.</p></div>
    <div class="release-related-grid">${artistCards}</div>
    <div class="release-related-subsection"><div class="section-heading"><p class="eyebrow">Same lane</p><h2>More ${escapeHtml(lane.name)}</h2><p>Move sideways into other published releases connected to this genre hub.</p></div><div class="release-related-grid">${laneCards || `<a class="release-related-card" href="/genres/${escapeHtml(lane.slug)}/"><span>Genre hub</span><strong>Explore ${escapeHtml(lane.name)}</strong><small>Artists and releases in this lane</small></a>`}</div></div>
  </section>
  <nav class="release-chronology" aria-label="Release chronology">${chronology}</nav>
  ${DISCOVERY_END}`;
}

function enrichReleasePage(release, index, releases, profiles) {
  const pagePath = path.join(root, "releases", release.slug, "index.html");
  if (!fs.existsSync(pagePath)) throw new Error(`Missing generated release page: ${release.url}`);
  let source = fs.readFileSync(pagePath, "utf8");
  const profileInfo = profileForRelease(release, profiles);
  const lane = LANES[release.group] || { slug: "genres", name: release.group || "NextGen Sessions", groups: [release.group] };
  const artistReleases = profileInfo
    ? releases.filter((item) => releaseMatchesProfile(item, profileInfo.profile))
    : releases.filter((item) => normalise(item.artist) === normalise(release.artist));
  const laneReleases = releases.filter((item) => lane.groups.includes(item.group));
  const sameArtist = artistReleases.filter((item) => item.id !== release.id);
  const sameLane = laneReleases.filter((item) => item.id !== release.id && normalise(item.artist) !== normalise(release.artist));
  const newer = index > 0 ? releases[index - 1] : null;
  const older = index < releases.length - 1 ? releases[index + 1] : null;

  source = replaceMetaDescription(source, metaDescription(release));
  source = updateMusicSchema(source, release, profileInfo);
  source = source.replace(/\/release-detail\.css\?v=[^"']+/g, `/release-detail.css?v=${CSS_VERSION}`);

  const breadcrumb = breadcrumbMarkup(release, lane, profileInfo);
  source = replaceMarkedBlock(source, BREADCRUMB_START, BREADCRUMB_END, breadcrumb);
  if (!source.includes(BREADCRUMB_START)) source = source.replace("</head>", `  ${breadcrumb}\n</head>`);

  const editorial = editorialBlock(release, profileInfo, artistReleases, laneReleases, lane);
  source = replaceMarkedBlock(source, EDITORIAL_START, EDITORIAL_END, editorial, /<section class="release-detail-hero">[\s\S]*?<\/section>/);

  const discovery = discoveryBlock(release, sameArtist, sameLane, newer, older, lane, profileInfo);
  if (source.includes(DISCOVERY_START)) {
    source = replaceMarkedBlock(source, DISCOVERY_START, DISCOVERY_END, discovery);
  } else {
    source = source.replace(/<section class="release-related"[\s\S]*?<\/section>/, discovery);
  }

  fs.writeFileSync(pagePath, source, "utf8");
}

function main() {
  const catalogue = JSON.parse(read("releases.json"));
  const releases = Array.isArray(catalogue.releases) ? catalogue.releases : [];
  if (!releases.length) throw new Error("Release catalogue is empty");
  const { profiles } = loadRosterAndProfiles();
  releases.forEach((release, index) => enrichReleasePage(release, index, releases, profiles));
  console.log(`Enriched ${releases.length} release pages with verified editorial context and catalogue discovery.`);
}

main();
