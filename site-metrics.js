(function () {
  "use strict";

  const endpoint = "/api/events";
  const tracked = new Set();
  let searchTimer = 0;

  function ensureMobileNavigation() {
    const version = "20260824-qa2";
    if (!document.querySelector('link[href^="/mobile-nav.css"]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = `/mobile-nav.css?v=${version}`;
      stylesheet.dataset.ngsMobileNav = "true";
      document.head.append(stylesheet);
    }
    if (!document.querySelector('script[src^="/mobile-nav.js"]')) {
      const script = document.createElement("script");
      script.src = `/mobile-nav.js?v=${version}`;
      script.async = false;
      script.dataset.ngsMobileNav = "true";
      document.head.append(script);
    }
  }

  ensureMobileNavigation();

  function safeSlug(value, fallback) {
    const slug = String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    return slug || fallback;
  }

  function currentPath() {
    return location.pathname.replace(/\/+$/, "") || "/";
  }

  function isCurrentInternal(href) {
    const path = currentPath();
    if (href === "/artists/") return path === "/artists" || path.startsWith("/artists/");
    if (href === "/releases/") return path === "/releases" || path.startsWith("/releases/");
    if (href === "/genres/") return path === "/genres" || path.startsWith("/genres/");
    if (href === "/mixes/") return path === "/mixes" || path.startsWith("/mixes/");
    if (href === "/submit.html") return path === "/submit" || path === "/submit.html";
    if (href === "/privacy/") return path === "/privacy" || path.startsWith("/privacy/");
    return false;
  }

  function standardizeFooter() {
    const footerLinks = document.querySelector(".footer-links");
    if (!footerLinks) return;

    const links = [
      { label: "Artists", href: "/artists/" },
      { label: "Releases", href: "/releases/" },
      { label: "Genres", href: "/genres/" },
      { label: "Mixes", href: "/mixes/" },
      { label: "Submit", href: "/submit.html" },
      { label: "Privacy", href: "/privacy/" },
      { label: "YouTube", href: "https://www.youtube.com/@NextGenSessions", external: true },
      { label: "TikTok", href: "https://www.tiktok.com/@nextgensessions", external: true },
      { label: "Instagram", href: "https://www.instagram.com/next.gensessions/", external: true },
      { label: "Contact", href: "mailto:contact@nextgensessions.com" }
    ];

    footerLinks.replaceChildren(...links.map(item => {
      const anchor = document.createElement("a");
      anchor.textContent = item.label;
      anchor.href = item.href;
      if (item.external) {
        anchor.target = "_blank";
        anchor.rel = "noopener";
      }
      if (!item.external && isCurrentInternal(item.href)) {
        anchor.setAttribute("aria-current", "page");
      }
      return anchor;
    }));
  }

  standardizeFooter();

  function send(event, label) {
    const payload = JSON.stringify({
      event,
      path: location.pathname,
      label: String(label || "").slice(0, 64)
    });
    const body = new Blob([payload], { type: "application/json" });

    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
    fetch(endpoint, {
      method: "POST",
      body: payload,
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true
    }).catch(() => {});
  }

  function once(key, event, label) {
    if (tracked.has(key)) return;
    tracked.add(key);
    send(event, label);
  }

  const primaryNav = document.querySelector(".nav");
  if (primaryNav && !primaryNav.querySelector('a[href="/genres/"]')) {
    const genresLink = document.createElement("a");
    genresLink.href = "/genres/";
    genresLink.textContent = "Genres";
    const releasesLink = primaryNav.querySelector('a[href="/releases/"]');
    if (releasesLink) releasesLink.after(genresLink);
    else primaryNav.prepend(genresLink);
  }

  function youtubeLabel(href) {
    try {
      const url = new URL(href, location.href);
      const videoId = url.searchParams.get("v");
      if (/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) return videoId;
      const embed = url.pathname.match(/\/embed\/([A-Za-z0-9_-]{11})/);
      return embed ? embed[1] : "channel";
    } catch (_) {
      return "channel";
    }
  }

  function artistLabel(link) {
    const internal = link.getAttribute("href")?.match(/^\/artists\/([a-z0-9-]+)\/?$/i);
    if (internal) return internal[1].toLowerCase();
    const heading = link.querySelector("h3, strong");
    return safeSlug(heading?.textContent || link.getAttribute("aria-label"), "artist");
  }

  function genreLabel(link) {
    const internal = link.getAttribute("href")?.match(/^\/genres\/([a-z0-9-]+)\/?$/i);
    return internal ? internal[1].toLowerCase() : "genres";
  }

  send("page_view", "");

  if (new URLSearchParams(location.search).get("success") === "1") {
    once("submission-complete", "submission_complete", "form");
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const player = target.closest("#latestVideoPlay");
    if (player) {
      const id = player.closest("[data-video-id]")?.dataset.videoId || "latest";
      send("release_play", id);
      return;
    }

    const archivePlayer = target.closest("[data-archive-play]");
    if (archivePlayer) {
      const id = archivePlayer.closest("[data-video-id]")?.dataset.videoId || "archive";
      send("release_play", id);
      return;
    }

    const filter = target.closest(".release-filter");
    if (filter) {
      send("archive_filter", safeSlug(filter.dataset.filter, "all"));
      return;
    }

    const link = target.closest("a[href]");
    if (!link) return;

    if (link.matches(".release-card, .archive-release-detail-link, .genre-release-card")) {
      const id = link.closest("[data-video-id]")?.dataset.videoId || youtubeLabel(link.href);
      send("release_click", id);
      return;
    }

    if (link.matches(".featured-artist-card, .artist-roster-card, .related-card, .genre-artist-card")) {
      send("artist_click", artistLabel(link));
      return;
    }

    if (link.matches(".genre-hub-card, .genre-related-card") || /^\/genres\//.test(link.getAttribute("href") || "")) {
      send("genre_click", genreLabel(link));
      return;
    }

    if (/youtube(?:-nocookie)?\.com|youtu\.be/i.test(link.hostname || "")) {
      send("youtube_click", youtubeLabel(link.href));
    }
  }, { passive: true });

  document.addEventListener("input", event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "search") return;
    if (!input.value.trim()) return;

    const isArchive = input.id === "releaseSearch";
    const isArtist = input.id === "artistSearch";
    if (!isArchive && !isArtist) return;

    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      once(
        isArchive ? "archive-search" : "artist-search",
        isArchive ? "archive_search" : "artist_search",
        "started"
      );
    }, 600);
  }, { passive: true });

  document.addEventListener("focusin", event => {
    const form = event.target instanceof Element
      ? event.target.closest("#musicSubmissionForm")
      : null;
    if (form) once("submission-start", "submission_start", "form");
  });

  document.addEventListener("submit", event => {
    const form = event.target;
    if (form instanceof HTMLFormElement && form.id === "musicSubmissionForm") {
      send("submission_submit", "form");
    }
  });

  document.addEventListener("ngs:submission-complete", () => {
    send("submission_complete", "form");
  });
})();
