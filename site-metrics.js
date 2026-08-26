(function () {
  "use strict";

  if (window.__NGS_SITE_METRICS__) return;
  window.__NGS_SITE_METRICS__ = true;

  const endpoint = "/api/events";
  const tracked = new Set();
  let searchTimer = 0;

  const SOCIAL = Object.freeze({
    youtube: "https://www.youtube.com/@NextGenSessions?sub_confirmation=1",
    tiktok: "https://www.tiktok.com/@nextgensessions",
    instagram: "https://www.instagram.com/next.gensessions/"
  });

  const SESSION_DEDUPE = new Set([
    "release_play",
    "release_click",
    "related_release_click",
    "new_this_week_click",
    "trending_release_click",
    "artist_click",
    "related_artist_click",
    "genre_click",
    "mix_play",
    "site_search",
    "search_result_click",
    "youtube_click",
    "youtube_subscribe_click",
    "social_follow_click",
    "funnel_listen"
  ]);

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
    if (href === "/search/") return path === "/search" || path.startsWith("/search/");
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
      { label: "Search", href: "/search/" },
      { label: "Submit", href: "/submit.html" },
      { label: "Privacy", href: "/privacy/" },
      { label: "YouTube", href: "https://www.youtube.com/@NextGenSessions", external: true },
      { label: "TikTok", href: SOCIAL.tiktok, external: true },
      { label: "Instagram", href: SOCIAL.instagram, external: true },
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

  function ensureConversionStyles() {
    if (document.querySelector('link[href^="/conversion-funnel.css"]')) return;
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/conversion-funnel.css?v=20260825-funnel1";
    stylesheet.dataset.ngsConversion = "true";
    document.head.append(stylesheet);
  }

  function conversionContext() {
    const path = currentPath();
    if (path === "/") {
      return {
        key: "home",
        title: "Play it. Follow it. Stay with NextGen.",
        copy: "Hear the latest release without leaving the site, then subscribe on YouTube and follow NextGen Sessions for new artists, full tracks and launch clips.",
        listenLabel: "Latest release",
        listenText: "Play it here",
        listenHref: "#latestVideoFrame",
        home: true
      };
    }
    if (/^\/releases\/[a-z0-9-]+$/i.test(path)) {
      return {
        key: "release",
        title: "Like this release? Stay with NextGen.",
        copy: "Play the full release here, then subscribe and follow NextGen Sessions so the next track does not disappear into your feed.",
        listenLabel: "This release",
        listenText: "Play it here",
        listenHref: "#watch-title"
      };
    }
    if (/^\/artists\/[a-z0-9-]+$/i.test(path)) {
      return {
        key: "artist",
        title: "Hear more from this artist. Stay with NextGen.",
        copy: "Go deeper into the artist catalogue, then follow NextGen Sessions across YouTube, TikTok and Instagram for the next release.",
        listenLabel: "Artist catalogue",
        listenText: "Hear the releases",
        listenHref: "#artist-discography"
      };
    }
    if (/^\/mixes\/[a-z0-9-]+$/i.test(path)) {
      return {
        key: "mix",
        title: "Keep the session running.",
        copy: "Play the mix on NextGen Sessions, then subscribe and follow for new long-form sessions, artists and releases.",
        listenLabel: "This mix",
        listenText: "Play the mix",
        listenHref: "#listen"
      };
    }
    return {
      key: "catalogue",
      title: "Find your sound. Stay with NextGen.",
      copy: "Move from discovery into the music, then subscribe and follow NextGen Sessions for new original releases across the roster.",
      listenLabel: "Music catalogue",
      listenText: "Browse releases",
      listenHref: "/releases/"
    };
  }

  function conversionAction({ platform, text, href, primary = false, external = false, action }) {
    const anchor = document.createElement("a");
    anchor.className = `ngs-conversion-action${primary ? " is-primary" : ""}`;
    anchor.href = href;
    anchor.dataset.ngsFunnel = action;
    if (external) {
      anchor.target = "_blank";
      anchor.rel = "noopener";
    }

    const platformLabel = document.createElement("span");
    platformLabel.className = "ngs-conversion-platform";
    platformLabel.textContent = platform;

    const strong = document.createElement("strong");
    strong.textContent = text;

    const arrow = document.createElement("span");
    arrow.className = "ngs-conversion-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    anchor.append(platformLabel, strong, arrow);
    return anchor;
  }

  function installConversionFunnel() {
    if (document.querySelector("[data-ngs-conversion]")) return;
    const path = currentPath();
    if (path === "/privacy" || path === "/submit" || path === "/submit.html" || path === "/404.html" || path.startsWith("/ops/")) return;

    const footer = document.querySelector("footer.site-footer");
    const main = document.querySelector("main");
    if (!footer || !main) return;

    ensureConversionStyles();
    const context = conversionContext();
    const section = document.createElement("section");
    section.className = `ngs-conversion${context.home ? " is-home" : ""}`;
    section.dataset.ngsConversion = context.key;
    section.setAttribute("aria-labelledby", `ngs-conversion-title-${context.key}`);

    const shell = document.createElement("div");
    shell.className = "ngs-conversion-shell";

    const head = document.createElement("div");
    head.className = "ngs-conversion-head";
    head.innerHTML = `<p class="eyebrow">Stay with NextGen</p><h2 class="ngs-conversion-title" id="ngs-conversion-title-${context.key}"></h2><p class="ngs-conversion-copy"></p>`;
    head.querySelector("h2").textContent = context.title;
    head.querySelector(".ngs-conversion-copy").textContent = context.copy;

    const actions = document.createElement("div");
    actions.className = "ngs-conversion-actions";
    actions.append(
      conversionAction({ platform: context.listenLabel, text: context.listenText, href: context.listenHref, primary: true, action: "listen" }),
      conversionAction({ platform: "YouTube", text: "Subscribe", href: SOCIAL.youtube, external: true, action: "youtube-subscribe" }),
      conversionAction({ platform: "TikTok", text: "Follow", href: SOCIAL.tiktok, external: true, action: "tiktok-follow" }),
      conversionAction({ platform: "Instagram", text: "Follow", href: SOCIAL.instagram, external: true, action: "instagram-follow" })
    );

    const proof = document.createElement("p");
    proof.className = "ngs-conversion-proof";
    ["Original releases", "Full tracks & mixes", "New artists across multiple genres"].forEach(text => {
      const item = document.createElement("span");
      item.textContent = text;
      proof.append(item);
    });

    shell.append(head, actions, proof);
    section.append(shell);

    if (context.home) {
      const releases = document.getElementById("releases");
      if (releases) releases.after(section);
      else footer.before(section);
    } else {
      footer.before(section);
    }
  }

  installConversionFunnel();

  function sessionKey(event, label) {
    return `ngs-metric:${event}:${String(label || "").slice(0, 64)}`;
  }

  function alreadySentInSession(event, label) {
    if (!SESSION_DEDUPE.has(event)) return false;
    const key = sessionKey(event, label);
    try {
      if (sessionStorage.getItem(key) === "1") return true;
      sessionStorage.setItem(key, "1");
      return false;
    } catch (_) {
      if (tracked.has(key)) return true;
      tracked.add(key);
      return false;
    }
  }

  function send(event, label) {
    const safeLabel = String(label || "").slice(0, 64);
    if (alreadySentInSession(event, safeLabel)) return;

    const payload = JSON.stringify({
      event,
      path: location.pathname,
      label: safeLabel
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

  window.NGS_METRICS = Object.freeze({ track: send });

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
      const host = url.hostname.toLowerCase();
      const isYouTube = host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com");
      if (!isYouTube) return "";
      const videoId = url.searchParams.get("v");
      if (/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) return videoId;
      const embed = url.pathname.match(/\/embed\/([A-Za-z0-9_-]{11})/);
      return embed ? embed[1] : "channel";
    } catch (_) {
      return "";
    }
  }

  function internalSlug(href, section) {
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return "";
      return url.pathname.match(new RegExp(`^/${section}/([a-z0-9-]+)/?$`, "i"))?.[1]?.toLowerCase() || "";
    } catch (_) {
      return "";
    }
  }

  function releaseLabel(link) {
    return internalSlug(link.href, "releases") || youtubeLabel(link.href);
  }

  function artistLabel(link) {
    const internal = internalSlug(link.href, "artists");
    if (internal) return internal;
    const heading = link.querySelector("h3, strong");
    return safeSlug(heading?.textContent || link.getAttribute("aria-label"), "artist");
  }

  function genreLabel(link) {
    return internalSlug(link.href, "genres") || "genres";
  }

  function entityLabel(link) {
    return internalSlug(link.href, "releases")
      || internalSlug(link.href, "artists")
      || internalSlug(link.href, "genres")
      || internalSlug(link.href, "mixes")
      || youtubeLabel(link.href)
      || "result";
  }

  function mixLabel(element) {
    const player = element.closest("[data-mix-player]");
    const id = String(player?.dataset.id || "").trim();
    return /^[A-Za-z0-9_-]{10,64}$/.test(id) ? id : safeSlug(currentPath().split("/").pop(), "mix");
  }

  send("page_view", "");

  if (new URLSearchParams(location.search).get("success") === "1") {
    once("submission-complete", "submission_complete", "form");
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const releasePlay = target.closest("#latestVideoPlay, [data-archive-play], [data-release-play]");
    if (releasePlay) {
      const id = releasePlay.closest("[data-video-id]")?.dataset.videoId || "release";
      send("release_play", id);
      return;
    }

    const mixPlay = target.closest("[data-mix-play]");
    if (mixPlay) {
      send("mix_play", mixLabel(mixPlay));
      return;
    }

    const filter = target.closest(".release-filter");
    if (filter) {
      send("archive_filter", safeSlug(filter.dataset.filter, "all"));
      return;
    }

    const link = target.closest("a[href]");
    if (!link) return;

    const funnelAction = link.dataset.ngsFunnel;
    if (funnelAction) {
      const context = document.querySelector("[data-ngs-conversion]")?.dataset.ngsConversion || "catalogue";
      if (funnelAction === "listen") send("funnel_listen", safeSlug(context, "catalogue"));
      else if (funnelAction === "youtube-subscribe") send("youtube_subscribe_click", "youtube");
      else if (funnelAction === "tiktok-follow") send("social_follow_click", "tiktok");
      else if (funnelAction === "instagram-follow") send("social_follow_click", "instagram");
      return;
    }

    if (link.closest("[data-trending-feed]")) {
      const label = releaseLabel(link);
      if (label && label !== "channel") send("trending_release_click", label);
      return;
    }

    if (link.closest("[data-weekly-feed]")) {
      send("new_this_week_click", entityLabel(link));
      return;
    }

    if (link.matches("[data-search-result], .search-result-card")) {
      send("search_result_click", entityLabel(link));
      return;
    }

    if (link.closest(".release-related") && internalSlug(link.href, "releases")) {
      send("related_release_click", releaseLabel(link));
      return;
    }

    if (link.closest("[data-related-artists]") && internalSlug(link.href, "artists")) {
      send("related_artist_click", artistLabel(link));
      return;
    }

    if (link.matches(".release-card, .archive-release-detail-link, .genre-release-card, .release-chronology-card")) {
      send("release_click", releaseLabel(link));
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
    const isSite = input.id === "siteSearchInput";
    if (!isArchive && !isArtist && !isSite) return;

    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      if (isSite) {
        const first = document.querySelector("#siteSearchResults [data-search-result]");
        send("site_search", first ? entityLabel(first) : "no-match");
        return;
      }
      once(
        isArchive ? "archive-search" : "artist-search",
        isArchive ? "archive_search" : "artist_search",
        "started"
      );
    }, 700);
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