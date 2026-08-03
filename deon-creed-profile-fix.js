(function () {
  "use strict";

  const root = document.getElementById("artistProfile");
  if (!root || root.dataset.artist !== "deon-creed") return;

  const PORTRAIT_URL = "/assets/artists/deon-creed-portrait-v2.webp?v=20260803-2";
  const FALLBACK_RELEASE = {
    id: "vuW6OZPoApg",
    artist: "Deon Creed",
    title: "Soul of the Southside",
    group: "Hip-Hop / G-Funk",
    published: "2026-05-26T07:52:56Z"
  };

  function normalise(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
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

  function fixPortrait() {
    const image = root.querySelector(".profile-image");
    if (!image) return;
    image.hidden = false;
    image.removeAttribute("srcset");
    image.dataset.fallback = "";
    image.src = PORTRAIT_URL;
    image.style.objectPosition = "50% 34%";
    image.style.transform = "scale(1)";
    image.closest(".profile-image-shell")?.classList.remove("profile-image-missing");
  }

  function prepareRelease(item) {
    const id = safeVideoId(item?.id || item?.videoId);
    const artist = String(item?.artist || "").trim();
    const rawTitle = String(item?.rawTitle || item?.title || "").trim();
    const isDeon = normalise(artist) === "deon creed" || normalise(rawTitle).includes("deon creed");
    if (!id || !isDeon) return null;

    let title = String(item?.title || "").trim();
    if (!title || normalise(title).includes("deon creed")) {
      const match = rawTitle.match(/Deon Creed\s*[-–—:]\s*([^|]+)/i);
      title = match?.[1]?.trim() || title || "Official release";
    }

    return {
      id,
      artist: "Deon Creed",
      title,
      group: String(item?.group || "Soul / R&B").trim(),
      published: String(item?.published || "").trim()
    };
  }

  function uniqueSorted(releases) {
    const seen = new Set();
    return releases
      .filter(Boolean)
      .filter(release => {
        if (seen.has(release.id)) return false;
        seen.add(release.id);
        return true;
      })
      .sort((a, b) => (Date.parse(b.published || "") || 0) - (Date.parse(a.published || "") || 0));
  }

  function artwork(release, className) {
    return `
      <div class="${className}" data-monogram="DC">
        <img loading="lazy" decoding="async" src="/api/release-image?id=${encodeURIComponent(release.id)}" alt="${escapeHtml(`${release.title} by Deon Creed`)}">
        <span class="discography-play-mark" aria-hidden="true">▶</span>
      </div>`;
  }

  function latestMarkup(release) {
    return `
      <article class="latest-release-card">
        ${artwork(release, "latest-release-art")}
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

  function cardMarkup(release) {
    return `
      <article class="discography-card" data-release-id="${escapeHtml(release.id)}" data-release-title="${escapeHtml(release.title)}" data-release-group="${escapeHtml(release.group)}" data-release-published="${escapeHtml(release.published)}">
        ${artwork(release, "discography-art")}
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

  function renderCatalogue(releases) {
    if (!releases.length) return;
    const latestHost = root.querySelector("[data-latest-release]");
    const grid = root.querySelector("[data-discography-grid]");
    const count = root.querySelector("[data-discography-count]");
    const status = root.querySelector("[data-discography-status]");

    if (latestHost) latestHost.innerHTML = latestMarkup(releases[0]);
    if (grid) grid.innerHTML = releases.map(cardMarkup).join("");
    if (count) count.textContent = `${releases.length} release${releases.length === 1 ? "" : "s"}`;
    if (status) status.textContent = "Updated from the live official catalogue";
  }

  async function refreshCatalogue() {
    try {
      const response = await fetch("/api/releases?_=" + Date.now(), {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Catalogue API unavailable");
      const payload = await response.json();
      const live = Array.isArray(payload?.releases)
        ? payload.releases.map(prepareRelease).filter(Boolean)
        : [];
      renderCatalogue(uniqueSorted([...live, FALLBACK_RELEASE]));
    } catch (_) {
      renderCatalogue([FALLBACK_RELEASE]);
    }
  }

  function releaseFromButton(button) {
    const card = button.closest("[data-release-id],.discography-card,.latest-release-card");
    const id = safeVideoId(button.dataset.playRelease);
    if (!id) return null;
    return {
      id,
      title: card?.dataset.releaseTitle || card?.querySelector("h3")?.textContent?.trim() || "Deon Creed release",
      group: card?.dataset.releaseGroup || card?.querySelector(".discography-genre")?.textContent?.trim() || "Soul / R&B",
      published: card?.dataset.releasePublished || ""
    };
  }

  function playImmediately(release) {
    const frame = root.querySelector("[data-featured-frame]");
    const title = root.querySelector("[data-featured-title]");
    const tag = root.querySelector("[data-featured-tag]");
    const copy = root.querySelector("[data-featured-copy]");
    const link = root.querySelector("[data-featured-link]");

    if (frame) {
      frame.innerHTML = `<iframe loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${escapeHtml(release.id)}?rel=0&amp;modestbranding=1&amp;autoplay=1&amp;playsinline=1" title="${escapeHtml(`Deon Creed — ${release.title}`)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
    }
    if (title) title.textContent = release.title;
    if (tag) tag.textContent = "Now playing";
    if (copy) copy.textContent = release.published
      ? `${release.group} · ${formatDate(release.published)}`
      : release.group;
    if (link) {
      link.href = `https://www.youtube.com/watch?v=${release.id}`;
      link.hidden = false;
    }

    document.getElementById("featured-release")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  }

  root.addEventListener("click", event => {
    const button = event.target.closest("[data-play-release]");
    if (!button) return;
    const release = releaseFromButton(button);
    if (!release) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    playImmediately(release);
  }, true);

  fixPortrait();

  const status = root.querySelector("[data-discography-status]");
  if (status && !/loading/i.test(status.textContent || "")) {
    refreshCatalogue();
  } else if (status) {
    const observer = new MutationObserver(() => {
      if (/loading/i.test(status.textContent || "")) return;
      observer.disconnect();
      refreshCatalogue();
    });
    observer.observe(status, { childList: true, subtree: true, characterData: true });
    window.setTimeout(() => {
      observer.disconnect();
      refreshCatalogue();
    }, 1500);
  } else {
    window.setTimeout(refreshCatalogue, 500);
  }
})();
