(() => {
  "use strict";

  function ensureTrendingAssets() {
    if (!document.querySelector('link[href^="/trending.css"]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/trending.css?v=20260826-trending1";
      document.head.append(stylesheet);
    }
    if (!document.querySelector('script[src^="/trending.js"]')) {
      const script = document.createElement("script");
      script.src = "/trending.js?v=20260826-trending1";
      script.defer = true;
      document.head.append(script);
    }
  }

  ensureTrendingAssets();

  const cards = [...document.querySelectorAll("[data-release-state-card]")];
  if (!cards.length) return;

  function updateCard(card) {
    const status = card.dataset.releaseStatus || "";
    if (status === "live" || status === "publishing") return;

    const releaseAt = Date.parse(card.dataset.releaseAt || "");
    if (!Number.isFinite(releaseAt) || Date.now() < releaseAt) return;

    card.dataset.releaseStatus = "publishing";
    const label = card.querySelector("[data-release-state-label]");
    if (label) label.textContent = "PUBLISHING SHORTLY";
  }

  function refresh() {
    cards.forEach(updateCard);
  }

  refresh();
  window.setInterval(refresh, 30000);

  for (const card of cards) {
    const releaseAt = Date.parse(card.dataset.releaseAt || "");
    const delay = releaseAt - Date.now();
    if (Number.isFinite(delay) && delay > 0 && delay < 2147483647) {
      window.setTimeout(() => updateCard(card), delay + 250);
    }
  }
})();
