import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://nextgensessions.com";
const ORG_ID = `${SITE}/#organization`;
const WEBSITE_ID = `${SITE}/#website`;
const SCHEMA_START = "<!-- NEXTGEN-SCHEMA:START -->";
const SCHEMA_END = "<!-- NEXTGEN-SCHEMA:END -->";

const LANES = {
  "uk-rap-grime": { name: "UK Rap & Grime", groups: ["UK Rap & Grime"], artistTerms: ["uk rap", "grime"], about: ["UK Rap", "Grime"] },
  "hip-hop-g-funk": { name: "Hip-Hop & G-Funk", groups: ["Hip-Hop / G-Funk"], artistTerms: ["hip-hop", "g-funk"], about: ["Hip-Hop", "G-Funk"] },
  dancehall: { name: "Dancehall", groups: ["Dancehall"], artistTerms: ["dancehall"], about: ["Dancehall"] },
  "reggae-lovers-rock": { name: "Reggae & Lovers Rock", groups: ["Reggae", "Lovers Rock"], artistTerms: ["reggae", "lovers rock"], about: ["Reggae", "Lovers Rock"] },
  "rnb-soul": { name: "R&B & Soul", groups: ["R&B & Soul"], artistTerms: ["r&b"], about: ["R&B", "Soul"] },
  "global-sounds": { name: "Global Sounds", groups: ["Asian", "Arabic", "Late Night Afro", "Late Night Vibes"], artistTerms: ["punjabi", "south asian", "arabic", "afro"], about: ["Global music", "Asian music", "Arabic music", "Afro music"] },
};

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, "utf8");
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

function decodeEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function attribute(html, name, property = "name") {
  const first = new RegExp(`<meta\\b[^>]*${property}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i").exec(html);
  if (first) return decodeEntities(first[1]);
  const second = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*${property}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i").exec(html);
  return second ? decodeEntities(second[1]) : "";
}

function canonical(html) {
  const match = /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i.exec(html)
    || /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i.exec(html);
  return match ? decodeEntities(match[1]) : "";
}

function pageTitle(html) {
  const match = /<title>([\s\S]*?)<\/title>/i.exec(html);
  return match ? stripTags(match[1]) : "NextGen Sessions";
}

function h1(html) {
  const match = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return match ? stripTags(match[1]) : pageTitle(html).replace(/\s*\|\s*NextGen Sessions.*$/i, "");
}

function metaDescription(html) {
  return attribute(html, "description", "name") || attribute(html, "og:description", "property");
}

function ogImage(html) {
  return attribute(html, "og:image", "property");
}

function absoluteUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  return `${SITE}${input.startsWith("/") ? "" : "/"}${input}`;
}

function isoDuration(seconds) {
  const total = Math.floor(Number(seconds || 0));
  if (!Number.isFinite(total) || total <= 0) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${secs || (!hours && !minutes) ? `${secs}S` : ""}`;
}

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function listItem(position, name, item) {
  return { "@type": "ListItem", position, name, item };
}

function breadcrumb(idBase, items) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${idBase}#breadcrumb`,
    itemListElement: items.map((item, index) => listItem(index + 1, item.name, item.item)),
  };
}

function organization() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "NextGen Sessions",
    alternateName: "NextGenSessions",
    url: `${SITE}/`,
    logo: `${SITE}/assets/nextgen-header-wordmark-2026.webp`,
    sameAs: [
      "https://www.youtube.com/@NextGenSessions",
      "https://www.tiktok.com/@nextgensessions",
      "https://www.instagram.com/next.gensessions/",
    ],
    description: "Independent multi-artist music network releasing original UK rap, hip-hop, dancehall, reggae, R&B and global sounds.",
  };
}

function website() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE}/`,
    name: "NextGen Sessions",
    alternateName: ["NextGenSessions", "nextgensessions.com"],
    publisher: { "@id": ORG_ID },
  };
}

function graphDocument(nodes) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

function injectGraph(html, nodes) {
  let source = html;
  source = source.replace(new RegExp(`${SCHEMA_START}[\\s\\S]*?${SCHEMA_END}`, "g"), "");
  source = source.replace(/<!-- RELEASE-BREADCRUMBS:START -->[\s\S]*?<!-- RELEASE-BREADCRUMBS:END -->/g, "");
  source = source.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
  const payload = JSON.stringify(graphDocument(nodes)).replaceAll("</", "<\\/");
  const block = `${SCHEMA_START}\n  <script type="application/ld+json" data-schema-graph="nextgen">${payload}</script>\n  ${SCHEMA_END}`;
  if (!/<\/head>/i.test(source)) throw new Error("Cannot inject schema graph: </head> missing");
  return source.replace(/<\/head>/i, `  ${block}\n</head>`);
}

function loadRosterAndProfiles() {
  const rosterSource = read("artists.js");
  const rosterMatch = rosterSource.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!rosterMatch) throw new Error("artists.js must expose window.NGS_ARTISTS");
  const roster = JSON.parse(rosterMatch[1]);
  const context = vm.createContext({ window: {} });
  for (const relativePath of ["artist-profiles.js", "artist-profiles-expanded.js"]) {
    if (fs.existsSync(path.join(root, relativePath))) vm.runInContext(read(relativePath), context, { filename: relativePath });
  }
  for (const artist of roster) {
    const relativePath = path.join("artists", artist.slug, "profile.js");
    if (fs.existsSync(path.join(root, relativePath))) vm.runInContext(read(relativePath), context, { filename: relativePath });
  }
  return { roster, profiles: context.window.NGS_ARTIST_PROFILES || {} };
}

function loadImages() {
  const context = vm.createContext({ window: {} });
  for (const relativePath of ["artist-images.js", "zion-daley-image-fix.js"]) {
    if (fs.existsSync(path.join(root, relativePath))) vm.runInContext(read(relativePath), context, { filename: relativePath });
  }
  return context.window.NGS_ARTIST_IMAGES || {};
}

function aliasesFor(profile) {
  return [profile?.name, ...(Array.isArray(profile?.catalogueAliases) ? profile.catalogueAliases : [])].map(normalise).filter(Boolean);
}

function releaseMatchesProfile(release, profile) {
  const artist = normalise(release?.artist);
  if (!artist) return false;
  return aliasesFor(profile).some((alias) => artist === alias || artist.includes(alias));
}

function profileForRelease(release, profiles) {
  for (const [slug, profile] of Object.entries(profiles)) {
    if (releaseMatchesProfile(release, profile)) return { slug, profile };
  }
  return null;
}

function artistImage(slug, profile, imageMap, html = "") {
  const mapped = imageMap[profile?.imageKey || slug] || {};
  return absoluteUrl(profile?.image || mapped.portrait || mapped.src || ogImage(html));
}

const { roster, profiles } = loadRosterAndProfiles();
const imageMap = loadImages();
const releasePayload = JSON.parse(read("releases.json"));
const releases = Array.isArray(releasePayload.releases) ? releasePayload.releases : [];
const releaseById = new Map(releases.map((release) => [String(release.id), release]));
const releaseByUrl = new Map(releases.map((release) => [`${SITE}${release.url}`, release]));
const mixesPayload = fs.existsSync(path.join(root, "mixes.json")) ? JSON.parse(read("mixes.json")) : { mixes: [] };
const mixById = new Map((mixesPayload.mixes || []).map((mix) => [String(mix.id), mix]));

function normalizeHomepage() {
  const html = read("index.html");
  const url = canonical(html) || `${SITE}/`;
  const pageId = `${url}#webpage`;
  const nodes = [
    organization(),
    website(),
    {
      "@type": "WebPage",
      "@id": pageId,
      url,
      name: pageTitle(html),
      description: metaDescription(html),
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      mainEntity: { "@id": ORG_ID },
    },
  ];
  write("index.html", injectGraph(html, nodes));
}

function normalizeArtistsIndex() {
  const relativePath = "artists/index.html";
  const html = read(relativePath);
  const url = canonical(html) || `${SITE}/artists/`;
  const pageId = `${url}#webpage`;
  const listId = `${url}#artist-list`;
  const nodes = [
    {
      "@type": "CollectionPage",
      "@id": pageId,
      url,
      name: pageTitle(html),
      description: metaDescription(html),
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": listId },
      breadcrumb: { "@id": `${url}#breadcrumb` },
    },
    {
      "@type": "ItemList",
      "@id": listId,
      numberOfItems: roster.length,
      itemListElement: roster.map((artist, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: artist.name,
        item: { "@id": `${SITE}/artists/${artist.slug}/#artist` },
      })),
    },
    breadcrumb(url, [
      { name: "Home", item: `${SITE}/` },
      { name: "Artists", item: url },
    ]),
  ];
  write(relativePath, injectGraph(html, nodes));
}

function normalizeArtistPages() {
  let count = 0;
  for (const artist of roster) {
    const profile = profiles[artist.slug];
    if (!profile) throw new Error(`Missing profile for ${artist.slug}`);
    const relativePath = `artists/${artist.slug}/index.html`;
    if (!fs.existsSync(path.join(root, relativePath))) throw new Error(`Missing ${relativePath}`);
    const html = read(relativePath);
    const url = canonical(html) || `${SITE}/artists/${artist.slug}/`;
    const pageId = `${url}#webpage`;
    const artistId = `${url}#artist`;
    const image = artistImage(artist.slug, profile, imageMap, html);
    const sameAs = [profile.youtubeUrl].filter(Boolean);
    const artistNode = {
      "@type": "MusicGroup",
      "@id": artistId,
      name: profile.name || artist.name,
      url,
      genre: profile.genre || artist.genre,
      description: profile.headline || artist.summary,
      mainEntityOfPage: { "@id": pageId },
    };
    if (image) artistNode.image = image;
    if (sameAs.length) artistNode.sameAs = sameAs;
    if (profile.location && !/undisclosed/i.test(profile.location)) {
      artistNode.location = { "@type": "Place", name: profile.location };
    }
    const nodes = [
      artistNode,
      {
        "@type": "ProfilePage",
        "@id": pageId,
        url,
        name: pageTitle(html),
        description: metaDescription(html),
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { "@id": artistId },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      breadcrumb(url, [
        { name: "Home", item: `${SITE}/` },
        { name: "Artists", item: `${SITE}/artists/` },
        { name: profile.name || artist.name, item: url },
      ]),
    ];
    write(relativePath, injectGraph(html, nodes));
    count += 1;
  }
  return count;
}

function normalizeReleasesIndex() {
  const relativePath = "releases/index.html";
  const html = read(relativePath);
  const url = canonical(html) || `${SITE}/releases/`;
  const listId = `${url}#release-list`;
  const nodes = [
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: pageTitle(html),
      description: metaDescription(html),
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": listId },
      breadcrumb: { "@id": `${url}#breadcrumb` },
    },
    {
      "@type": "ItemList",
      "@id": listId,
      numberOfItems: releases.length,
      itemListElement: releases.map((release, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${release.artist} — ${release.title}`,
        item: { "@id": `${SITE}${release.url}#recording` },
      })),
    },
    breadcrumb(url, [
      { name: "Home", item: `${SITE}/` },
      { name: "Releases", item: url },
    ]),
  ];
  write(relativePath, injectGraph(html, nodes));
}

function normalizeReleasePages() {
  let count = 0;
  for (const release of releases) {
    const relativePath = `.${release.url}index.html`.replace(/^\.\//, "");
    const html = read(relativePath);
    const url = canonical(html) || `${SITE}${release.url}`;
    const pageId = `${url}#webpage`;
    const recordingId = `${url}#recording`;
    const videoId = `${url}#video`;
    const profileInfo = profileForRelease(release, profiles);
    const byArtist = profileInfo
      ? { "@id": `${SITE}/artists/${profileInfo.slug}/#artist`, "@type": "MusicGroup", name: profileInfo.profile.name || release.artist, url: `${SITE}/artists/${profileInfo.slug}/` }
      : { "@type": "MusicGroup", name: release.artist };
    const duration = isoDuration(release.durationSeconds);
    const published = dateOnly(release.published);
    const thumb = `https://i.ytimg.com/vi/${release.id}/hqdefault.jpg`;
    const recording = {
      "@type": "MusicRecording",
      "@id": recordingId,
      name: release.title,
      url,
      image: thumb,
      genre: release.group,
      byArtist,
      publisher: { "@id": ORG_ID },
      mainEntityOfPage: { "@id": pageId },
      isPartOf: { "@id": `${SITE}/releases/#webpage` },
      subjectOf: { "@id": videoId },
    };
    if (published) recording.datePublished = published;
    if (duration) recording.duration = duration;
    const video = {
      "@type": "VideoObject",
      "@id": videoId,
      name: `${release.artist} — ${release.title}`,
      url: `https://www.youtube.com/watch?v=${release.id}`,
      contentUrl: `https://www.youtube.com/watch?v=${release.id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${release.id}`,
      thumbnailUrl: thumb,
      publisher: { "@id": ORG_ID },
      mainEntityOfPage: { "@id": pageId },
      about: { "@id": recordingId },
    };
    if (published) video.uploadDate = published;
    if (duration) video.duration = duration;
    const crumbs = [
      { name: "Home", item: `${SITE}/` },
      { name: "Releases", item: `${SITE}/releases/` },
    ];
    if (profileInfo) crumbs.push({ name: profileInfo.profile.name || release.artist, item: `${SITE}/artists/${profileInfo.slug}/` });
    crumbs.push({ name: release.title, item: url });
    const nodes = [
      recording,
      video,
      {
        "@type": "WebPage",
        "@id": pageId,
        url,
        name: pageTitle(html),
        description: metaDescription(html),
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { "@id": recordingId },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      breadcrumb(url, crumbs),
    ];
    write(relativePath, injectGraph(html, nodes));
    count += 1;
  }
  return count;
}

function normalizeGenresIndex() {
  const relativePath = "genres/index.html";
  const html = read(relativePath);
  const url = canonical(html) || `${SITE}/genres/`;
  const listId = `${url}#genre-list`;
  const entries = Object.entries(LANES);
  const nodes = [
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: pageTitle(html),
      description: metaDescription(html),
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": listId },
      breadcrumb: { "@id": `${url}#breadcrumb` },
    },
    {
      "@type": "ItemList",
      "@id": listId,
      numberOfItems: entries.length,
      itemListElement: entries.map(([slug, lane], index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: lane.name,
        item: { "@id": `${SITE}/genres/${slug}/#webpage` },
      })),
    },
    breadcrumb(url, [
      { name: "Home", item: `${SITE}/` },
      { name: "Genres", item: url },
    ]),
  ];
  write(relativePath, injectGraph(html, nodes));
}

function normalizeGenrePages() {
  let count = 0;
  for (const [slug, lane] of Object.entries(LANES)) {
    const relativePath = `genres/${slug}/index.html`;
    const html = read(relativePath);
    const url = canonical(html) || `${SITE}/genres/${slug}/`;
    const laneReleases = releases.filter((release) => lane.groups.includes(String(release.group || "").trim()));
    const laneArtists = roster.filter((artist) => lane.artistTerms.some((term) => String(artist.genre || "").toLowerCase().includes(term)));
    const listId = `${url}#release-list`;
    const nodes = [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: pageTitle(html),
        description: metaDescription(html),
        isPartOf: { "@id": WEBSITE_ID },
        about: lane.about,
        mainEntity: { "@id": listId },
        mentions: laneArtists.map((artist) => ({ "@id": `${SITE}/artists/${artist.slug}/#artist` })),
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "ItemList",
        "@id": listId,
        numberOfItems: laneReleases.length,
        itemListElement: laneReleases.map((release, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${release.artist} — ${release.title}`,
          item: { "@id": `${SITE}${release.url}#recording` },
        })),
      },
      breadcrumb(url, [
        { name: "Home", item: `${SITE}/` },
        { name: "Genres", item: `${SITE}/genres/` },
        { name: lane.name, item: url },
      ]),
    ];
    write(relativePath, injectGraph(html, nodes));
    count += 1;
  }
  return count;
}

function mixDetailDirectories() {
  return fs.readdirSync(path.join(root, "mixes"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, "mixes", entry.name, "index.html")))
    .map((entry) => entry.name)
    .sort();
}

function dataAttr(tag, name) {
  const match = new RegExp(`\\b${name}=["']([^"']*)["']`, "i").exec(tag);
  return match ? decodeEntities(match[1]) : "";
}

function normalizeMixesIndex() {
  const relativePath = "mixes/index.html";
  const html = read(relativePath);
  const url = canonical(html) || `${SITE}/mixes/`;
  const dirs = mixDetailDirectories();
  const items = dirs.map((slug) => {
    const page = read(`mixes/${slug}/index.html`);
    return { slug, name: h1(page), url: canonical(page) || `${SITE}/mixes/${slug}/` };
  });
  const listId = `${url}#mix-list`;
  const nodes = [
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: pageTitle(html),
      description: metaDescription(html),
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": listId },
      breadcrumb: { "@id": `${url}#breadcrumb` },
    },
    {
      "@type": "ItemList",
      "@id": listId,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    },
    breadcrumb(url, [
      { name: "Home", item: `${SITE}/` },
      { name: "Mixes", item: url },
    ]),
  ];
  write(relativePath, injectGraph(html, nodes));
}

function normalizeMixPages() {
  let count = 0;
  for (const slug of mixDetailDirectories()) {
    const relativePath = `mixes/${slug}/index.html`;
    const html = read(relativePath);
    const url = canonical(html) || `${SITE}/mixes/${slug}/`;
    const pageId = `${url}#webpage`;
    const name = h1(html);
    const description = metaDescription(html) || stripTags((/<p\b[^>]*class=["'][^"']*mix-description[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(html) || [])[1]);
    const image = absoluteUrl(ogImage(html) || dataAttr((/<div\b[^>]*data-mix-player[^>]*>/i.exec(html) || [""])[0], "data-poster"));
    const optionTags = [...html.matchAll(/<button\b[^>]*data-mix-option[^>]*>/gi)].map((match) => match[0]);
    const playerTag = (/<div\b[^>]*data-mix-player[^>]*>/i.exec(html) || [""])[0];
    const playerKind = dataAttr(playerTag, "data-kind") || "video";
    const playerId = dataAttr(playerTag, "data-id");
    let mainEntity;

    if (optionTags.length >= 2 || playerKind === "playlist") {
      const tracks = optionTags.map((tag) => {
        const id = dataAttr(tag, "data-id");
        const title = dataAttr(tag, "data-title");
        const release = releaseById.get(id);
        if (release) return { "@id": `${SITE}${release.url}#recording` };
        return {
          "@type": "MusicRecording",
          name: title || "NextGen Sessions track",
          url: id ? `https://www.youtube.com/watch?v=${id}` : url,
        };
      });
      mainEntity = {
        "@type": "MusicPlaylist",
        "@id": `${url}#playlist`,
        name,
        url,
        description,
        publisher: { "@id": ORG_ID },
        mainEntityOfPage: { "@id": pageId },
        numTracks: tracks.length || undefined,
        track: tracks.length ? tracks : undefined,
      };
      if (image) mainEntity.image = image;
      if (playerKind === "playlist" && playerId) mainEntity.sameAs = `https://www.youtube.com/playlist?list=${playerId}`;
    } else {
      const mix = mixById.get(playerId);
      const duration = isoDuration(mix?.durationSeconds);
      const published = dateOnly(mix?.published);
      const thumb = image || (playerId ? `https://i.ytimg.com/vi/${playerId}/hqdefault.jpg` : "");
      mainEntity = {
        "@type": "VideoObject",
        "@id": `${url}#video`,
        name,
        url,
        description,
        publisher: { "@id": ORG_ID },
        mainEntityOfPage: { "@id": pageId },
      };
      if (playerId) {
        mainEntity.contentUrl = `https://www.youtube.com/watch?v=${playerId}`;
        mainEntity.embedUrl = `https://www.youtube-nocookie.com/embed/${playerId}`;
      }
      if (thumb) mainEntity.thumbnailUrl = thumb;
      if (duration) mainEntity.duration = duration;
      if (published) mainEntity.uploadDate = published;
    }

    const nodes = [
      mainEntity,
      {
        "@type": "WebPage",
        "@id": pageId,
        url,
        name: pageTitle(html),
        description,
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { "@id": mainEntity["@id"] },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      breadcrumb(url, [
        { name: "Home", item: `${SITE}/` },
        { name: "Mixes", item: `${SITE}/mixes/` },
        { name, item: url },
      ]),
    ];
    write(relativePath, injectGraph(html, nodes));
    count += 1;
  }
  return count;
}

normalizeHomepage();
normalizeArtistsIndex();
const artistCount = normalizeArtistPages();
normalizeReleasesIndex();
const releaseCount = normalizeReleasePages();
normalizeGenresIndex();
const genreCount = normalizeGenrePages();
normalizeMixesIndex();
const mixCount = normalizeMixPages();

console.log(`Normalized schema graph: homepage, ${artistCount} artists, ${releaseCount} releases, ${genreCount} genre hubs, and ${mixCount} mix pages.`);
