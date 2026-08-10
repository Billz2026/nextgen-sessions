(function () {
  "use strict";

  const endpoint = "/api/events";
  const tracked = new Set();
  let searchTimer = 0;

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

  const footerLinks = document.querySelector(".footer-links");
  if (footerLinks && !footerLinks.querySelector('a[href="/privacy/"]')) {
    const privacyLink = document.createElement("a");
    privacyLink.href = "/privacy/";
    privacyLink.textContent = "Privacy";
    footerLinks.append(privacyLink);
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

    if (link.matches(".release-card, .archive-release-detail-link")) {
      const id = link.closest("[data-video-id]")?.dataset.videoId || youtubeLabel(link.href);
      send("release_click", id);
      return;
    }

    if (link.matches(".featured-artist-card, .artist-roster-card, .related-card")) {
      send("artist_click", artistLabel(link));
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
      ? event.target.closest('form[action*="formsubmit"]')
      : null;
    if (form) once("submission-start", "submission_start", "form");
  });

  document.addEventListener("submit", event => {
    const form = event.target;
    if (form instanceof HTMLFormElement && /formsubmit/i.test(form.action)) {
      send("submission_submit", "form");
    }
  });
})();
