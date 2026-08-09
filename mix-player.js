(function () {
  "use strict";

  const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
  const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,64}$/;

  function isValid(kind, id) {
    return (
      (kind === "video" && VIDEO_ID_PATTERN.test(id)) ||
      (kind === "playlist" && PLAYLIST_ID_PATTERN.test(id))
    );
  }

  function getEmbedUrl(kind, id, autoplay) {
    const play = autoplay ? "&autoplay=1" : "";
    if (kind === "video") {
      return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${play}`;
    }
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(id)}&rel=0&modestbranding=1${play}`;
  }

  function getYouTubeUrl(kind, id) {
    if (kind === "video") return `https://www.youtube.com/watch?v=${id}`;
    return `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`;
  }

  function buildPoster(player, title, poster) {
    const button = document.createElement("button");
    button.className = "video-poster";
    button.type = "button";
    button.dataset.mixPlay = "";
    button.setAttribute("aria-label", `Play ${title}`);

    const image = document.createElement("img");
    image.src = poster;
    image.alt = "";
    image.loading = "eager";
    image.decoding = "async";

    const overlay = document.createElement("span");
    overlay.className = "video-poster-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const icon = document.createElement("span");
    icon.className = "video-play-icon";
    const copy = document.createElement("span");
    copy.className = "video-play-copy";
    copy.textContent = "Play on NextGen Sessions";

    overlay.append(icon, copy);
    button.append(image, overlay);
    player.replaceChildren(button);
  }

  function buildFrame(title, src) {
    const frame = document.createElement("iframe");
    frame.title = title;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.src = src;
    return frame;
  }

  document.querySelectorAll("[data-mix-player]").forEach((player) => {
    const originalPoster = player.querySelector("[data-mix-play] img");
    const state = {
      kind: String(player.dataset.kind || "").trim(),
      id: String(player.dataset.id || "").trim(),
      title: String(player.dataset.title || "NextGen Sessions mix").trim(),
      poster: String(player.dataset.poster || originalPoster?.getAttribute("src") || "").trim(),
    };

    if (!isValid(state.kind, state.id) || !state.poster) return;

    const shell = document.createElement("div");
    shell.className = "mix-player-shell";

    const toolbar = document.createElement("div");
    toolbar.className = "mix-now-playing";

    const copy = document.createElement("div");
    const kicker = document.createElement("span");
    kicker.className = "mix-now-playing-kicker";
    kicker.textContent = "Ready to play";
    const title = document.createElement("h3");
    title.className = "mix-now-playing-title";
    title.setAttribute("aria-live", "polite");
    title.textContent = state.title;
    copy.append(kicker, title);

    const youtubeLink = document.createElement("a");
    youtubeLink.className = "mix-youtube-link";
    youtubeLink.target = "_blank";
    youtubeLink.rel = "noopener";
    youtubeLink.textContent = "Open on YouTube";

    toolbar.append(copy, youtubeLink);
    player.before(shell);
    shell.append(toolbar, player);

    function syncToolbar(status) {
      kicker.textContent = status;
      title.textContent = state.title;
      youtubeLink.href = getYouTubeUrl(state.kind, state.id);
      youtubeLink.setAttribute("aria-label", `Open ${state.title} on YouTube`);
    }

    function loadCurrent() {
      if (!isValid(state.kind, state.id)) return;
      syncToolbar("Now playing");
      document.querySelectorAll("[data-mix-option]").forEach((item) => {
        const status = item.querySelector("[data-option-status]");
        if (status && item.classList.contains("is-active")) {
          status.textContent = "Now playing";
        }
      });
      player.replaceChildren(
        buildFrame(state.title, getEmbedUrl(state.kind, state.id, true)),
      );
    }

    function selectOption(option) {
      const next = {
        kind: String(option.dataset.kind || "").trim(),
        id: String(option.dataset.id || "").trim(),
        title: String(option.dataset.title || "").trim(),
        poster: String(option.dataset.poster || "").trim(),
      };
      if (!isValid(next.kind, next.id) || !next.title || !next.poster) return;

      Object.assign(state, next);
      document.querySelectorAll("[data-mix-option]").forEach((item) => {
        const active = item === option;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
        const status = item.querySelector("[data-option-status]");
        if (status) status.textContent = active ? "Selected" : "Play mix";
      });
      buildPoster(player, state.title, state.poster);
      loadCurrent();
    }

    player.addEventListener("click", (event) => {
      if (event.target.closest("[data-mix-play]")) loadCurrent();
    });

    document.querySelectorAll("[data-mix-option]").forEach((option) => {
      option.addEventListener("click", () => selectOption(option));
    });

    syncToolbar("Ready to play");
  });
})();
