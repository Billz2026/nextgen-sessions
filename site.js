(function () {
  "use strict";

  if (!document.querySelector('script[src="/site-metrics.js"]')) {
    const metrics = document.createElement("script");
    metrics.src = "/site-metrics.js";
    metrics.async = true;
    document.head.append(metrics);
  }

  const artists = Array.isArray(window.NGS_ARTISTS) ? window.NGS_ARTISTS : [];
  const artistImages = window.NGS_ARTIST_IMAGES && typeof window.NGS_ARTIST_IMAGES === "object"
    ? window.NGS_ARTIST_IMAGES
    : {};
  const artistProfiles = window.NGS_ARTIST_PROFILES && typeof window.NGS_ARTIST_PROFILES === "object"
    ? window.NGS_ARTIST_PROFILES
    : {};
  const featuredGrid = document.getElementById("featuredArtistGrid");
  const rosterGrid = document.getElementById("artistRosterGrid");
  const artistSearch = document.getElementById("artistSearch");
  const rosterCount = document.getElementById("rosterCount");
  const releaseGrid = document.getElementById("releaseGrid");
  const latestPlayer = document.getElementById("latestVideoFrame");
  const latestVideoPlay = document.getElementById("latestVideoPlay");
  const latestVideoThumbnail = document.getElementById("latestVideoThumbnail");
  let activeLatest = null;
  let latestPlayerLoaded = false;

  const FALLBACK_LATEST = {
    id: "dV6_GbsHrxI",
    title: "Kemarco – Badman Don’t Rush",
    published: "2026-08-05T17:00:07+00:00"
  };

  const FALLBACK_RELEASES = [
    FALLBACK_LATEST,
    { id: "Sra1722xEFE", title: "Renz Cole – Heatwave", published: "2026-07-31T17:00:33+00:00" },
    { id: "6H6yq_1bEsQ", title: "Reeko – After Di Party", published: "2026-07-29T17:00:35+00:00" },
    { id: "ZSjRD_3B5uk", title: "Deon Creed – Days Like These", published: "2026-07-27T17:00:05+00:00" },
    { id: "TnYNLBDlLx8", title: "Omari V – When Di Breeze Call", published: "2026-07-24T17:00:21Z" },
    { id: "RvRq-zwGfKc", title: "Voss Carter – Sunshine On The Way Home", published: "2026-07-22T17:00:39Z" }
  ];

  function validVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : FALLBACK_LATEST.id;
  }

  function latestTitle(release) {
    return String(release?.title || "Latest NextGen Sessions release").trim();
  }

  function updateLatestPlayer(release) {
    const next = {
      id: validVideoId(release?.id),
      title: latestTitle(release)
    };
    activeLatest = next;
    if (!latestPlayer) return;

    latestPlayer.dataset.videoId = next.id;
    if (latestPlayerLoaded) {
      const frame = latestPlayer.querySelector("iframe");
      if (frame && frame.dataset.videoId !== next.id) {
        frame.dataset.videoId = next.id;
        frame.title = next.title;
        frame.src = `https://www.youtube-nocookie.com/embed/${next.id}?rel=0&modestbranding=1&autoplay=1`;
      }
      return;
    }

    if (latestVideoThumbnail) {
      latestVideoThumbnail.src = `/api/release-image?id=${encodeURIComponent(next.id)}`;
    }
    if (latestVideoPlay) {
      latestVideoPlay.classList.remove("is-fallback");
      latestVideoPlay.setAttribute("aria-label", `Play ${next.title}`);
    }
  }

  function loadLatestPlayer() {
    if (!latestPlayer || latestPlayerLoaded) return;
    const release = activeLatest || FALLBACK_LATEST;
    const frame = document.createElement("iframe");
    frame.dataset.videoId = validVideoId(release.id);
    frame.title = latestTitle(release);
    frame.loading = "eager";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.src = `https://www.youtube-nocookie.com/embed/${frame.dataset.videoId}?rel=0&modestbranding=1&autoplay=1`;
    latestPlayerLoaded = true;
    latestPlayer.classList.add("is-loaded");
    latestPlayer.replaceChildren(frame);
  }

  latestVideoPlay?.addEventListener("click", loadLatestPlayer);
  latestVideoThumbnail?.addEventListener("error", () => {
    latestVideoPlay?.classList.add("is-fallback");
  });

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function monogram(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "NG";
    return words.slice(0, 2).map(word => word[0]).join("").toUpperCase();
  }

  function youtubeSearchUrl(name) {
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent("NextGen Sessions " + name);
  }

  function artistDestination(artist) {
    const profile = artistProfiles[artist.slug];
    if (profile?.path) {
      return {
        href: profile.path,
        attributes: "",
        label: `View ${artist.name} artist profile`
      };
    }
    return {
      href: youtubeSearchUrl(artist.name),
      attributes: ' target="_blank" rel="noopener"',
      label: `Explore ${artist.name} on YouTube`
    };
  }

  function featuredImage(artist) {
    const image = artistImages[artist.slug];
    if (!image || !image.src) return "";
    const fallback = image.fallback ? ` data-fallback="${escapeHtml(image.fallback)}"` : "";
    const srcset = image.srcset ? ` srcset="${escapeHtml(image.srcset)}" sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 980px) 50vw, 33vw"` : "";
    const position = escapeHtml(image.position || "50% 38%");
    return `<img class="featured-artist-image" loading="lazy" decoding="async" src="${escapeHtml(image.src)}"${srcset}${fallback} alt="${escapeHtml(artist.name)} portrait" style="--artist-image-position:${position}">`;
  }

  function featuredCard(artist) {
    const hasImage = Boolean(artistImages[artist.slug]?.src);
    const destination = artistDestination(artist);
    return `
      <a class="featured-artist-card${hasImage ? " has-image" : ""}" data-monogram="${escapeHtml(monogram(artist.name))}" href="${escapeHtml(destination.href)}"${destination.attributes} aria-label="${escapeHtml(destination.label)}">
        ${featuredImage(artist)}
        <div class="featured-artist-inner">
          <span class="artist-genre">${escapeHtml(artist.genre)}</span>
          <h3>${escapeHtml(artist.name)}</h3>
          <p>${escapeHtml(artist.summary)}</p>
        </div>
      </a>`;
  }

  function installImageFallbacks(root) {
    root.querySelectorAll(".featured-artist-image").forEach(image => {
      image.addEventListener("error", () => {
        const fallback = image.dataset.fallback;
        if (fallback) {
          image.dataset.fallback = "";
          image.removeAttribute("srcset");
          image.src = fallback;
          return;
        }
        image.hidden = true;
        image.closest(".featured-artist-card, .artist-roster-card")?.classList.remove("has-image");
      }, { once: false });
    });
  }

  function rosterCard(artist) {
    const destination = artistDestination(artist);
    const image = artistImages[artist.slug];
    const hasImage = Boolean(image?.src);
    const fallback = image?.fallback ? ` data-fallback="${escapeHtml(image.fallback)}"` : "";
    const srcset = image?.srcset ? ` srcset="${escapeHtml(image.srcset)}" sizes="(max-width: 720px) calc(50vw - 28px), (max-width: 980px) 33vw, 25vw"` : "";
    const position = escapeHtml(image?.position || "50% 38%");
    const portrait = hasImage
      ? `<img class="artist-roster-image featured-artist-image" loading="lazy" decoding="async" src="${escapeHtml(image.src)}"${srcset}${fallback} alt="${escapeHtml(artist.name)} portrait" style="--artist-image-position:${position}">`
      : "";
    return `
      <a class="artist-roster-card${hasImage ? " has-image" : ""}" data-monogram="${escapeHtml(monogram(artist.name))}" href="${escapeHtml(destination.href)}"${destination.attributes} aria-label="${escapeHtml(destination.label)}">
        ${portrait}
        <div class="artist-roster-copy">
          <span class="artist-genre">${escapeHtml(artist.genre)}</span>
          <h3>${escapeHtml(artist.name)}</h3>
          <p>${escapeHtml(artist.summary)}</p>
        </div>
      </a>`;
  }

  function renderFeatured() {
    if (!featuredGrid) return;
    const featured = artists.filter(artist => artist.featured).slice(0, 6);
    featuredGrid.innerHTML = featured.map(featuredCard).join("");
    installImageFallbacks(featuredGrid);
  }

  function renderRoster(query) {
    if (!rosterGrid) return;
    const term = String(query || "").trim().toLowerCase();
    const filtered = artists
      .filter(artist => !term || [artist.name, artist.genre, artist.summary].join(" ").toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "en-GB"));

    rosterGrid.innerHTML = filtered.map(rosterCard).join("");
    installImageFallbacks(rosterGrid);
    if (rosterCount) {
      rosterCount.textContent = `${filtered.length} artist${filtered.length === 1 ? "" : "s"}${term ? " found" : ""}`;
    }
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function releaseCard(release) {
    const id = escapeHtml(release.id);
    const title = escapeHtml(release.title || "NextGen Sessions release");
    const date = formatDate(release.published);
    const destination = String(release?.url || "").startsWith("/releases/")
      ? release.url
      : "/releases/";
    return `
      <a class="release-card" href="${escapeHtml(destination)}">
        <img loading="lazy" decoding="async" src="/api/release-image?id=${encodeURIComponent(release.id)}" alt="${title} release thumbnail">
        <div class="release-meta">
          <span class="tag">Official release</span>
          <h3>${title}</h3>
          <p>View release</p>
          ${date ? `<span class="release-date">${escapeHtml(date)}</span>` : ""}
        </div>
      </a>`;
  }

  function updateLatest(payload) {
    const releases = Array.isArray(payload?.releases) && payload.releases.length
      ? payload.releases
      : (Array.isArray(payload?.items) && payload.items.length ? payload.items : FALLBACK_RELEASES);
    const latest = payload?.latest?.id ? payload.latest : (releases[0] || FALLBACK_LATEST);

    const latestTitle = document.getElementById("latestVideoTitle");
    const latestDate = document.getElementById("latestVideoDate");
    const latestLink = document.getElementById("latestWatchLink");
    const heroLink = document.getElementById("heroLatestLink");
    const latestStatus = document.getElementById("latestStatus");

    updateLatestPlayer(latest);
    if (latestTitle) latestTitle.textContent = latest.title || "Latest NextGen Sessions release";
    if (latestDate) {
      const date = formatDate(latest.published);
      latestDate.textContent = date ? `Published ${date}` : "Latest official NextGen Sessions release";
    }

    const watchUrl = `https://www.youtube.com/watch?v=${latest.id}`;
    if (latestLink) latestLink.href = watchUrl;
    if (heroLink) heroLink.href = watchUrl;

    if (latestStatus) latestStatus.textContent = "Now available on YouTube";

    if (releaseGrid) releaseGrid.innerHTML = releases.slice(0, 6).map(releaseCard).join("");
  }

  renderFeatured();
  renderRoster("");

  if (artistSearch) {
    artistSearch.addEventListener("input", event => renderRoster(event.target.value));
  }

  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  }

  function normaliseHomepageRelease(release) {
    const id = safeVideoId(release?.id);
    if (!id) return null;
    const artist = String(release?.artist || "").trim();
    const releaseTitle = String(release?.title || "").trim();
    const hasArtistPrefix = artist && releaseTitle.toLowerCase().startsWith(artist.toLowerCase());
    const title = artist && releaseTitle && !hasArtistPrefix
      ? `${artist} – ${releaseTitle}`
      : (releaseTitle || "Latest NextGen Sessions release");
    return {
      id,
      title,
      published: String(release?.published || release?.updated || "").trim(),
      url: String(release?.url || "").trim()
    };
  }

  function releaseTimestamp(release) {
    return Date.parse(release?.published || "") || 0;
  }

  function uniqueHomepageReleases(releases) {
    const seen = new Set();
    return releases.filter(release => {
      if (!release?.id || seen.has(release.id)) return false;
      seen.add(release.id);
      return true;
    });
  }

  function payloadReleases(payload) {
    const items = Array.isArray(payload?.releases) && payload.releases.length
      ? payload.releases
      : (Array.isArray(payload?.items) ? payload.items : []);
    return items.map(normaliseHomepageRelease).filter(Boolean);
  }

  function mergeHomepageReleases(releases) {
    const byId = new Map();
    releases.forEach(release => {
      if (!release?.id) return;
      const existing = byId.get(release.id);
      if (!existing || releaseTimestamp(release) > releaseTimestamp(existing)) {
        byId.set(release.id, release);
      }
    });
    return [...byId.values()].sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a));
  }

  function buildHomepagePayload(apiPayload, cataloguePayload) {
    const apiReleases = payloadReleases(apiPayload);
    const catalogueReleases = payloadReleases(cataloguePayload);
    const catalogueIds = new Set(catalogueReleases.map(release => release.id));
    const isCuratedRelease = release => !catalogueIds.size || catalogueIds.has(release?.id);
    const verifiedApiReleases = apiReleases.filter(isCuratedRelease);
    const fallbackReleases = FALLBACK_RELEASES
      .map(normaliseHomepageRelease)
      .filter(Boolean);
    const offlineReleases = mergeHomepageReleases([
      ...catalogueReleases,
      ...fallbackReleases
    ]);
    const releases = uniqueHomepageReleases([
      ...verifiedApiReleases,
      ...offlineReleases
    ]);

    const apiLatest = normaliseHomepageRelease(apiPayload?.latest);
    const verifiedApiLatest = apiLatest && isCuratedRelease(apiLatest)
      ? apiLatest
      : (verifiedApiReleases[0] || null);
    const latest = verifiedApiLatest || offlineReleases[0] || FALLBACK_LATEST;

    return { latest, releases };
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  Promise.allSettled([
    fetchJson("/api/latest?v=r2"),
    fetchJson("/releases.json?homepage=20260807-r2")
  ]).then(results => {
    const apiPayload = results[0].status === "fulfilled" ? results[0].value : null;
    const cataloguePayload = results[1].status === "fulfilled" ? results[1].value : null;
    updateLatest(buildHomepagePayload(apiPayload, cataloguePayload));
  }).catch(() => updateLatest({
    latest: FALLBACK_LATEST,
    releases: FALLBACK_RELEASES
  }));
})();
