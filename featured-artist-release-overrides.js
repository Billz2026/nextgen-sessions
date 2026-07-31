(function () {
  "use strict";

  const root = document.getElementById("artistProfile");
  if (!root) return;

  const slug = String(root.dataset.artist || "").trim();
  const profile = (window.NGS_ARTIST_PROFILES || {})[slug];
  const overrides = profile?.releaseTitleOverrides;
  if (!overrides || typeof overrides !== "object") return;

  function applyOverrides() {
    root.querySelectorAll("[data-play-release]").forEach(button => {
      const id = String(button.dataset.playRelease || "").trim();
      const title = String(overrides[id] || "").trim();
      if (!title) return;

      const releaseCard = button.closest(".discography-card,.latest-release-card");
      const cardHeading = releaseCard?.querySelector("h3");
      if (cardHeading) cardHeading.textContent = title;

      const albumTrack = button.closest(".album-track");
      const trackHeading = albumTrack?.querySelector("strong");
      if (trackHeading) trackHeading.textContent = title;
    });
  }

  applyOverrides();

  const observer = new MutationObserver(applyOverrides);
  observer.observe(root, { childList: true, subtree: true });
})();
