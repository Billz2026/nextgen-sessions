(function () {
  "use strict";

  fetch("/mixes.json", { cache: "no-cache" })
    .then((response) =>
      response.ok
        ? response.json()
        : Promise.reject(new Error("Mix catalogue unavailable")),
    )
    .then((payload) => {
      const mixes = Array.isArray(payload.mixes) ? payload.mixes : [];
      document.querySelectorAll("[data-mix-count]").forEach((element) => {
        const collection = String(element.dataset.mixCount || "").trim();
        const items = mixes.filter(
          (item) => String(item.collection || "").trim() === collection,
        );
        if (!items.length) return;
        element.textContent = `${items.length} ${items.length === 1 ? "mix" : "mixes"}`;
      });
    })
    .catch(() => {
      // Keep the crawlable fallback counts and artwork when the catalogue is unavailable.
    });
})();
