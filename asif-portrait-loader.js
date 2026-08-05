(function () {
  "use strict";

  const PARTS = [
    "/assets/artists/asif-parts/part-01.txt",
    "/assets/artists/asif-parts/part-02.txt",
    "/assets/artists/asif-parts/part-03.txt",
    "/assets/artists/asif-parts/part-04.txt",
    "/assets/artists/asif-parts/part-05.txt",
    "/assets/artists/asif-parts/part-06.txt",
    "/assets/artists/asif-parts/part-07.txt"
  ];

  function applyPortrait(source) {
    const images = document.querySelectorAll(
      'img[alt="Asif Sultaan portrait"], img[alt="Asif Sultaan artist portrait"]'
    );

    images.forEach(image => {
      image.removeAttribute("srcset");
      image.removeAttribute("data-fallback");
      image.hidden = false;
      image.src = source;
      const card = image.closest(".featured-artist-card, .artist-roster-card");
      if (card) card.classList.add("has-image");
    });
  }

  async function loadPortrait() {
    try {
      const parts = await Promise.all(PARTS.map(async path => {
        const response = await fetch(path, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Unable to load ${path}`);
        return response.text();
      }));

      const encoded = (`U${parts.join("")}`).replace(/\s+/g, "");
      const source = `data:image/webp;base64,${encoded}`;
      applyPortrait(source);

      const observer = new MutationObserver(() => applyPortrait(source));
      observer.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(() => observer.disconnect(), 10000);
    } catch (error) {
      console.error("Asif Sultaan portrait failed to load", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPortrait, { once: true });
  } else {
    loadPortrait();
  }
})();
