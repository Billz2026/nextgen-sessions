(function () {
  "use strict";

  const root = document.getElementById("artistProfile");
  if (!root) return;

  const profiles = window.NGS_ARTIST_PROFILES || {};
  const slug = String(root.dataset.artist || "").trim();
  const artist = profiles[slug];
  const experience = artist?.featuredExperience || {};
  if (!artist || experience.enabled !== true) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const player = {
    activeVideoId: "",
    initial: null
  };

  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function textFrom(element, selector, fallback) {
    return String(element?.querySelector(selector)?.textContent || fallback || "").trim();
  }

  function smoothScrollTo(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  }

  function rememberInitialPlayer() {
    if (player.initial) return;
    const frame = root.querySelector("[data-featured-frame]");
    const title = root.querySelector("[data-featured-title]");
    const tag = root.querySelector("[data-featured-tag]");
    const copy = root.querySelector("[data-featured-copy]");
    const link = root.querySelector("[data-featured-link]");
    if (!frame) return;

    player.initial = {
      frameMarkup: frame.innerHTML,
      title: title?.textContent || "",
      tag: tag?.textContent || "",
      copy: copy?.textContent || "",
      linkHref: link?.getAttribute("href") || "#",
      linkHidden: Boolean(link?.hidden)
    };
  }

  function sectionSetup() {
    const latestSection = root.querySelector(".latest-release-section");
    if (latestSection) latestSection.id = "latest-release";

    const storyHeading = document.getElementById("artist-story-title");
    const storySection = storyHeading?.closest(".profile-section");
    if (storySection) storySection.id = "artist-story";

    const hero = root.querySelector(".profile-hero");
    if (!hero || root.querySelector(".profile-quick-nav")) return;

    const albumLabel = String(experience.albumLabel || "Albums").trim();
    const aboutLabel = String(experience.aboutLabel || `About ${artist.name}`).trim();
    const nav = document.createElement("nav");
    nav.className = "profile-quick-nav";
    nav.setAttribute("aria-label", `${artist.name} page navigation`);
    nav.innerHTML = `
      <a href="#featured-release">Featured</a>
      <a href="#latest-release">Latest</a>
      <a href="#artist-albums" data-album-jump>${escapeHtml(albumLabel)}</a>
      <a href="#artist-discography">All songs</a>
      <a href="#artist-story">${escapeHtml(aboutLabel)}</a>`;
    hero.insertAdjacentElement("afterend", nav);
  }

  function nowPlayingBar() {
    let bar = document.getElementById("profileNowPlaying");
    if (bar) return bar;

    bar = document.createElement("aside");
    bar.id = "profileNowPlaying";
    bar.className = "profile-now-playing";
    bar.hidden = true;
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("aria-label", "Now playing");
    bar.innerHTML = `
      <img data-now-playing-art src="" alt="" width="112" height="63">
      <div class="profile-now-playing-copy">
        <span>Now playing</span>
        <strong data-now-playing-title>${escapeHtml(artist.name)}</strong>
        <small data-now-playing-meta>NextGen Sessions</small>
      </div>
      <div class="profile-now-playing-actions">
        <button type="button" data-view-player>View player</button>
        <a data-now-playing-youtube href="#" target="_blank" rel="noopener">YouTube ↗</a>
        <button class="profile-now-playing-stop" type="button" data-stop-player>Stop</button>
      </div>`;
    document.body.append(bar);

    bar.querySelector("[data-view-player]")?.addEventListener("click", () => {
      smoothScrollTo("featured-release");
    });
    bar.querySelector("[data-stop-player]")?.addEventListener("click", stopPlayback);

    const artwork = bar.querySelector("[data-now-playing-art]");
    artwork?.addEventListener("error", () => {
      artwork.hidden = true;
      bar.classList.add("is-artwork-missing");
    });

    return bar;
  }

  function setActiveRelease(videoId) {
    root.querySelectorAll("[data-profile-release-id]").forEach(card => {
      const active = card.dataset.profileReleaseId === videoId;
      card.classList.toggle("is-now-playing", active);
      if (active) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
    });
  }

  function stopPlayback() {
    const frame = root.querySelector("[data-featured-frame]");
    const title = root.querySelector("[data-featured-title]");
    const tag = root.querySelector("[data-featured-tag]");
    const copy = root.querySelector("[data-featured-copy]");
    const link = root.querySelector("[data-featured-link]");

    if (frame) {
      frame.innerHTML = player.initial?.frameMarkup ||
        '<div class="profile-video-unavailable">Choose a release below to start playback.</div>';
    }
    if (title && player.initial) title.textContent = player.initial.title;
    if (tag && player.initial) tag.textContent = player.initial.tag;
    if (copy && player.initial) copy.textContent = player.initial.copy;
    if (link && player.initial) {
      link.href = player.initial.linkHref;
      link.hidden = player.initial.linkHidden;
    }

    player.activeVideoId = "";
    setActiveRelease("");
    const bar = document.getElementById("profileNowPlaying");
    if (bar) bar.hidden = true;
    document.body.classList.remove("has-profile-player");
  }

  function playInMainPlayer(videoId, title, meta, sourceLabel) {
    const id = safeVideoId(videoId);
    if (!id) return;

    rememberInitialPlayer();
    player.activeVideoId = id;

    const frame = root.querySelector("[data-featured-frame]");
    const heading = root.querySelector("[data-featured-title]");
    const tag = root.querySelector("[data-featured-tag]");
    const copy = root.querySelector("[data-featured-copy]");
    const link = root.querySelector("[data-featured-link]");

    if (frame) {
      frame.innerHTML = `<iframe loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}?rel=0&amp;modestbranding=1&amp;autoplay=1" title="${escapeHtml(`${artist.name} — ${title}`)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
    }
    if (heading) heading.textContent = title;
    if (tag) tag.textContent = sourceLabel || "Now playing";
    if (copy) copy.textContent = meta || `Playing through the ${artist.name} profile player.`;
    if (link) {
      link.href = `https://www.youtube.com/watch?v=${id}`;
      link.hidden = false;
    }

    const bar = nowPlayingBar();
    const artwork = bar.querySelector("[data-now-playing-art]");
    const barTitle = bar.querySelector("[data-now-playing-title]");
    const barMeta = bar.querySelector("[data-now-playing-meta]");
    const youtube = bar.querySelector("[data-now-playing-youtube]");

    if (artwork) {
      artwork.hidden = false;
      artwork.src = `/api/release-image?id=${encodeURIComponent(id)}`;
      artwork.alt = `${title} artwork`;
      bar.classList.remove("is-artwork-missing");
    }
    if (barTitle) barTitle.textContent = title;
    if (barMeta) barMeta.textContent = meta || `${artist.name} · NextGen Sessions`;
    if (youtube) youtube.href = `https://www.youtube.com/watch?v=${id}`;

    bar.hidden = false;
    document.body.classList.add("has-profile-player");
    setActiveRelease(id);
  }

  function releaseDetails(trigger) {
    const releaseCard = trigger.closest(".discography-card,.latest-release-card");
    const albumTrack = trigger.closest(".album-track");
    const albumCard = trigger.closest(".album-card");

    if (trigger.matches("[data-play-album]")) {
      return {
        id: trigger.dataset.playAlbum,
        title: trigger.dataset.albumTitle || textFrom(albumCard, "h3", `${artist.name} album`),
        meta: `Full album · ${artist.name}`,
        label: "Full album"
      };
    }

    const explicitButton = trigger.matches("[data-play-release]")
      ? trigger
      : releaseCard?.querySelector("[data-play-release]");
    if (!explicitButton) return null;

    const title = releaseCard
      ? textFrom(releaseCard, "h3", `${artist.name} release`)
      : textFrom(albumTrack, "strong", `${artist.name} release`);
    const meta = releaseCard
      ? textFrom(
          releaseCard,
          ".latest-release-copy p,.discography-card-body p",
          `${artist.name} · Official release`
        )
      : `${textFrom(albumTrack, "span", experience.albumLabel || "Album release")} · ${artist.name}`;

    return {
      id: explicitButton.dataset.playRelease,
      title,
      meta,
      label: releaseCard?.classList.contains("latest-release-card") ? "Latest release" : "Now playing"
    };
  }

  function handlePlayIntent(event) {
    const trigger = event.target.closest(
      "[data-play-release],[data-play-album],.discography-art.is-quick-play,.latest-release-art.is-quick-play"
    );
    if (!trigger || !root.contains(trigger)) return;

    const details = releaseDetails(trigger);
    if (!details?.id) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    playInMainPlayer(details.id, details.title, details.meta, details.label);
  }

  function enhanceCards() {
    root.querySelectorAll(".discography-card,.latest-release-card").forEach(card => {
      const playButton = card.querySelector("[data-play-release]");
      const id = safeVideoId(playButton?.dataset.playRelease);
      if (!id) return;

      card.dataset.profileReleaseId = id;

      if (!playButton.dataset.experienceEnhanced) {
        playButton.dataset.experienceEnhanced = "true";
        playButton.textContent = "Play now";
      }

      const art = card.querySelector(".discography-art,.latest-release-art");
      if (art && !art.dataset.experienceEnhanced) {
        art.dataset.experienceEnhanced = "true";
        art.classList.add("is-quick-play");
        art.tabIndex = 0;
        art.setAttribute("role", "button");
        art.setAttribute("aria-label", `Play ${textFrom(card, "h3", `${artist.name} release`)}`);
        art.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          art.click();
        });
      }
    });

    root.querySelectorAll(".album-track [data-play-release]").forEach(button => {
      if (button.dataset.experienceEnhanced) return;
      button.dataset.experienceEnhanced = "true";
      button.textContent = "Play now";
    });

    root.querySelectorAll(".album-meta span").forEach(span => {
      if (span.dataset.experienceEnhanced) return;
      const match = span.textContent.match(/^(\d+) included releases?$/i);
      if (!match) return;
      span.dataset.experienceEnhanced = "true";
      const count = Number(match[1]);
      span.textContent = `${count} standalone video${count === 1 ? "" : "s"} from this album`;
    });

    if (player.activeVideoId) setActiveRelease(player.activeVideoId);
  }

  function installCatalogueViewToggle() {
    const grid = root.querySelector("[data-discography-grid]");
    const heading = document.getElementById("artist-discography-title")?.closest(".profile-section-heading");
    if (!grid || !heading || heading.querySelector(".catalogue-view-toggle")) return;

    const threshold = Number(experience.compactViewThreshold) || 10;
    const cards = grid.querySelectorAll(".discography-card");
    if (cards.length <= threshold) return;

    const controls = document.createElement("div");
    controls.className = "catalogue-view-toggle";
    controls.setAttribute("aria-label", "Choose catalogue view");
    controls.innerHTML = `
      <button type="button" data-catalogue-view="cards" aria-pressed="true">Cards</button>
      <button type="button" data-catalogue-view="compact" aria-pressed="false">Compact list</button>`;
    heading.append(controls);

    controls.addEventListener("click", event => {
      const button = event.target.closest("[data-catalogue-view]");
      if (!button) return;
      const compact = button.dataset.catalogueView === "compact";
      grid.classList.toggle("is-compact", compact);
      controls.querySelectorAll("button").forEach(item => {
        item.setAttribute("aria-pressed", String(item === button));
      });
    });
  }

  function updateAlbumJump() {
    const albumJump = root.querySelector("[data-album-jump]");
    if (!albumJump) return;
    albumJump.hidden = !document.getElementById("artist-albums");
  }

  function enhanceExperience() {
    sectionSetup();
    rememberInitialPlayer();
    enhanceCards();
    installCatalogueViewToggle();
    updateAlbumJump();
  }

  enhanceExperience();

  const observer = new MutationObserver(enhanceExperience);
  observer.observe(root, { childList: true, subtree: true });

  document.addEventListener("click", handlePlayIntent, true);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && player.activeVideoId) stopPlayback();
  });
})();
