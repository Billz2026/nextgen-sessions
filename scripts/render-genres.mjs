import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const LANES = {
  "uk-rap-grime": {
    name: "UK Rap & Grime",
    groups: ["UK Rap & Grime"],
    artistTerms: ["uk rap", "grime"],
    searchGrowth: {
      searchTitle: "New UK Rap Music & Artists 2026 | NextGen Sessions",
      searchDescription:
        "Discover new independent UK rap artists and original 2026 music on NextGen Sessions, from London rap and melodic records to estate storytelling and grime.",
      heroCopy:
        "Discover new independent UK rap artists and original 2026 releases across NextGen Sessions, from modern London rap and melody to estate storytelling and grime pressure.",
      eyebrow: "New UK rap music 2026",
      title: "Discover independent UK rap artists and original 2026 releases.",
      body:
        "NextGen Sessions brings new UK rap music, artist profiles and full-length releases into one independent catalogue. Move from melodic London rap and summer records into estate storytelling and higher-pressure grime, then continue into the long-form UK Rap Mix 2026.",
      cards: [
        { href: "/artists/renz-cole/", label: "UK rap artist", title: "Renz Cole" },
        { href: "/artists/reiss/", label: "UK rap artist", title: "Reiss" },
        { href: "/mixes/uk-rap-mashup-series-1/", label: "Long-form listening", title: "UK Rap Mix 2026" },
      ],
    },
  },
  "hip-hop-g-funk": { name: "Hip-Hop & G-Funk", groups: ["Hip-Hop / G-Funk"], artistTerms: ["hip-hop", "g-funk"] },
  dancehall: {
    name: "Dancehall",
    groups: ["Dancehall"],
    artistTerms: ["dancehall"],
    searchGrowth: {
      searchTitle: "New Dancehall Music & Artists 2026 | NextGen Sessions",
      searchDescription:
        "Discover new independent dancehall artists and original 2026 music on NextGen Sessions, from Jamaican gully records and melodic dancehall to bashment mixes.",
      heroCopy:
        "Discover new independent dancehall artists and original 2026 releases across NextGen Sessions, from melodic Jamaican records and bashment movement to harder gullyside pressure.",
      eyebrow: "New dancehall music 2026",
      title: "Discover independent dancehall artists and original 2026 releases.",
      body:
        "NextGen Sessions brings new dancehall music, artist profiles and full-length releases into one independent catalogue. Move from melodic Jamaican records and bashment energy into gullyside pressure and harder street cuts, then continue into long-form Dancehall mixes.",
      cards: [
        { href: "/artists/kemarco/", label: "Dancehall artist", title: "Kemarco" },
        { href: "/artists/reeko/", label: "Dancehall artist", title: "Reeko" },
        { href: "/mixes/dancehall-mashups/", label: "Long-form listening", title: "Dancehall Mix 2026" },
      ],
    },
  },
  "reggae-lovers-rock": { name: "Reggae & Lovers Rock", groups: ["Reggae", "Lovers Rock"], artistTerms: ["reggae", "lovers rock"] },
  "rnb-soul": { name: "R&B & Soul", groups: ["R&B & Soul"], artistTerms: ["r&b"] },
  "global-sounds": { name: "Global Sounds", groups: ["Asian", "Arabic", "Late Night Afro", "Late Night Vibes"], artistTerms: ["punjabi", "south asian", "arabic", "afro"] },
};

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadArtists() {
  const source = read("artists.js");
  const match = source.match(/window\.NGS_ARTISTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("artists.js must expose window.NGS_ARTISTS");
  return JSON.parse(match[1]);
}

function loadImages() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(read("artist-images.js"), context, { filename: "artist-images.js" });
  return context.window.NGS_ARTIST_IMAGES || {};
}

function laneReleases(releases, lane) {
  return releases.filter((item) => lane.groups.includes(String(item.group || "").trim()));
}

function laneArtists(artists, lane) {
  return artists.filter((artist) => {
    const genre = String(artist.genre || "").toLowerCase();
    return lane.artistTerms.some((term) => genre.includes(term));
  });
}

function formatDate(value) {
  if (!value) return "Official release";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Official release";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function releaseCard(item) {
  const artist = esc(item.artist);
  const title = esc(item.title);
  const group = esc(item.group);
  const id = encodeURIComponent(String(item.id || ""));
  const url = esc(item.url || "/releases/");
  return `<a class="genre-release-card" href="${url}" data-video-id="${esc(item.id)}"><div class="genre-release-art"><img loading="lazy" decoding="async" src="/api/release-image?id=${id}&amp;size=card" alt="${title} by ${artist}"></div><div class="genre-release-body"><span class="tag">${group}</span><h3>${title}</h3><p>${artist}</p><span class="genre-release-date">${esc(formatDate(item.published))}</span></div></a>`;
}

function artistCard(artist, images) {
  const image = images[artist.slug];
  const hasImage = Boolean(image?.src);
  const imageMarkup = hasImage
    ? `<img loading="lazy" decoding="async" src="${esc(image.src)}"${image.srcset ? ` srcset="${esc(image.srcset)}" sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 50vw, 25vw"` : ""} alt="${esc(artist.name)} portrait" style="--artist-position:${esc(image.position || "50% 38%")}">`
    : "";
  return `<a class="genre-artist-card${hasImage ? "" : " no-image"}" href="/artists/${esc(artist.slug)}/">${imageMarkup}<div class="genre-artist-copy"><span>${esc(artist.genre)}</span><h3>${esc(artist.name)}</h3><p>${esc(artist.summary)}</p></div></a>`;
}

function relatedCards(currentSlug) {
  return Object.entries(LANES)
    .filter(([slug]) => slug !== currentSlug)
    .slice(0, 3)
    .map(([slug, lane]) => `<a class="genre-related-card" href="/genres/${slug}/"><span>Genre hub</span><strong>${esc(lane.name)}</strong></a>`)
    .join("");
}

function applySearchMetadata(html, slug, growth) {
  const title = esc(growth.searchTitle);
  const description = esc(growth.searchDescription);
  let nextHtml = html;

  const titlePattern = /<title>[\s\S]*?<\/title>/i;
  if (!titlePattern.test(nextHtml)) throw new Error(`Missing title on ${slug}`);
  nextHtml = nextHtml.replace(titlePattern, `<title>${title}</title>`);

  const descriptionPattern = /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i;
  if (!descriptionPattern.test(nextHtml)) throw new Error(`Missing meta description on ${slug}`);
  nextHtml = nextHtml.replace(descriptionPattern, `<meta name="description" content="${description}">`);

  const ogTitlePattern = /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i;
  if (ogTitlePattern.test(nextHtml)) {
    nextHtml = nextHtml.replace(ogTitlePattern, `<meta property="og:title" content="${title}">`);
  }

  const ogDescriptionPattern = /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i;
  if (ogDescriptionPattern.test(nextHtml)) {
    nextHtml = nextHtml.replace(ogDescriptionPattern, `<meta property="og:description" content="${description}">`);
  }

  const twitterTitle = `<meta name="twitter:title" content="${title}">`;
  const twitterDescription = `<meta name="twitter:description" content="${description}">`;
  const twitterTitlePattern = /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?\s*>/i;
  const twitterDescriptionPattern = /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?\s*>/i;
  if (twitterTitlePattern.test(nextHtml)) nextHtml = nextHtml.replace(twitterTitlePattern, twitterTitle);
  if (twitterDescriptionPattern.test(nextHtml)) nextHtml = nextHtml.replace(twitterDescriptionPattern, twitterDescription);

  if (!twitterTitlePattern.test(nextHtml) || !twitterDescriptionPattern.test(nextHtml)) {
    const twitterCardPattern = /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?\s*>/i;
    const card = nextHtml.match(twitterCardPattern)?.[0];
    if (!card) throw new Error(`Missing twitter:card on ${slug}`);
    const additions = [
      twitterTitlePattern.test(nextHtml) ? "" : twitterTitle,
      twitterDescriptionPattern.test(nextHtml) ? "" : twitterDescription,
    ]
      .filter(Boolean)
      .join("");
    nextHtml = nextHtml.replace(card, card + additions);
  }

  return nextHtml;
}

function searchGrowthSection(slug, growth) {
  const cards = growth.cards
    .map(
      (card) =>
        `<a class="genre-related-card" href="${esc(card.href)}"><span>${esc(card.label)}</span><strong>${esc(card.title)}</strong></a>`,
    )
    .join("");
  return `<section class="genre-hub-section" aria-labelledby="${esc(slug)}-search-growth-title" data-search-growth="${esc(slug)}"><div class="section-heading"><p class="eyebrow">${esc(growth.eyebrow)}</p><h2 id="${esc(slug)}-search-growth-title">${esc(growth.title)}</h2><p>${esc(growth.body)}</p></div><div class="genre-related-grid">${cards}</div></section>`;
}

function applySearchGrowth(html, slug, lane) {
  const growth = lane.searchGrowth;
  if (!growth) return html;

  let nextHtml = applySearchMetadata(html, slug, growth);
  const heroCopyPattern = /<p\s+class="hero-copy">[\s\S]*?<\/p>/i;
  if (!heroCopyPattern.test(nextHtml)) throw new Error(`Missing hero copy on ${slug}`);
  nextHtml = nextHtml.replace(heroCopyPattern, `<p class="hero-copy">${esc(growth.heroCopy)}</p>`);

  const section = searchGrowthSection(slug, growth);
  const existingSection = new RegExp(
    `<section\\b[^>]*data-search-growth=["']${slug}["'][^>]*>[\\s\\S]*?<\\/section>`,
    "i",
  );
  if (existingSection.test(nextHtml)) return nextHtml.replace(existingSection, section);

  const heroSection = /(<section\b[^>]*class=["'][^"']*genre-hub-hero[^"']*["'][^>]*>[\s\S]*?<\/section>)/i;
  if (!heroSection.test(nextHtml)) throw new Error(`Missing genre hero section on ${slug}`);
  return nextHtml.replace(heroSection, `$1\n${section}`);
}

function replaceElementContents(html, marker, replacement) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing marker ${marker}`);
  const openStart = html.lastIndexOf("<div", markerIndex);
  if (openStart < 0) throw new Error(`Could not find containing div for ${marker}`);
  const openEnd = html.indexOf(">", markerIndex);
  if (openEnd < 0) throw new Error(`Could not find opening tag end for ${marker}`);

  const tokenPattern = /<\/?div\b[^>]*>/gi;
  tokenPattern.lastIndex = openStart;
  let depth = 0;
  let match;
  while ((match = tokenPattern.exec(html))) {
    if (/^<\/div/i.test(match[0])) depth -= 1;
    else depth += 1;
    if (depth === 0) {
      const closeStart = match.index;
      return html.slice(0, openEnd + 1) + replacement + html.slice(closeStart);
    }
  }
  throw new Error(`Could not find closing div for ${marker}`);
}

function replaceCount(html, attribute, value) {
  const pattern = new RegExp(`(<strong\\b[^>]*\\b${attribute}\\b[^>]*>)[\\s\\S]*?(<\\/strong>)`, "i");
  if (!pattern.test(html)) throw new Error(`Missing ${attribute}`);
  return html.replace(pattern, `$1${esc(value)}$2`);
}

function renderHub(slug, lane, releases, artists, images) {
  const pagePath = path.join(root, "genres", slug, "index.html");
  if (!fs.existsSync(pagePath)) throw new Error(`Missing genre hub page: ${slug}`);
  let html = fs.readFileSync(pagePath, "utf8");
  const laneItems = laneReleases(releases, lane);
  const lanePeople = laneArtists(artists, lane);
  if (!laneItems.length) throw new Error(`Genre hub ${slug} has no releases`);
  if (!lanePeople.length) throw new Error(`Genre hub ${slug} has no artists`);

  html = html.replace(
    new RegExp(`(<main\\b[^>]*\\bdata-genre-slug=["']${slug}["'][^>]*)(>)`, "i"),
    (match, start, end) => start.includes("data-static-genre=") ? match : `${start} data-static-genre="true"${end}`,
  );
  html = replaceCount(html, "data-hub-release-count", laneItems.length);
  html = replaceCount(html, "data-hub-artist-count", lanePeople.length);

  const latest = laneItems[0];
  const latestLinkPattern = /<a\b[^>]*\bdata-genre-latest-link\b[^>]*>[\s\S]*?<\/a>/i;
  if (!latestLinkPattern.test(html)) throw new Error(`Missing latest-release link on ${slug}`);
  html = html.replace(
    latestLinkPattern,
    `<a class="button button-primary" data-genre-latest-link href="${esc(latest.url || "/releases/")}">Latest: ${esc(latest.title)}</a>`,
  );

  const heroImagePattern = /<img\b[^>]*\bdata-genre-hero-image\b[^>]*>/i;
  if (!heroImagePattern.test(html)) throw new Error(`Missing hero image on ${slug}`);
  html = html.replace(
    heroImagePattern,
    `<img data-genre-hero-image src="/api/release-image?id=${encodeURIComponent(latest.id)}" alt="${esc(latest.title)} by ${esc(latest.artist)}">`,
  );

  html = applySearchGrowth(html, slug, lane);

  const releaseMarkup = laneItems.slice(0, 8).map(releaseCard).join("");
  const artistMarkup = lanePeople.map((artist) => artistCard(artist, images)).join("");
  html = replaceElementContents(html, "data-genre-release-grid", releaseMarkup);
  html = replaceElementContents(html, "data-genre-artist-grid", artistMarkup);
  html = replaceElementContents(html, "data-related-genres", relatedCards(slug));

  fs.writeFileSync(pagePath, html);
  return { releases: laneItems.length, artists: lanePeople.length, latest };
}

function replaceLaneImage(html, slug, latest, eager) {
  const pattern = new RegExp(`<img\\b[^>]*\\bdata-lane-image=["']${slug}["'][^>]*>`, "i");
  if (!pattern.test(html)) throw new Error(`Genre landing missing ${slug} artwork`);
  return html.replace(
    pattern,
    `<img data-lane-image="${slug}" src="/api/release-image?id=${encodeURIComponent(latest.id)}&amp;size=card" alt="${esc(LANES[slug].name)} latest release artwork" loading="${eager ? "eager" : "lazy"}">`,
  );
}

function renderLanding(releases, artists, laneStats) {
  const pagePath = path.join(root, "genres", "index.html");
  let html = fs.readFileSync(pagePath, "utf8");
  html = html.replace(
    /(<main\b[^>]*\bclass=["'][^"']*genre-index-page[^"']*["'][^>]*)(>)/i,
    (match, start, end) => start.includes("data-static-genres-index=") ? match : `${start} data-static-genres-index="true"${end}`,
  );
  html = replaceCount(html, "data-genre-total-releases", releases.length);
  html = replaceCount(html, "data-genre-total-artists", artists.length);

  Object.entries(LANES).forEach(([slug], index) => {
    const stats = laneStats[slug];
    const countPattern = new RegExp(`(<span\\b[^>]*\\bdata-lane-count=["']${slug}["'][^>]*>)[\\s\\S]*?(<\\/span>)`, "i");
    if (!countPattern.test(html)) throw new Error(`Genre landing missing ${slug} count`);
    html = html.replace(countPattern, `$1${stats.releases} releases · ${stats.artists} artists$2`);
    html = replaceLaneImage(html, slug, stats.latest, index === 0);
  });

  fs.writeFileSync(pagePath, html);
}

const artists = loadArtists();
const images = loadImages();
const payload = JSON.parse(read("releases.json"));
const releases = Array.isArray(payload.releases) ? payload.releases : [];
if (!releases.length) throw new Error("releases.json contains no releases");

const laneStats = {};
for (const [slug, lane] of Object.entries(LANES)) {
  laneStats[slug] = renderHub(slug, lane, releases, artists, images);
}
renderLanding(releases, artists, laneStats);

console.log(`Rendered ${Object.keys(LANES).length} crawlable genre hubs across ${releases.length} releases and ${artists.length} artists.`);
