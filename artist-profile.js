(function () {
  "use strict";

  const root = document.getElementById("artistProfile");
  if (!root) return;

  const profiles = window.NGS_ARTIST_PROFILES || {};
  const slug = String(root.dataset.artist || "").trim();
  const artist = profiles[slug];
  const profileByName = Object.values(profiles).reduce((map, profile) => {
    map[String(profile.name || "").trim().toLowerCase()] = profile;
    return map;
  }, {});

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function youtubeSearchUrl(name) {
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent("NextGen Sessions " + name);
  }

  function relatedCard(item) {
    const profile = profileByName[String(item.name || "").trim().toLowerCase()];
    const href = profile?.path || youtubeSearchUrl(item.name);
    const external = profile?.path ? "" : ' target="_blank" rel="noopener"';
    const label = profile?.path ? `View ${item.name} artist profile` : `Explore ${item.name} on YouTube`;
    return `
      <a class="related-card" href="${escapeHtml(href)}"${external} aria-label="${escapeHtml(label)}">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.genre)}</span>
      </a>`;
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
  const imagePosition = escapeHtml(artist.imagePosition || "50% 35%");
  const requestedScale = Number(artist.imageScale);
  const imageScale = Number.isFinite(requestedScale) && requestedScale >= 1 && requestedScale <= 2
    ? requestedScale
    : 1;
  const related = Array.isArray(artist.related) ? artist.related : [];
  const bio = Array.isArray(artist.bio) ? artist.bio : [];
  const videoTitle = video.title || video.label || `${artist.name} featured release`;
  const videoLabel = video.label || `${artist.name} — ${videoTitle}`;
  const videoId = String(video.id || "").trim();

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
          <a class="button button-primary" href="#featured-release">Watch featured release</a>
          <a class="button button-secondary" href="${escapeHtml(artist.youtubeUrl)}" target="_blank" rel="noopener">Open YouTube catalogue</a>
        </div>
      </div>
      <div class="profile-image-shell">
        <img class="profile-image" src="${escapeHtml(artist.image)}" alt="${escapeHtml(artist.name)} artist portrait" style="object-position:${imagePosition};transform:scale(${imageScale});transform-origin:${imagePosition}" data-fallback="${escapeHtml(artist.imageFallback)}">
        <div class="profile-image-label"><strong>${escapeHtml(artist.name)}</strong><span>${escapeHtml(artist.genre)}</span></div>
      </div>
    </section>

    <section class="profile-section" id="featured-release" aria-labelledby="featured-release-title">
      <div class="profile-section-heading">
        <p class="eyebrow">Featured release</p>
        <h2 id="featured-release-title">Watch ${escapeHtml(artist.name)}</h2>
        <p>The artist profile keeps the music central, while the full catalogue remains available through the official NextGen Sessions YouTube channel.</p>
      </div>
      <div class="profile-release-grid">
        <article class="profile-video-card">
          <div class="profile-video-frame">
            ${videoId ? `<iframe loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${escapeHtml(videoId)}?rel=0&amp;modestbranding=1" title="${escapeHtml(videoLabel)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>` : '<div class="profile-video-unavailable">Featured release coming soon.</div>'}
          </div>
          <div class="profile-video-copy">
            <span class="tag">Official NextGen Sessions release</span>
            <h3>${escapeHtml(videoTitle)}</h3>
            <p>Watch the full release without leaving the artist page.</p>
          </div>
        </article>
        <aside class="profile-side-panel">
          <div>
            <h3>Artist lane</h3>
            <p>${escapeHtml(artist.headline)}</p>
          </div>
          ${videoId ? `<a class="button button-primary" href="https://www.youtube.com/watch?v=${escapeHtml(videoId)}" target="_blank" rel="noopener">Open video on YouTube</a>` : ""}
        </aside>
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
        <a class="button button-primary" href="/#artists">Explore all artists</a>
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
})();