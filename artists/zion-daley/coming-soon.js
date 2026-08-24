(function () {
  "use strict";
  const root = document.getElementById("artistProfile");
  if (!root || root.dataset.artist !== "zion-daley") return;

  const VIDEO_ID = "b0tJlFOe0p4";
  const RELEASE_DATE = "4 September 2026";

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

    if (frame && !frame.querySelector("iframe")) {
      frame.innerHTML = '<div class="profile-video-unavailable"><strong>Coming soon</strong><br>Where We Live releases 4 September 2026.</div>';
    }
    if (tag && !/now playing/i.test(tag.textContent || "")) tag.textContent = "Coming soon";
    if (title && !root.querySelector("iframe")) title.textContent = "Where We Live";
    if (copy && !root.querySelector("iframe")) copy.textContent = "Reggae · 4 September 2026";
    if (status) status.textContent = "Coming soon";
    if (link && !root.querySelector("iframe")) {
      link.href = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
      link.textContent = "View scheduled release on YouTube";
      link.hidden = false;
    }
    if (latest && !latest.querySelector("[data-release-id]")) {
      latest.innerHTML = '<div class="discography-empty"><strong>Coming soon</strong><br>Where We Live — 4 September 2026</div>';
    }
    if (grid && !grid.querySelector("[data-release-id]")) {
      grid.innerHTML = '<div class="discography-empty">Zion Daley’s debut release will be added automatically when it goes public.</div>';
    }
    if (count && !root.querySelector("[data-release-id]")) count.textContent = "0 releases";
  }

  function activateLiveRelease(release) {
    const frame = root.querySelector("[data-featured-frame]");
    const tag = root.querySelector("[data-featured-tag]");
    const title = root.querySelector("[data-featured-title]");
    const copy = root.querySelector("[data-featured-copy]");
    const status = root.querySelector("[data-discography-status]");
    const link = root.querySelector("[data-featured-link]");

    if (frame) {
      frame.innerHTML = `<iframe loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${VIDEO_ID}?rel=0&amp;modestbranding=1" title="${escapeHtml(`Zion Daley — ${release.title || "Where We Live"}`)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
    }
    if (tag) tag.textContent = "Featured release";
    if (title) title.textContent = release.title || "Where We Live";
    if (copy) copy.textContent = `Reggae · ${formatDate(release.published)}`;
    if (status) status.textContent = "Updates automatically from the official catalogue";
    if (link) {
      link.href = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
      link.textContent = "Watch on YouTube";
      link.hidden = false;
    }
  }

  async function syncReleaseState() {
    try {
      const response = await fetch("/releases.json", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (response.ok) {
        const payload = await response.json();
        const release = Array.isArray(payload?.releases)
          ? payload.releases.find(item => item?.id === VIDEO_ID && item?.contentType === "full-release")
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

  [250, 1200, 3500].forEach(delay => window.setTimeout(syncReleaseState, delay));
})();
