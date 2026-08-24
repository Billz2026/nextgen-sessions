(function () {
  "use strict";

  if (!document.querySelector('script[src="/site-metrics.js"]')) {
    const metrics = document.createElement("script");
    metrics.src = "/site-metrics.js";
    metrics.async = true;
    document.head.append(metrics);
  }

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

  function collectionItems(payload, sourceType, group) {
    if (sourceType === "albums") {
      return (Array.isArray(payload.albums) ? payload.albums : []).map(
        (item) => ({
          kind: "video",
          id: String(item.id || "").trim(),
          title: `${String(item.artist || "NextGen Sessions").trim()} — ${String(item.albumTitle || item.rawTitle || "Full Album").trim()}`,
          label: String(item.artist || "Full album").trim(),
          name: String(item.albumTitle || item.rawTitle || "Full Album").trim(),
          poster: String(item.thumbnail || "").trim(),
        }),
      );
    }

    if (sourceType === "mixes") {
      return (Array.isArray(payload.mixes) ? payload.mixes : [])
        .filter((item) => String(item.collection || "").trim() === group)
        .map((item) => ({
          kind: "video",
          id: String(item.id || "").trim(),
          title: String(
            item.title || item.rawTitle || "NextGen Sessions mix",
          ).trim(),
          label: String(item.label || "Full-length mix").trim(),
          name: String(item.name || "NextGen Sessions mix").trim(),
          poster: String(
            item.thumbnail ||
              `https://i.ytimg.com/vi/${String(item.id || "").trim()}/hqdefault.jpg`,
          ).trim(),
        }));
    }

    return (Array.isArray(payload.releases) ? payload.releases : [])
      .filter((item) => String(item.group || "").trim() === group)
      .map((item) => ({
        kind: "video",
        id: String(item.id || "").trim(),
        title: `${String(item.artist || "NextGen Sessions").trim()} — ${String(item.title || "Release").trim()}`,
        label: String(item.artist || "NextGen Sessions").trim(),
        name: String(item.title || "Release").trim(),
        poster: `https://i.ytimg.com/vi/${String(item.id || "").trim()}/hqdefault.jpg`,
      }));
  }

  function buildOption(item, actionLabel, active) {
    const option = document.createElement("button");
    option.className = `mix-option${active ? " is-active" : ""}`;
    option.type = "button";
    option.dataset.mixOption = "";
    option.dataset.kind = item.kind;
    option.dataset.id = item.id;
    option.dataset.title = item.title;
    option.dataset.poster = item.poster;
    option.setAttribute("aria-pressed", String(active));

    const image = document.createElement("img");
    image.src = item.poster;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";

    const copy = document.createElement("span");
    copy.className = "mix-option-copy";
    const label = document.createElement("span");
    label.className = "mix-option-number";
    label.textContent = item.label;
    const name = document.createElement("strong");
    name.textContent = item.name;
    const status = document.createElement("span");
    status.className = "mix-option-status";
    status.dataset.optionStatus = "";
    status.textContent = active ? "Selected" : actionLabel;
    copy.append(label, name, status);
    option.append(image, copy);
    return option;
  }

  document.querySelectorAll("[data-mix-player]").forEach((player) => {
    // Listening pages are player-first: the collection artwork and description
    // support the experience, but must never push playback below the fold.
    const section = player.closest(".mix-player-section");
    const page = section?.closest(".mix-detail-page");
    if (section && page && page.firstElementChild !== section) {
      page.prepend(section);
    }

    const originalPoster = player.querySelector("[data-mix-play] img");
    const state = {
      kind: String(player.dataset.kind || "").trim(),
      id: String(player.dataset.id || "").trim(),
      title: String(player.dataset.title || "NextGen Sessions mix").trim(),
      poster: String(
        player.dataset.poster || originalPoster?.getAttribute("src") || "",
      ).trim(),
    };

    if (!isValid(state.kind, state.id) || !state.poster) return;

    let experience = player.closest(
      "[data-mix-collection], .mix-player-experience",
    );
    if (!experience) {
      experience = document.createElement("div");
      experience.className = "mix-player-experience";
      experience.dataset.mixCollection = "";
      experience.dataset.source = String(player.dataset.source || "").trim();
      experience.dataset.sourceType = String(
        player.dataset.sourceType || "",
      ).trim();
      experience.dataset.group = String(player.dataset.group || "").trim();
      experience.dataset.actionLabel = String(
        player.dataset.actionLabel || "Play mix",
      ).trim();
      experience.dataset.singular = String(
        player.dataset.singular || "mix",
      ).trim();
      experience.dataset.plural = String(
        player.dataset.plural || "mixes",
      ).trim();

      const selector = document.createElement("div");
      selector.className = "mix-selector";
      const heading = document.createElement("div");
      heading.className = "mix-selector-heading";
      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = "All instalments";
      const selectorTitle = document.createElement("h3");
      selectorTitle.textContent = "Choose your mix";
      heading.append(eyebrow, selectorTitle);

      const grid = document.createElement("div");
      grid.className = "mix-option-grid";
      grid.dataset.mixOptions = "";
      grid.append(
        buildOption(
          { ...state, label: "Full-length mix", name: state.title },
          "Play mix",
          true,
        ),
      );
      selector.append(heading, grid);
      player.before(experience);
      experience.append(player, selector);
    }

    const optionsRoot =
      experience.querySelector("[data-mix-options]") || document;
    const actionLabel = String(
      experience.dataset.actionLabel || "Play mix",
    ).trim();
    let hasInteracted = false;

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
      hasInteracted = true;
      syncToolbar("Now playing");
      optionsRoot.querySelectorAll("[data-mix-option]").forEach((item) => {
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
      optionsRoot.querySelectorAll("[data-mix-option]").forEach((item) => {
        const active = item === option;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
        const status = item.querySelector("[data-option-status]");
        if (status) status.textContent = active ? "Selected" : actionLabel;
      });
      buildPoster(player, state.title, state.poster);
      loadCurrent();
    }

    player.addEventListener("click", (event) => {
      if (event.target.closest("[data-mix-play]")) loadCurrent();
    });

    optionsRoot.addEventListener("click", (event) => {
      const option = event.target.closest("[data-mix-option]");
      if (option && optionsRoot.contains(option)) selectOption(option);
    });

    syncToolbar("Ready to play");

    async function hydrateCollection() {
      const source = String(experience?.dataset.source || "").trim();
      const sourceType = String(experience?.dataset.sourceType || "").trim();
      const group = String(experience?.dataset.group || "").trim();
      if (
        !experience ||
        !source ||
        !sourceType ||
        !optionsRoot.matches("[data-mix-options]")
      )
        return;

      try {
        const response = await fetch(source, { cache: "no-cache" });
        if (!response.ok) return;
        const items = collectionItems(
          await response.json(),
          sourceType,
          group,
        ).filter(
          (item) =>
            isValid(item.kind, item.id) &&
            item.title &&
            item.label &&
            item.name &&
            item.poster,
        );
        if (!items.length) return;

        const selectedId = hasInteracted ? state.id : items[0].id;
        const selected =
          items.find((item) => item.id === selectedId) || items[0];
        optionsRoot.replaceChildren(
          ...items.map((item) =>
            buildOption(item, actionLabel, item.id === selected.id),
          ),
        );

        const count = document.querySelector("[data-collection-count]");
        if (count) {
          const singular = String(experience.dataset.singular || "item").trim();
          const plural = String(
            experience.dataset.plural || `${singular}s`,
          ).trim();
          count.textContent = `${items.length} ${items.length === 1 ? singular : plural}`;
        }

        if (!hasInteracted) {
          Object.assign(state, selected);
          buildPoster(player, state.title, state.poster);
          syncToolbar("Ready to play");
        }
      } catch (_error) {
        // Keep the server-rendered choices usable if catalogue loading fails.
      }
    }

    hydrateCollection();
  });
})();
