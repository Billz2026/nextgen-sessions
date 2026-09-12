(function () {
  "use strict";

  function timestamp(item) {
    const parsed = Date.parse(String(item?.published || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function latestForCollection(mixes, collection) {
    return mixes
      .filter((item) =>
        item?.contentType === "long-mix" &&
        String(item.collection || "").trim() === collection &&
        /^[A-Za-z0-9_-]{11}$/.test(String(item.id || "")),
      )
      .sort((a, b) => {
        const dateDifference = timestamp(b) - timestamp(a);
        if (dateDifference) return dateDifference;
        return Number(b.sequence || 0) - Number(a.sequence || 0);
      })[0] || null;
  }

  function thumbnailUrl(videoId) {
    return `/api/release-image?id=${encodeURIComponent(videoId)}&size=hero`;
  }

  function applyLatestArtwork(card, latest) {
    const image = card.querySelector("[data-mix-thumbnail]");
    if (!image || !latest?.id) return;

    const fallback = String(latest.thumbnail || "").trim() ||
      `https://i.ytimg.com/vi/${encodeURIComponent(latest.id)}/hqdefault.jpg`;
    const title = String(latest.rawTitle || latest.title || "Latest NextGen Sessions mix")
      .split("|")[0]
      .trim();

    image.dataset.latestMixId = latest.id;
    image.src = thumbnailUrl(latest.id);
    image.alt = `${title} artwork`;
    image.onerror = function () {
      this.onerror = null;
      this.src = fallback;
    };
  }

  function updateCards(payload) {
    const mixes = Array.isArray(payload?.mixes) ? payload.mixes : [];

    document.querySelectorAll("[data-mix-card]").forEach((card) => {
      const countElement = card.querySelector("[data-mix-count]");
      const collection = String(
        card.dataset.mixCard || countElement?.dataset.mixCount || "",
      ).trim();
      if (!collection) return;

      const items = mixes.filter(
        (item) =>
          item?.contentType === "long-mix" &&
          String(item.collection || "").trim() === collection,
      );
      if (!items.length) return;

      if (countElement) {
        countElement.textContent = `${items.length} ${items.length === 1 ? "mix" : "mixes"}`;
      }

      applyLatestArtwork(card, latestForCollection(items, collection));
    });
  }

  fetch("/mixes.json", { cache: "no-store" })
    .then((response) =>
      response.ok
        ? response.json()
        : Promise.reject(new Error("Mix catalogue unavailable")),
    )
    .then(updateCards)
    .catch(() => {
      // Keep the crawlable fallback counts and latest artwork when the catalogue is unavailable.
    });
})();
