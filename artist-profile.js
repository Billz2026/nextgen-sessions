(function () {
  "use strict";

  if (!document.querySelector('script[src="/site-metrics.js"]')) {
    const metrics = document.createElement("script");
    metrics.src = "/site-metrics.js";
    metrics.async = true;
    document.head.append(metrics);
  }

  if (!document.querySelector('link[href="/artist-discography.css"]')) {
    const discographyStyles = document.createElement("link");
    discographyStyles.rel = "stylesheet";
    discographyStyles.href = "/artist-discography.css";
    document.head.append(discographyStyles);
  }

  const root = document.getElementById("artistProfile");
  if (!root) return;

  const profiles = window.NGS_ARTIST_PROFILES || {};
  const imageLibrary = window.NGS_ARTIST_IMAGES && typeof window.NGS_ARTIST_IMAGES === "object"
    ? window.NGS_ARTIST_IMAGES
    : {};
  const slug = String(root.dataset.artist || "").trim();
  const artist = profiles[slug];
  const profileByName = Object.values(profiles).reduce((map, profile) => {
    map[normaliseText(profile.name)] = profile;
    return map;
  }, {});

  const manualReleaseOverrides = {
    "asif-sultaan": [
      {
        id: "7EXt64hyMfA",
        artist: "Asif Sultaan",
        title: "Wazan",
        group: "Asian",
        published: "",
        source: "profile-override"
      }
    ]
  };

  let artistReleases = [];

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normaliseText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function monogram(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    return (words.slice(0, 2).map(word => word[0]).join("") || "NG").toUpperCase();
  }

  function youtubeSearchUrl(name) {
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent("NextGen Sessions " + name);
  }

  function formatDate(value) {
    if (!value) return "Official release";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Official release";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  }

  function relatedCard(item) {
    const profile = profileByName[normaliseText(item.name)];
    const href = profile?.path || youtubeSearchUrl(item.name);
    const external = profile?.path ? "" : ' target="_blank" rel="noopener"';
    const label = profile?.path ? `View ${item.name} artist profile` : `Explore ${item.name} on YouTube`;
    return `
      <a class="related-card" href="${escapeHtml(href)}"${external} aria-label="${escapeHtml(label)}">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.genre)}</span>
      </a>`;
  }

  function normaliseRelease(release, fallbackArtist) {
    const id = safeVideoId(release?.id);
    const title = String(release?.title || "").trim();
    const releaseArtist = String(release?.artist || fallbackArtist || "").trim();
    if (!id || !title || !releaseArtist) return null;
    return {
      id,
      artist: releaseArtist,
      title,
      group: String(release?.group || artist?.genre || "Official release").trim(),
      published: String(release?.published || "").trim(),
      rawTitle: String(release?.rawTitle || `${releaseArtist} - ${title}`).trim(),
      source: String(release?.source || "catalogue")
    };
  }

  function artistAliases() {
    const configured = Array.isArray(artist?.catalogueAliases) ? artist.catalogueAliases : [];
    return [artist?.name, ...configured].map(normaliseText).filter(Boolean);
  }

  function releaseMatchesArtist(release) {
    const releaseArtist = normaliseText(release?.artist);
    if (!releaseArtist) return false;
    return artistAliases().some(alias => {
      if (releaseArtist === alias) return true;
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|\\s)(?:${escaped})(?:\\s|$|,|&|x|feat\\.?|ft\\.?)`, "i").test(releaseArtist);
    });
  }

  function uniqueReleases(releases) {
    const seenIds = new Set();
    const seenTitles = new Set();
    return releases.filter(release => {
      if (!release) return false;
      const titleKey = `${normaliseText(release.artist)}|${normaliseText(release.title)}`;
      if (seenIds.has(release.id) || seenTitles.has(titleKey)) return false;
      seenIds.add(release.id);
      seenTitles.add(titleKey);
      return true;
    });
  }

  function sortReleases(releases) {
    return [...releases].sort((a, b) => {
      const aTime = Date.parse(a.published || "") || 0;
      const bTime = Date.parse(b.published || "") || 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.title.localeCompare(b.title, "en-GB");
    });
  }

  function configuredFeaturedRelease() {
    const video = artist?.featuredVideo || {};
    return normaliseRelease({
      id: video.id,
      artist: artist?.name,
      title: video.title || video.label || `${artist?.name} featured release`,
      group: artist?.genre,
      published: video.published || "",
      source: "featured"
    }, artist?.name);
  }

  function currentManualReleases() {
    const profileReleases = Array.isArray(artist?.additionalReleases) ? artist.additionalReleases : [];
    const fallbackReleases = manualReleaseOverrides[slug] || [];
    return [...profileReleases, ...fallbackReleases]
      .map(release => normaliseRelease(release, artist?.name))
      .filter(Boolean);
  }

  async function loadCatalogue() {
    for (const endpoint of ["/releases.json", "/api/releases"]) {
      try {
        const response = await fetch(endpoint, {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) continue;
        const payload = await response.json();
        if (Array.isArray(payload?.releases)) return payload.releases;
      } catch (_) {
        // Try the next controlled source.
      }
    }
    return [];
  }

  function featuredFrame(release, scheduledRelease, releaseDate) {
    if (release?.id) {
      return `<iframe loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${escapeHtml(release.id)}?rel=0&amp;modestbranding=1" title="${escapeHtml(`${artist.name} — ${release.title}`)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
    }
    if (scheduledRelease) {
      return `<div class="profile-video-unavailable">${escapeHtml(release?.title || "Upcoming release")} releases ${escapeHtml(releaseDate)}.</div>`;
    }
    return '<div class="profile-video-unavailable">Featured release coming soon.</div>';
  }

  function releaseArtwork(release, className) {
    const initials = monogram(release.artist);
    return `
      <div class="${className}" data-monogram="${escapeHtml(initials)}">
        <img loading="lazy" decoding="async" src="/api/release-image?id=${encodeURIComponent(release.id)}" alt="${escapeHtml(`${release.title} by ${release.artist}`)}">
        <span class="discography-play-mark" aria-hidden="true">▶</span>
      </div>`;
  }

  function latestReleaseMarkup(release) {
    return `
      <article class="latest-release-card">
        ${releaseArtwork(release, "latest-release-art")}
        <div class="latest-release-copy">
          <span class="tag">Latest release</span>
          <h3>${escapeHtml(release.title)}</h3>
          <p>${escapeHtml(release.group)} · ${escapeHtml(formatDate(release.published))}</p>
          <div class="discography-actions">
            <button class="button button-primary" type="button" data-play-release="${escapeHtml(release.id)}">Play latest here</button>
            <a class="button button-secondary" href="https://www.youtube.com/watch?v=${escapeHtml(release.id)}" target="_blank" rel="noopener">Open on YouTube</a>
          </div>
        </div>
      </article>`;
  }

  function releaseCardMarkup(release) {
    return `
      <article class="discography-card">
        ${releaseArtwork(release, "discography-art")}
        <div class="discography-card-body">
          <span class="discography-genre">${escapeHtml(release.group)}</span>
          <h3>${escapeHtml(release.title)}</h3>
          <p>${escapeHtml(formatDate(release.published))}</p>
          <div class="discography-card-actions">
            <button type="button" data-play-release="${escapeHtml(release.id)}">Play here</button>
            <a href="https://www.youtube.com/watch?v=${escapeHtml(release.id)}" target="_blank" rel="noopener">YouTube ↗</a>
          </div>
        </div>
      </article>`;
  }

  function setFeaturedPlayer(release, sourceLabel) {
    if (!release?.id) return;
    const frame = root.querySelector("[data-featured-frame]");
    const title = root.querySelector("[data-featured-title]");
    const tag = root.querySelector("[data-featured-tag]");
    const copy = root.querySelector("[data-featured-copy]");
    const link = root.querySelector("[data-featured-link]");
    if (frame) frame.innerHTML = featuredFrame(release, false, "");
    if (title) title.textContent = release.title;
    if (tag) tag.textContent = sourceLabel || "Now playing";
    if (copy) copy.textContent = `${release.group} · ${formatDate(release.published)}`;
    if (link) {
      link.href = `https://www.youtube.com/watch?v=${release.id}`;
      link.hidden = false;
    }
  }

  function renderCatalogue(releases) {
    const latestHost = root.querySelector("[data-latest-release]");
    const grid = root.querySelector("[data-discography-grid]");
    const count = root.querySelector("[data-discography-count]");
    const status = root.querySelector("[data-discography-status]");

    if (!releases.length) {
      if (latestHost) latestHost.innerHTML = '<div class="discography-empty">Latest release will appear automatically when the catalogue is updated.</div>';
      if (grid) grid.innerHTML = '<div class="discography-empty">No catalogue releases are available for this artist yet.</div>';
      if (count) count.textContent = "0 releases";
      if (status) status.textContent = "Catalogue unavailable";
      return;
    }

    const latest = releases[0];
    if (latestHost) latestHost.innerHTML = latestReleaseMarkup(latest);
    if (grid) grid.innerHTML = releases.map(releaseCardMarkup).join("");
    if (count) count.textContent = `${releases.length} release${releases.length === 1 ? "" : "s"}`;
    if (status) status.textContent = "Updates automatically from the official catalogue";

    const configured = configuredFeaturedRelease();
    const resolvedFeatured = configured
      ? releases.find(release => release.id === configured.id) || configured
      : null;
    if (resolvedFeatured) setFeaturedPlayer(resolvedFeatured, "Featured release");
  }

  if (!artist) {
    root.innerHTML = `
      <section class="profile-error">
        <p class="eyebrow">Artist profile unavailable</p>
        <h1>Profile not found.</h1>
        <p class="hero-copy">This artist page has not been published yet.</p>
        <a class="button button-primary" href="/#artists">Return to the roster</a>
      </section>`;
    return;
  }

  document.title = `${artist.name} | ${artist.genre} | NextGen Sessions`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", artist.headline);

  const video = artist.featuredVideo || {};
  const libraryImage = artist.imageKey ? imageLibrary[artist.imageKey] : null;
  const imageSrc = String(artist.image || libraryImage?.portrait || libraryImage?.src || "").trim();
  const imageFallback = String(artist.imageFallback || libraryImage?.fallback || "").trim();
  const imagePosition = escapeHtml(artist.imagePosition || libraryImage?.position || "50% 35%");
  const requestedScale = Number(artist.imageScale);
  const imageScale = Number.isFinite(requestedScale) && requestedScale >= 1 && requestedScale <= 2
    ? requestedScale
    : 1;
  const related = Array.isArray(artist.related) ? artist.related : [];
  const bio = Array.isArray(artist.bio) ? artist.bio : [];
  const configuredRelease = configuredFeaturedRelease();
  const releaseDate = String(video.releaseDate || "").trim();
  const scheduledRelease = !configuredRelease?.id && Boolean(releaseDate);
  const releaseTitle = configuredRelease?.title || video.title || `${artist.name} featured release`;
  const releaseTag = scheduledRelease ? "Upcoming NextGen Sessions release" : "Featured NextGen Sessions release";
  const releaseCopy = scheduledRelease
    ? `The official video will be added when the release goes public on ${releaseDate}.`
    : "The featured release is selected by NextGen Sessions. Use the catalogue below to play any other track on this page.";
  const portrait = imageSrc
    ? `<img class="profile-image" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(artist.name)} artist portrait" style="object-position:${imagePosition};transform:scale(${imageScale});transform-origin:${imagePosition}" data-fallback="${escapeHtml(imageFallback)}">`
    : `<div class="profile-image-placeholder" aria-hidden="true">${escapeHtml(monogram(artist.name))}</div>`;

  root.innerHTML = `
    <section class="profile-hero" aria-labelledby="artist-title">
      <div>
        <a class="profile-back" href="/#featured-artists">← Back to featured artists</a>
        <p class="eyebrow">${escapeHtml(artist.eyebrow)}</p>
        <span class="profile-genre">${escapeHtml(artist.genre)}</span>
        <h1 class="profile-title" id="artist-title">${escapeHtml(artist.name)}</h1>
        <p class="profile-headline">${escapeHtml(artist.headline)}</p>
        <p class="profile-location">${escapeHtml(artist.location)}</p>
        <div class="button-row" style="margin-top:24px">
          <a class="button button-primary" href="#featured-release">${scheduledRelease ? "View upcoming release" : "Watch featured release"}</a>
          <a class="button button-secondary" href="#artist-discography">View all releases</a>
        </div>
      </div>
      <div class="profile-image-shell">
        ${portrait}
        <div class="profile-image-label"><strong>${escapeHtml(artist.name)}</strong><span>${escapeHtml(artist.genre)}</span></div>
      </div>
    </section>

    <section class="profile-section" id="featured-release" aria-labelledby="featured-release-title">
      <div class="profile-section-heading">
        <p class="eyebrow">${scheduledRelease ? "Upcoming release" : "Featured release"}</p>
        <h2 id="featured-release-title">Selected by NextGen Sessions</h2>
        <p>The featured track stays under editorial control, while the latest release and full catalogue update automatically below.</p>
      </div>
      <div class="profile-release-grid">
        <article class="profile-video-card">
          <div class="profile-video-frame" data-featured-frame>
            ${featuredFrame(configuredRelease || { title: releaseTitle }, scheduledRelease, releaseDate)}
          </div>
          <div class="profile-video-copy">
            <span class="tag" data-featured-tag>${releaseTag}</span>
            <h3 data-featured-title>${escapeHtml(releaseTitle)}</h3>
            <p data-featured-copy>${escapeHtml(releaseCopy)}</p>
          </div>
        </article>
        <aside class="profile-side-panel">
          <div>
            <h3>Artist lane</h3>
            <p>${escapeHtml(artist.headline)}</p>
          </div>
          <a class="button button-primary" data-featured-link href="${configuredRelease?.id ? `https://www.youtube.com/watch?v=${escapeHtml(configuredRelease.id)}` : "#"}" target="_blank" rel="noopener"${configuredRelease?.id ? "" : " hidden"}>Open video on YouTube</a>
        </aside>
      </div>
    </section>

    <section class="profile-section latest-release-section" aria-labelledby="latest-release-title">
      <div class="profile-section-heading profile-section-heading-split">
        <div>
          <p class="eyebrow">Latest release</p>
          <h2 id="latest-release-title">Newest from ${escapeHtml(artist.name)}</h2>
        </div>
        <p data-discography-status aria-live="polite">Loading official catalogue…</p>
      </div>
      <div data-latest-release>
        <div class="discography-loading" aria-hidden="true"></div>
      </div>
    </section>

    <section class="profile-section" id="artist-discography" aria-labelledby="artist-discography-title">
      <div class="profile-section-heading profile-section-heading-split">
        <div>
          <p class="eyebrow">All releases</p>
          <h2 id="artist-discography-title">${escapeHtml(artist.name)} discography</h2>
          <p>Every official catalogue release stays here, newest first. New tracks appear automatically after the release catalogue refreshes.</p>
        </div>
        <strong class="discography-count" data-discography-count aria-live="polite">Loading…</strong>
      </div>
      <div class="discography-grid" data-discography-grid aria-live="polite">
        <div class="discography-loading" aria-hidden="true"></div>
        <div class="discography-loading" aria-hidden="true"></div>
        <div class="discography-loading" aria-hidden="true"></div>
      </div>
    </section>

    <section class="profile-section" aria-labelledby="artist-story-title">
      <div class="profile-section-heading">
        <p class="eyebrow">Artist identity</p>
        <h2 id="artist-story-title">A distinct lane within NextGen.</h2>
      </div>
      <div class="profile-bio-grid">
        <article class="profile-bio">${bio.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}</article>
        <aside class="profile-related">
          <h3>Related artists</h3>
          <div class="related-list">${related.map(relatedCard).join("")}</div>
        </aside>
      </div>
    </section>

    <section class="profile-section">
      <div class="profile-cta">
        <div>
          <p class="eyebrow">Continue exploring</p>
          <h2>Discover the full roster.</h2>
          <p>Browse artists across UK rap, hip-hop, dancehall, reggae, R&amp;B and global sounds.</p>
        </div>
        <a class="button button-primary" href="/artists/">Explore all artists</a>
      </div>
    </section>`;

  const profileImage = root.querySelector(".profile-image");
  if (profileImage) {
    profileImage.addEventListener("error", () => {
      const fallback = profileImage.dataset.fallback;
      if (fallback && profileImage.src !== fallback) {
        profileImage.src = fallback;
        return;
      }
      profileImage.hidden = true;
      profileImage.closest(".profile-image-shell")?.classList.add("profile-image-missing");
    });
  }

  root.addEventListener("error", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.closest(".discography-art,.latest-release-art")) return;
    image.hidden = true;
    image.parentElement?.classList.add("image-unavailable");
  }, true);

  root.addEventListener("click", event => {
    const button = event.target.closest("[data-play-release]");
    if (!button) return;
    const release = artistReleases.find(item => item.id === button.dataset.playRelease);
    if (!release) return;
    setFeaturedPlayer(release, release.id === artistReleases[0]?.id ? "Latest release" : "Now playing");
    document.getElementById("featured-release")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  });

  loadCatalogue()
    .then(catalogue => {
      const catalogueMatches = catalogue
        .map(release => normaliseRelease(release))
        .filter(releaseMatchesArtist);
      const merged = uniqueReleases([
        ...catalogueMatches,
        ...currentManualReleases(),
        configuredFeaturedRelease()
      ]);
      artistReleases = sortReleases(merged);
      renderCatalogue(artistReleases);
    })
    .catch(() => {
      artistReleases = sortReleases(uniqueReleases([
        ...currentManualReleases(),
        configuredFeaturedRelease()
      ]));
      renderCatalogue(artistReleases);
    });
})();
