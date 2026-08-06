(() => {
  "use strict";

  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/artists" && path !== "/artists/darian-gayle") return;

  const SOURCE = "/assets/artists/darian-gayle-portrait-final.svg?v=20260806-darian4";
  const POSITION = "50% 30%";

  window.NGS_ARTIST_IMAGES = window.NGS_ARTIST_IMAGES || {};
  window.NGS_ARTIST_IMAGES["darian-gayle"] = {
    src: SOURCE,
    portrait: SOURCE,
    fallback: SOURCE,
    position: POSITION
  };

  function updateProfileSource() {
    const profile = window.NGS_ARTIST_PROFILES?.["darian-gayle"];
    if (!profile) return;
    profile.imageKey = "darian-gayle";
    profile.image = SOURCE;
    profile.imagePosition = POSITION;
  }

  function configureImage(image) {
    if (!image || image.dataset.darianStaticPortrait === "true") return;

    image.dataset.darianStaticPortrait = "true";
    image.alt = "Darian Gayle portrait";
    image.loading = image.loading || "lazy";
    image.decoding = "async";
    image.hidden = false;
    image.removeAttribute("srcset");
    image.removeAttribute("data-fallback");
    image.style.setProperty("--artist-image-position", POSITION);
    image.style.objectPosition = POSITION;
    image.src = SOURCE;

    image.addEventListener("error", () => {
      image.hidden = true;
      image.closest(".featured-artist-card, .artist-roster-card")?.classList.remove("has-image");
    }, { once: true });

    image.closest(".featured-artist-card, .artist-roster-card")?.classList.add("has-image");
  }

  function cardPortrait(card) {
    let image = card.querySelector("img");
    if (image) return image;

    image = document.createElement("img");
    image.className = card.classList.contains("artist-roster-card")
      ? "artist-roster-image featured-artist-image"
      : "featured-artist-image";
    card.prepend(image);
    return image;
  }

  function applyPortrait() {
    updateProfileSource();

    document.querySelectorAll('a[href*="/artists/darian-gayle"]').forEach(card => {
      configureImage(cardPortrait(card));
    });

    document.querySelectorAll(
      'main[data-artist="darian-gayle"] img.profile-image, img[alt="Darian Gayle portrait"], img[alt="Darian Gayle artist portrait"]'
    ).forEach(configureImage);
  }

  applyPortrait();

  const observer = new MutationObserver(applyPortrait);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
})();
