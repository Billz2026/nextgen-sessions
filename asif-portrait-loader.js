(function () {
  "use strict";

  const source = "/assets/artists/asif-sultaan-portrait-final.webp?v=20260805-asif-final1";

  function applyPortrait() {
    const images = document.querySelectorAll(
      'img[alt="Asif Sultaan portrait"], img[alt="Asif Sultaan artist portrait"]'
    );

    images.forEach(image => {
      image.removeAttribute("srcset");
      image.removeAttribute("data-fallback");
      image.hidden = false;
      if (image.src !== new URL(source, window.location.href).href) image.src = source;
      image.closest(".featured-artist-card, .artist-roster-card")?.classList.add("has-image");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyPortrait, { once: true });
  } else {
    applyPortrait();
  }

  const observer = new MutationObserver(applyPortrait);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
})();
