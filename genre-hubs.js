(function () {
  "use strict";

  if (!document.querySelector('script[src="/site-metrics.js"]')) {
    const metrics = document.createElement("script");
    metrics.src = "/site-metrics.js";
    metrics.async = true;
    document.head.append(metrics);
  }

  const LANES = {
    "uk-rap-grime": { name: "UK Rap & Grime", groups: ["UK Rap & Grime"], artistTerms: ["uk rap", "grime"] },
    "hip-hop-g-funk": { name: "Hip-Hop & G-Funk", groups: ["Hip-Hop / G-Funk"], artistTerms: ["hip-hop", "g-funk"] },
    dancehall: { name: "Dancehall", groups: ["Dancehall"], artistTerms: ["dancehall"] },
    "reggae-lovers-rock": { name: "Reggae & Lovers Rock", groups: ["Reggae", "Lovers Rock"], artistTerms: ["reggae", "lovers rock"] },
    "rnb-soul": { name: "R&B & Soul", groups: ["R&B & Soul"], artistTerms: ["r&b"] },
    "global-sounds": { name: "Global Sounds", groups: ["Asian", "Arabic", "Late Night Afro", "Late Night Vibes"], artistTerms: ["punjabi", "south asian", "arabic", "afro"] },
  };

  const artists = Array.isArray(window.NGS_ARTISTS) ? window.NGS_ARTISTS : [];
  const images = window.NGS_ARTIST_IMAGES && typeof window.NGS_ARTIST_IMAGES === "object" ? window.NGS_ARTIST_IMAGES : {};

  function esc(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function laneReleases(releases, lane) {
    return releases.filter(item => lane.groups.includes(String(item.group || "").trim()));
  }

  function laneArtists(lane) {
    return artists.filter(artist => {
      const genre = String(artist.genre || "").toLowerCase();
      return lane.artistTerms.some(term => genre.includes(term));
    });
  }

  function formatDate(value) {
    if (!value) return "Official release";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Official release";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }

  function releaseCard(item) {
    const artist = esc(item.artist);
    const title = esc(item.title);
    const group = esc(item.group);
    const id = encodeURIComponent(String(item.id || ""));
    const url = esc(item.url || "/releases/");
    return `<a class="genre-release-card" href="${url}" data-video-id="${esc(item.id)}"><div class="genre-release-art"><img loading="lazy" decoding="async" src="/api/release-image?id=${id}&amp;size=card" alt="${title} by ${artist}"></div><div class="genre-release-body"><span class="tag">${group}</span><h3>${title}</h3><p>${artist}</p><span class="genre-release-date">${esc(formatDate(item.published))}</span></div></a>`;
  }

  function artistCard(artist) {
    const image = images[artist.slug];
    const hasImage = Boolean(image?.src);
    const imageMarkup = hasImage ? `<img loading="lazy" decoding="async" src="${esc(image.src)}"${image.srcset ? ` srcset="${esc(image.srcset)}" sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 50vw, 25vw"` : ""} alt="${esc(artist.name)} portrait" style="--artist-position:${esc(image.position || "50% 38%")}">` : "";
    return `<a class="genre-artist-card${hasImage ? "" : " no-image"}" href="/artists/${esc(artist.slug)}/">${imageMarkup}<div class="genre-artist-copy"><span>${esc(artist.genre)}</span><h3>${esc(artist.name)}</h3><p>${esc(artist.summary)}</p></div></a>`;
  }

  function updateIndex(releases, catalogueLoaded) {
    Object.entries(LANES).forEach(([slug, lane]) => {
      const lanePeople = laneArtists(lane);
      const laneItems = catalogueLoaded ? laneReleases(releases, lane) : [];
      document.querySelectorAll(`[data-lane-count="${slug}"]`).forEach(node => {
        node.textContent = catalogueLoaded ? `${laneItems.length} releases · ${lanePeople.length} artists` : `${lanePeople.length} artists`;
      });
      if (catalogueLoaded) {
        const image = document.querySelector(`[data-lane-image="${slug}"]`);
        if (image && laneItems[0]?.id) {
          image.src = `/api/release-image?id=${encodeURIComponent(laneItems[0].id)}&size=card`;
          image.alt = `${lane.name} latest release artwork`;
        }
      }
    });

    const releaseTotal = document.querySelector("[data-genre-total-releases]");
    const artistTotal = document.querySelector("[data-genre-total-artists]");
    if (releaseTotal && catalogueLoaded) releaseTotal.textContent = String(releases.length);
    if (artistTotal) artistTotal.textContent = String(artists.length);
  }

  function renderHub(releases, catalogueLoaded) {
    const page = document.querySelector("[data-genre-slug]");
    if (!page) return;
    const slug = String(page.dataset.genreSlug || "").trim();
    const lane = LANES[slug];
    if (!lane) return;

    const lanePeople = laneArtists(lane);
    const laneItems = catalogueLoaded ? laneReleases(releases, lane) : [];
    const releaseCount = document.querySelector("[data-hub-release-count]");
    const artistCount = document.querySelector("[data-hub-artist-count]");
    if (releaseCount && catalogueLoaded) releaseCount.textContent = String(laneItems.length);
    if (artistCount) artistCount.textContent = String(lanePeople.length);

    if (catalogueLoaded && laneItems[0]) {
      const heroImage = document.querySelector("[data-genre-hero-image]");
      const latestLink = document.querySelector("[data-genre-latest-link]");
      if (heroImage) {
        heroImage.src = `/api/release-image?id=${encodeURIComponent(laneItems[0].id)}`;
        heroImage.alt = `${laneItems[0].title} by ${laneItems[0].artist}`;
      }
      if (latestLink) {
        latestLink.href = laneItems[0].url || "/releases/";
        latestLink.textContent = `Latest: ${laneItems[0].title}`;
      }
    }

    const releaseGrid = document.querySelector("[data-genre-release-grid]");
    if (releaseGrid && catalogueLoaded) {
      releaseGrid.innerHTML = laneItems.length ? laneItems.slice(0, 8).map(releaseCard).join("") : '<p class="genre-loading">No releases are currently published in this lane.</p>';
    }

    const artistGrid = document.querySelector("[data-genre-artist-grid]");
    if (artistGrid) {
      artistGrid.innerHTML = lanePeople.length ? lanePeople.map(artistCard).join("") : '<p class="genre-loading">Artist profiles for this lane are being prepared.</p>';
    }

    const relatedGrid = document.querySelector("[data-related-genres]");
    if (relatedGrid) {
      relatedGrid.innerHTML = Object.entries(LANES).filter(([key]) => key !== slug).slice(0, 3).map(([key, item]) => `<a class="genre-related-card" href="/genres/${key}/"><span>Genre hub</span><strong>${esc(item.name)}</strong></a>`).join("");
    }
  }

  async function init() {
    let releases = [];
    let catalogueLoaded = false;
    try {
      const response = await fetch("/releases.json", { cache: "no-cache" });
      if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
      const payload = await response.json();
      releases = Array.isArray(payload.releases) ? payload.releases : [];
      catalogueLoaded = releases.length > 0;
      if (!catalogueLoaded) throw new Error("Catalogue returned no releases");
    } catch (_error) {
      document.querySelectorAll("[data-genre-release-grid]").forEach(grid => {
        grid.innerHTML = '<p class="genre-loading">The release catalogue is temporarily unavailable. Browse the full release archive instead.</p>';
      });
    }

    updateIndex(releases, catalogueLoaded);
    renderHub(releases, catalogueLoaded);
  }

  init();
})();
