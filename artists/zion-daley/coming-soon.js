(function () {
  "use strict";
  const root = document.getElementById("artistProfile");
  if (!root || root.dataset.artist !== "zion-daley") return;

  function applyComingSoon() {
    const frame = root.querySelector("[data-featured-frame]");
    const tag = root.querySelector("[data-featured-tag]");
    const title = root.querySelector("[data-featured-title]");
    const copy = root.querySelector("[data-featured-copy]");
    const status = root.querySelector("[data-discography-status]");
    const latest = root.querySelector("[data-latest-release]");
    const grid = root.querySelector("[data-discography-grid]");
    const count = root.querySelector("[data-discography-count]");

    if (frame && !frame.querySelector("iframe")) {
      frame.innerHTML = '<div class="profile-video-unavailable"><strong>Coming soon</strong><br>Where We Live releases 4 September 2026.</div>';
    }
    if (tag && !/now playing/i.test(tag.textContent || "")) tag.textContent = "Coming soon";
    if (title && !root.querySelector("iframe")) title.textContent = "Where We Live";
    if (copy && !root.querySelector("iframe")) copy.textContent = "Reggae · 4 September 2026";
    if (status) status.textContent = "Coming soon";
    if (latest && !latest.querySelector("[data-release-id]")) {
      latest.innerHTML = '<div class="discography-empty"><strong>Coming soon</strong><br>Where We Live — 4 September 2026</div>';
    }
    if (grid && !grid.querySelector("[data-release-id]")) {
      grid.innerHTML = '<div class="discography-empty">Zion Daley’s debut release will be added automatically when it goes public.</div>';
    }
    if (count && !root.querySelector("[data-release-id]")) count.textContent = "0 releases";
  }

  [300, 1000, 2500].forEach(delay => window.setTimeout(applyComingSoon, delay));
})();
