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
  const rosterGrid = document.getElementById("artistRosterGrid");
  const artistSearch = document.getElementById("artistSearch");
  const rosterCount = document.getElementById("rosterCount");
  const releaseGrid = document.getElementById("releaseGrid");
  const latestPlayer = document.getElementById("latestVideoFrame");
  const latestVideoPlay = document.getElementById("latestVideoPlay");
  const latestVideoThumbnail = document.getElementById("latestVideoThumbnail");
  let activeLatest = null;
  let latestPlayerLoaded = false;

  // HOMEPAGE:AUTO-FALLBACK:START
  const FALLBACK_LATEST = {"id":"-zp1PLcxn5w","contentType":"long-mix","title":"Desi Junction","published":"2026-10-16T17:00:14Z","url":"/mixes/","durationSeconds":2230};

  const FALLBACK_RELEASES = [
    {"id":"fZGV7LnHAFI","contentType":"full-release","title":"Jassi Noor – Gall Sun Ve","published":"2026-10-14T17:00:02Z","url":"/releases/jassi-noor-gall-sun-ve/"},
    {"id":"wpA3hPMAq80","contentType":"full-release","title":"Arif Sial – Chitta Suit Pa Ke","published":"2026-10-12T17:00:26Z","url":"/releases/arif-sial-chitta-suit-pa-ke/"},
    {"id":"ysGQgRrHRDw","contentType":"full-release","title":"Alia Bleu – On My Side","published":"2026-10-07T17:00:27Z","url":"/releases/alia-bleu-on-my-side/"},
    {"id":"xmbpD4Vxxgs","contentType":"full-release","title":"Alia Bleu – Bleu Armour","published":"2026-10-05T17:00:14Z","url":"/releases/alia-bleu-bleu-armour/"},
    {"id":"qrkiRZlqIhE","contentType":"full-release","title":"Rudii Marka – Wi Dweet Proper","published":"2026-09-30T17:00:24Z","url":"/releases/rudii-marka-wi-dweet-proper/"},
    {"id":"IKI2BZV3v4k","contentType":"full-release","title":"Rudii Marka – Cyaan Stop Mi","published":"2026-09-28T17:00:45Z","url":"/releases/rudii-marka-cyaan-stop-mi/"}
  ];
  // HOMEPAGE:AUTO-FALLBACK:END

  function validVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : FALLBACK_LATEST.id;
  }

  function latestTitle(release) {
    return String(release?.title || "Latest NextGen Sessions release").trim();
  }

  function latestPresentation(contentType) {
    switch (String(contentType || "").trim()) {
      case "long-mix":
        return {
          kind: "mix",
          label: "Latest mix",
          heroCta: "Explore latest mix",
          playCta: "Play full mix",
          status: "Long-form session · Now on YouTube",
          kicker: "Long-form session",
          fallback: "Latest NextGen Sessions mix"
        };
      case "album":
        return {
          kind: "album",
          label: "Latest album",
          heroCta: "Explore latest album",
          playCta: "Play full album",
          status: "Full project · Now on YouTube",
          kicker: "Full project",
          fallback: "Latest NextGen Sessions album"
        };
      default:
        return {
          kind: "release",
          label: "Latest release",
          heroCta: "Explore latest release",
          playCta: "Play latest release",
          status: "Fresh release · Now on YouTube",
          kicker: "Official release",
          fallback: "Latest NextGen Sessions release"
        };
    }
  }

  function updateLatestPlayer(release) {
    const next = {
      id: validVideoId(release?.id),
      title: latestTitle(release),
      contentType: String(release?.contentType || "full-release")
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
      const useYoutubeArtwork = next.contentType === "long-mix" || next.contentType === "album";
      latestVideoThumbnail.dataset.fallbackStage = useYoutubeArtwork ? "maxres" : "proxy";
      latestVideoThumbnail.src = useYoutubeArtwork
        ? `https://i.ytimg.com/vi/${next.id}/maxresdefault.jpg`
        : `/api/release-image?id=${encodeURIComponent(next.id)}`;
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
    const id = validVideoId(activeLatest?.id || FALLBACK_LATEST.id);
    const stage = latestVideoThumbnail.dataset.fallbackStage || "proxy";
    if (stage === "proxy") {
      latestVideoThumbnail.dataset.fallbackStage = "maxres";
      latestVideoThumbnail.src = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
      return;
    }
    if (stage === "maxres") {
      latestVideoThumbnail.dataset.fallbackStage = "hq";
      latestVideoThumbnail.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      return;
    }
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

  function artistDestination(artist) {
    return {
      href: `/artists/${artist.slug}/`,
      attributes: "",
      label: `View ${artist.name} artist profile`
    };
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
      <a class="artist-roster-card${hasImage ? " has-image" : ""}" href="${escapeHtml(destination.href)}"${destination.attributes} aria-label="${escapeHtml(destination.label)}">
        ${portrait}
        <div class="artist-roster-copy">
          <span class="artist-genre">${escapeHtml(artist.genre)}</span>
          <h3>${escapeHtml(artist.name)}</h3>
          <p>${escapeHtml(artist.summary)}</p>
        </div>
      </a>`;
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

  // Only exact release pages are suitable for song CTAs; /releases/ is an archive.
  function dedicatedReleasePath(value) {
    const url = String(value || "").trim();
    return /^\/releases\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url) ? url : "";
  }

  function latestDestination(item) {
    if (item?.contentType === "long-mix") return "/mixes/";
    if (item?.contentType === "album") return "/mixes/full-albums/";
    return dedicatedReleasePath(item?.url)
      || (safeVideoId(item?.id) ? `https://www.youtube.com/watch?v=${item.id}` : "/releases/");
  }

  function releaseCard(release) {
    const id = escapeHtml(release.id);
    const title = escapeHtml(release.title || "NextGen Sessions release");
    const date = formatDate(release.published);
    const destination = latestDestination(release);
    const onYoutube = destination.startsWith("https://www.youtube.com/watch?v=");
    return `
      <a class="release-card" href="${escapeHtml(destination)}"${onYoutube ? ' target="_blank" rel="noopener noreferrer"' : ""}>
        <img loading="lazy" decoding="async" src="/api/release-image?id=${encodeURIComponent(release.id)}&size=card" alt="${title} release thumbnail">
        <div class="release-meta">
          <span class="tag">Official release</span>
          <h3>${title}</h3>
          <p>${onYoutube ? "Watch on YouTube" : "View release"}</p>
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
    const latestTypeLabel = document.getElementById("latestTypeLabel");
    const latestKicker = document.getElementById("latestKicker");
    const latestPlayCopy = document.getElementById("latestPlayCopy");
    const latestShell = document.querySelector(".media-shell");
    const presentation = latestPresentation(latest.contentType);

    updateLatestPlayer(latest);
    if (latestTitle) latestTitle.textContent = latest.title || presentation.fallback;
    if (latestDate) {
      const date = formatDate(latest.published);
      latestDate.textContent = date ? `Published ${date}` : presentation.fallback;
    }
    if (latestTypeLabel) latestTypeLabel.textContent = presentation.label;
    if (latestKicker) latestKicker.textContent = presentation.kicker;
    if (latestPlayCopy) latestPlayCopy.textContent = presentation.playCta;
    if (latestShell) {
      latestShell.dataset.contentKind = presentation.kind;
      latestShell.setAttribute("aria-label", `${presentation.label}: ${latest.title || presentation.fallback}`);
    }

    const watchUrl = `https://www.youtube.com/watch?v=${latest.id}`;
    const releaseUrl = latestDestination(latest);
    if (latestLink) latestLink.href = watchUrl;
    if (heroLink) {
      heroLink.href = releaseUrl;
      heroLink.textContent = presentation.heroCta;
      if (releaseUrl.startsWith("https://www.youtube.com/watch?v=")) {
        heroLink.textContent = "Watch latest release on YouTube";
        heroLink.setAttribute("target", "_blank");
        heroLink.setAttribute("rel", "noopener noreferrer");
      } else {
        heroLink.removeAttribute("target");
        heroLink.removeAttribute("rel");
      }
    }

    if (latestStatus) latestStatus.textContent = presentation.status;

    const releaseOnly = releases.filter(item => item?.contentType === "full-release");
    if (releaseGrid) releaseGrid.innerHTML = releaseOnly.slice(0, 6).map(releaseCard).join("");
  }

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
    const contentType = String(release?.contentType || "").trim();
    const releaseUrl = String(release?.url || "").trim();
    const searchableTitle = `${String(release?.title || "")} ${String(release?.rawTitle || "")}`;
    // Public channel feeds include Shorts. Fail closed unless the full-length duration is verified.
    // Curated releases can include genuine sub-three-minute singles and remain eligible.
    const fromChannelFeed = ["public-youtube-channel-feed", "youtube-channel-feed"]
      .includes(String(release?.discoverySource || "").trim());
    const durationSeconds = Number(release?.durationSeconds || 0);
    const minimumFeedSeconds = contentType === "long-mix" ? 600 : 181;
    const validFeedDuration = !fromChannelFeed || (Number.isFinite(durationSeconds) && durationSeconds >= minimumFeedSeconds);
    const validDestination = contentType === "full-release"
      ? /^\/releases\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?$/.test(releaseUrl)
      : (contentType === "long-mix"
        ? /^\/mixes(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?\/$/.test(releaseUrl)
        : (contentType === "album" && releaseUrl === "/mixes/full-albums/"));
    if (
      !id ||
      !["full-release", "long-mix", "album"].includes(contentType) ||
      !validDestination ||
      !validFeedDuration ||
      /\b(?:shorts?|teaser|trailer|promo|preview|incoming|announcement|announcing|new\s+drop|coming soon|out tomorrow|out tonight|out now)\b|#shorts/i.test(searchableTitle)
    ) return null;
    const artist = String(release?.artist || "").trim();
    const releaseTitle = String(release?.title || "").trim();
    const hasArtistPrefix = artist && releaseTitle.toLowerCase().startsWith(artist.toLowerCase());
    const title = artist && releaseTitle && !hasArtistPrefix
      ? `${artist} – ${releaseTitle}`
      : (releaseTitle || "Latest NextGen Sessions release");
    return {
      id,
      contentType,
      title,
      published: String(release?.published || release?.updated || "").trim(),
      url: releaseUrl
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
    return items
      .map(normaliseHomepageRelease)
      .filter(item => item?.contentType === "full-release");
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

  function buildHomepagePayload(apiPayload, feedPayload, cataloguePayload) {
    const apiReleases = payloadReleases(apiPayload);
    // The static verified catalogue remains available even when the live API is down.
    const catalogueReleases = payloadReleases(cataloguePayload);
    // Validate as an untrusted channel-feed item even when the feed omits its source label.
    const feedLatest = normaliseHomepageRelease(feedPayload?.latest
      ? { ...feedPayload.latest, discoverySource: "public-youtube-channel-feed" }
      : null);
    const fallbackReleases = FALLBACK_RELEASES
      .map(normaliseHomepageRelease)
      .filter(Boolean);

    // Resolve the exact song page by YouTube ID, never by a guessed title/slug.
    // Unverified feed URLs such as /releases/ cannot override a verified page.
    const verifiedPaths = new Map();
    for (const item of [...fallbackReleases, ...apiReleases, ...catalogueReleases]) {
      const path = dedicatedReleasePath(item.url);
      if (path) verifiedPaths.set(item.id, path);
    }
    const resolveRelease = item => item?.contentType === "full-release" && verifiedPaths.has(item.id)
      ? { ...item, url: verifiedPaths.get(item.id) }
      : item;

    const releases = uniqueHomepageReleases(mergeHomepageReleases([
      ...catalogueReleases,
      ...apiReleases,
      ...(feedLatest?.contentType === "full-release" ? [feedLatest] : []),
      ...fallbackReleases
    ].map(resolveRelease)));

    const apiLatest = normaliseHomepageRelease(apiPayload?.latest);
    const fallbackLatest = normaliseHomepageRelease(FALLBACK_LATEST);
    const latest = [apiLatest, feedLatest, fallbackLatest, releases[0]]
      .filter(Boolean)
      .map(resolveRelease)
      .sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a))[0] || FALLBACK_LATEST;

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

  if (latestPlayer || releaseGrid) {
    Promise.allSettled([
      fetchJson("/api/latest?v=r6"),
      fetchJson("/latest-feed.json?v=3"),
      fetchJson("/releases.json?v=latest-links1")
    ]).then(results => {
      const apiPayload = results[0]?.status === "fulfilled" ? results[0].value : {};
      const feedPayload = results[1]?.status === "fulfilled" ? results[1].value : {};
      const cataloguePayload = results[2]?.status === "fulfilled" ? results[2].value : {};
      updateLatest(buildHomepagePayload(apiPayload, feedPayload, cataloguePayload));
    }).catch(() => updateLatest({
      latest: FALLBACK_LATEST,
      releases: FALLBACK_RELEASES
    }));
  }
})();