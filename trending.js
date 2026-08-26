(() => {
  "use strict";

  if (document.querySelector("[data-trending-feed]")) return;
  const anchor = document.querySelector("[data-weekly-feed]");
  if (!anchor) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function validRelease(item) {
    return Number.isInteger(item?.rank)
      && item.rank > 0
      && typeof item?.artist === "string"
      && typeof item?.title === "string"
      && /^\/releases\/[a-z0-9-]+\/$/i.test(String(item?.url || ""))
      && /^\/api\/release-image\?/.test(String(item?.image || ""));
  }

  function card(item) {
    return `<a class="trending-card" href="${escapeHtml(item.url)}">
      <span class="trending-rank" aria-label="Rank ${item.rank}">${item.rank}</span>
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)} by ${escapeHtml(item.artist)}" loading="lazy" decoding="async">
      <span class="trending-copy">
        <small>${escapeHtml(item.genre || "NextGen Sessions")}</small>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.artist)}</span>
      </span>
      <span class="trending-arrow" aria-hidden="true">→</span>
    </a>`;
  }

  fetch("/api/trending", { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`Trending returned ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const releases = Array.isArray(payload?.releases) ? payload.releases.filter(validRelease).slice(0, 4) : [];
      if (payload?.active !== true || releases.length < 2) return;

      const section = document.createElement("section");
      section.className = "section trending-feed";
      section.dataset.trendingFeed = "true";
      section.setAttribute("aria-labelledby", "trending-feed-title");
      section.innerHTML = `<div class="trending-heading">
        <div><p class="eyebrow">Trending this week</p><h2 id="trending-feed-title">What listeners are moving into.</h2><p>Ranked from recent on-site listening and discovery activity. Repeated engagement in the same browser session is filtered out.</p></div>
        <span class="trending-window">Rolling 7 days</span>
      </div>
      <div class="trending-grid">${releases.map(card).join("")}</div>`;
      anchor.after(section);
    })
    .catch(() => {
      // Trending is an enhancement. The homepage remains complete without it.
    });
})();
