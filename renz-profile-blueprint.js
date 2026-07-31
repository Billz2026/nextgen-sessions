(function () {
  "use strict";

  const root = document.getElementById("artistProfile");
  if (!root || root.dataset.artist !== "renz-cole") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeVideoId = "";

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

  function sectionSetup() {
    const latestSection = root.querySelector(".latest-release-section");
    if (latestSection) latestSection.id = "latest-release";

    const storyHeading = document.getElementById("artist-story-title");
    if (storyHeading?.closest(".profile-section")) {
      storyHeading.closest(".profile-section").id = "artist-story";
    }

    const hero = root.querySelector(".profile-hero");
    if (!hero || root.querySelector(".profile-quick-nav")) return;

    const nav = document.createElement("nav");
    nav.className = "profile-quick-nav";
    nav.setAttribute("aria-label", "Renz Cole page navigation");
    nav.innerHTML = `
      <a href="#featured-release">Featured</a>
      <a href="#latest-release">Latest</a>
      <a href="#artist-albums" data-album-jump>Playmaker album</a>
      <a href="#artist-discography">All songs</a>
      <a href="#artist-story">About Renz</a>`;
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
    bar.innerHTML = `
      <img data-now-playing-art src="" alt="" width="96" height="54">
      <div class="profile-now-playing-copy">
        <span>Now playing</span>
        <strong data-now-playing-title>Renz Cole</strong>
        <small data-now-playing-meta>NextGen Sessions</small>
      </div>
      <div class="profile-now-playing-actions">
        <button type="button" data-view-player>View player</button>
        <a data-now-playing-youtube href="#" target="_blank" rel="noopener">YouTube ↗</a>
        <button class="profile-now-playing-close" type="button" data-close-player aria-label="Close now-playing bar">×</button>
      </div>`;
    document.body.append(bar);

    bar.querySelector("[data-view-player]")?.addEventListener("click", () => {
      document.getElementById("featured-release")?.scrollIntoView({
        behavior: prefersReducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
    });

    bar.querySelector("[data-close-player]")?.addEventListener("click", () => {
      bar.hidden = true;
      document.body.classList.remove("has-profile-player");
    });

    return bar;
  }

  function setActiveRelease(videoId) {
    root.querySelectorAll("[data-profile-release-id]").forEach(card => {
      card.classList.toggle("is-now-playing", card.dataset.profileReleaseId === videoId);
    });
  }

  function playInMainPlayer(videoId, title, meta, sourceLabel) {
    const id = safeVideoId(videoId);
    if (!id) return;

    activeVideoId = id;
    const frame = root.querySelector("[data-featured-frame]");
    const heading = root.querySelector("[data-featured-title]");
    const tag = root.querySelector("[data-featured-tag]");
    const copy = root.querySelector("[data-featured-copy]");
    const link = root.querySelector("[data-featured-link]");

    if (frame) {
      frame.innerHTML = `<iframe loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${id}?rel=0&amp;modestbranding=1&amp;autoplay=1" title="Renz Cole — ${escapeHtml(title)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
    }
    if (heading) heading.textContent = title;
    if (tag) tag.textContent = sourceLabel || "Now playing";
    if (copy) copy.textContent = meta || "Playing through the Renz Cole profile player.";
    if (link) {
      link.href = `https://www.youtube.com/watch?v=${id}`;
      link.hidden = false;
    }

    const bar = nowPlayingBar();
    const artwork = bar.querySelector("[data-now-playing-art]");
    const barTitle = bar.querySelector("[data-now-playing-title]");
    const barMeta = bar.querySelector("[data-now-playing-meta]");
    const youtube = bar.querySelector("[data-now-playing-youtube]");
    if (artwork) artwork.src = `/api/release-image?id=${encodeURIComponent(id)}`;
    if (barTitle) barTitle.textContent = title;
    if (barMeta) barMeta.textContent = meta || "Renz Cole · NextGen Sessions";
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
        title: trigger.dataset.albumTitle || textFrom(albumCard, "h3", "Playmaker"),
        meta: "Full album · Renz Cole",
        label: "Full album"
      };
    }

    const explicitButton = trigger.matches("[data-play-release]")
      ? trigger
      : releaseCard?.querySelector("[data-play-release]");
    if (!explicitButton) return null;

    const title = textFrom(releaseCard, "h3", textFrom(albumTrack, "strong", "Renz Cole release"));
    const meta = releaseCard
      ? textFrom(releaseCard, ".latest-release-copy p,.discography-card-body p", "Renz Cole · Official release")
      : `${textFrom(albumTrack, "span", "Playmaker album")} · Renz Cole`;

    return {
      id: explicitButton.dataset.playRelease,
      title,
      meta,
      label: releaseCard?.classList.contains("latest-release-card") ? "Latest release" : "Now playing"
    };
  }

  function handlePlayIntent(event) {
    if (!(event.target instanceof Element)) return;
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
      if (playButton.textContent.trim() !== "Play now") playButton.textContent = "Play now";

      const art = card.querySelector(".discography-art,.latest-release-art");
      if (art && !art.classList.contains("is-quick-play")) {
        art.classList.add("is-quick-play");
        art.tabIndex = 0;
        art.setAttribute("role", "button");
        art.setAttribute("aria-label", `Play ${textFrom(card, "h3", "Renz Cole release")}`);
        art.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          art.click();
        });
      }
    });

    root.querySelectorAll(".album-track [data-play-release]").forEach(button => {
      if (button.textContent.trim() !== "Play now") button.textContent = "Play now";
    });

    root.querySelectorAll(".album-meta span").forEach(span => {
      const match = span.textContent.match(/^(\d+) included releases?$/i);
      if (!match) return;
      const count = Number(match[1]);
      span.textContent = `${count} standalone video${count === 1 ? "" : "s"} from this album`;
    });

    if (activeVideoId) setActiveRelease(activeVideoId);
  }

  function updateAlbumJump() {
    const albumJump = root.querySelector("[data-album-jump]");
    if (!albumJump) return;
    albumJump.hidden = !document.getElementById("artist-albums");
  }

  sectionSetup();
  enhanceCards();
  updateAlbumJump();

  const catalogueObserver = new MutationObserver(() => {
    sectionSetup();
    enhanceCards();
    updateAlbumJump();
  });
  catalogueObserver.observe(root, { childList: true, subtree: true });

  document.addEventListener("click", handlePlayIntent, true);
})();
