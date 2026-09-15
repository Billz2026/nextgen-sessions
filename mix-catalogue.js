(function () {
  "use strict";

  const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

  function timestamp(item) {
    const parsed = Date.parse(String(item?.published || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function latestForCollection(mixes, collection) {
    return mixes
      .filter((item) =>
        item?.contentType === "long-mix" &&
        String(item.collection || "").trim() === collection &&
        VIDEO_ID_PATTERN.test(String(item.id || "")),
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

  function publicDesiMixes(mixes) {
    const now = Date.now();
    return mixes
      .filter((item) => {
        if (item?.contentType !== "long-mix") return false;
        if (!VIDEO_ID_PATTERN.test(String(item.id || ""))) return false;

        // The dedicated YouTube playlist is the source of truth for the Desi lane.
        // The catalogue currently keeps the internal collection key as "bhangra"
        // for backwards compatibility, while the public website presents the
        // broader and future-proof label "Desi Mixes".
        if (String(item.collection || "").trim() !== "bhangra") return false;

        const publishedAt = Date.parse(String(item.published || ""));
        return Number.isFinite(publishedAt) && publishedAt <= now;
      })
      .sort((a, b) => timestamp(b) - timestamp(a));
  }

  function buildDesiCard(items) {
    const grid = document.querySelector("#mashups .mix-grid");
    if (!grid || !items.length || grid.querySelector("[data-auto-desi-card]")) return;

    const latest = items[0];
    const rawTitle = String(latest.rawTitle || latest.title || "Desi Mix")
      .split("|")[0]
      .trim();
    const fallback = String(latest.thumbnail || "").trim() ||
      `https://i.ytimg.com/vi/${encodeURIComponent(latest.id)}/hqdefault.jpg`;

    const card = document.createElement("a");
    card.className = "mix-card";
    card.dataset.autoDesiCard = "";
    card.href = `https://www.youtube.com/watch?v=${encodeURIComponent(latest.id)}`;
    card.target = "_blank";
    card.rel = "noopener";
    card.setAttribute("aria-label", `Open ${rawTitle} on YouTube`);

    const media = document.createElement("div");
    media.className = "mix-card-media";

    const image = document.createElement("img");
    image.src = thumbnailUrl(latest.id);
    image.alt = `${rawTitle} artwork`;
    image.loading = "lazy";
    image.decoding = "async";
    image.onerror = function () {
      this.onerror = null;
      this.src = fallback;
    };

    const play = document.createElement("span");
    play.className = "mix-play";
    play.setAttribute("aria-hidden", "true");
    media.append(image, play);

    const copy = document.createElement("div");
    copy.className = "mix-card-copy";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `${items.length} ${items.length === 1 ? "mix" : "mixes"}`;

    const heading = document.createElement("h3");
    heading.textContent = "Desi Mixes";

    const description = document.createElement("p");
    description.textContent = "Punjabi, Bhangra and South Asian sounds collected in one long-form Desi mix lane.";

    copy.append(tag, heading, description);
    card.append(media, copy);
    grid.append(card);

    const mashupCopy = document.querySelector("#mashups .mix-category-heading p:last-child");
    if (mashupCopy) {
      mashupCopy.textContent =
        "Long-form series spanning grime, hip-hop, UK rap, dancehall and Desi sounds. Select a mix to open its release.";
    }
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

    buildDesiCard(publicDesiMixes(mixes));
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
      // The gated Desi Mixes card remains absent unless the public catalogue confirms it.
    });
})();
