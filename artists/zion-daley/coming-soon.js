(function () {
  "use strict";
  const root = document.getElementById("artistProfile");
  if (!root || root.dataset.artist !== "zion-daley") return;

  const RELEASE_ARTIST = "Zion Daley";
  const RELEASE_TITLE = "Where We Live";
  const RELEASE_DATE = "4 September 2026 at 6PM UK time";
  const RELEASE_AT = Date.parse("2026-09-04T17:00:00Z"); // 18:00 BST
  const ARTIST_VISUAL = "/assets/artists/zion-daley-portrait-final.webp?v=20260825-zionfinal2";

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalise(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function safeVideoId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  }

  function releaseWindowOpen() {
    return Number.isFinite(RELEASE_AT) && Date.now() >= RELEASE_AT;
  }

  function formatDate(value) {
    if (!value) return RELEASE_DATE;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return RELEASE_DATE;
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function matchesScheduledRelease(item) {
    if (!item || item.contentType !== "full-release") return false;
    if (normalise(item.artist) !== normalise(RELEASE_ARTIST)) return false;
    if (normalise(item.title) !== normalise(RELEASE_TITLE)) return false;

    const publishedAt = Date.parse(String(item.published || ""));
    if (Number.isFinite(publishedAt) && publishedAt > Date.now()) return false;

    return Boolean(safeVideoId(item.id));
  }

  function lockFeaturedLink(link) {
    if (!link) return;
    link.hidden = true;
    link.removeAttribute("href");
    link.removeAttribute("target");
    link.setAttribute("aria-disabled", "true");
    link.textContent = "Available 4 September at 6PM";
  }

  function comingSoonVisual() {
    return `<div class="profile-coming-soon-visual" style="position:absolute;inset:0;overflow:hidden;background:#050505;display:grid;place-items:center">
      <img src="${ARTIST_VISUAL}" alt="Zion Daley artist portrait" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 34%;opacity:.72">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.20),rgba(0,0,0,.30) 44%,rgba(0,0,0,.82));"></div>
      <div style="position:relative;z-index:2;max-width:82%;padding:24px;text-align:center;text-shadow:0 2px 18px #000">
        <strong style="display:block;color:#f3c74f;font-size:clamp(1.05rem,2.2vw,1.45rem);letter-spacing:.12em;text-transform:uppercase">Coming soon</strong>
        <span style="display:block;margin-top:14px;color:#f6f1e3;font-weight:900;line-height:1.5">Where We Live releases 4 September 2026 at 6PM UK time.</span>
      </div>
    </div>`;
  }

  function applyComingSoon() {
    const frame = root.querySelector("[data-featured-frame]");
    const tag = root.querySelector("[data-featured-tag]");
    const title = root.querySelector("[data-featured-title]");
    const copy = root.querySelector("[data-featured-copy]");
    const status = root.querySelector("[data-discography-status]");
    const latest = root.querySelector("[data-latest-release]");
    const grid = root.querySelector("[data-discography-grid]");
    const count = root.querySelector("[data-discography-count]");
    const link = root.querySelector("[data-featured-link]");

    if (frame) frame.innerHTML = comingSoonVisual();
    if (tag) tag.textContent = "Coming soon";
    if (title) title.textContent = RELEASE_TITLE;
    if (copy) copy.textContent = "Reggae · 4 September 2026 · 6PM UK time";
    if (status) status.textContent = "Coming soon";
    lockFeaturedLink(link);

    if (latest && !latest.querySelector("[data-release-id]")) {
      latest.innerHTML = '<div class="discography-empty"><strong>Coming soon</strong><br>Where We Live — 4 September 2026 at 6PM UK time</div>';
    }
    if (grid && !grid.querySelector("[data-release-id]")) {
      grid.innerHTML = '<div class="discography-empty">Zion Daley’s debut release will be added automatically when it goes public.</div>';
    }
    if (count && !root.querySelector("[data-release-id]")) count.textContent = "0 releases";
  }

  function activateLiveRelease(release) {
    if (!releaseWindowOpen()) {
      applyComingSoon();
      return;
    }

    const videoId = safeVideoId(release?.id);
    if (!videoId) {
      applyComingSoon();
      return;
    }

    const frame = root.querySelector("[data-featured-frame]");
    const tag = root.querySelector("[data-featured-tag]");
    const title = root.querySelector("[data-featured-title]");
    const copy = root.querySelector("[data-featured-copy]");
    const status = root.querySelector("[data-discography-status]");
    const link = root.querySelector("[data-featured-link]");

    if (frame) {
      frame.innerHTML = `<iframe loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${escapeHtml(videoId)}?rel=0&amp;modestbranding=1" title="${escapeHtml(`Zion Daley — ${release.title || RELEASE_TITLE}`)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
    }
    if (tag) tag.textContent = "Featured release";
    if (title) title.textContent = release.title || RELEASE_TITLE;
    if (copy) copy.textContent = `Reggae · ${formatDate(release.published)}`;
    if (status) status.textContent = "Updates automatically from the official catalogue";
    if (link) {
      link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.removeAttribute("aria-disabled");
      link.textContent = "Watch on YouTube";
      link.hidden = false;
    }
  }

  async function syncReleaseState() {
    if (!releaseWindowOpen()) {
      applyComingSoon();
      return;
    }

    try {
      const response = await fetch("/releases.json", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (response.ok) {
        const payload = await response.json();
        const release = Array.isArray(payload?.releases)
          ? payload.releases.find(matchesScheduledRelease)
          : null;
        if (release) {
          activateLiveRelease(release);
          return;
        }
      }
    } catch (_) {
      // Keep the scheduled-state presentation if the catalogue cannot be reached.
    }
    applyComingSoon();
  }

  applyComingSoon();
  [250, 1200, 3500].forEach(delay => window.setTimeout(syncReleaseState, delay));

  const releaseDelay = RELEASE_AT - Date.now();
  if (releaseDelay > 0 && releaseDelay < 2147483647) {
    window.setTimeout(syncReleaseState, releaseDelay + 2000);
  }
})();
