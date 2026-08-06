(() => {
  "use strict";

  if (window.__NGS_DARIAN_PORTRAIT_READY__) return;

  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/artists" && path !== "/artists/darian-gayle") return;

  window.__NGS_DARIAN_PORTRAIT_READY__ = true;

  const API_SOURCE = "/api/darian-portrait?v=20260806-darian2";
  const POSITION = "50% 30%";
  const CHUNK_PATHS = [1, 2, 3, 4, 5].map(
    part => `/assets/artists/darian-gayle-portrait/part-${part}.txt?v=20260806-darian2`
  );

  let activeSource = API_SOURCE;
  let fallbackPromise = null;

  function updateDataSources(source) {
    window.NGS_ARTIST_IMAGES = window.NGS_ARTIST_IMAGES || {};
    window.NGS_ARTIST_IMAGES["darian-gayle"] = {
      src: source,
      portrait: source,
      fallback: source,
      position: POSITION
    };

    const profile = window.NGS_ARTIST_PROFILES?.["darian-gayle"];
    if (profile) {
      profile.imageKey = "darian-gayle";
      profile.image = source;
      profile.imagePosition = POSITION;
    }
  }

  async function buildFallbackSource() {
    if (fallbackPromise) return fallbackPromise;

    fallbackPromise = Promise.all(
      CHUNK_PATHS.map(async url => {
        const response = await fetch(url, {
          headers: { Accept: "text/plain" },
          cache: "force-cache"
        });
        if (!response.ok) throw new Error(`${url} returned ${response.status}`);
        return response.text();
      })
    ).then(chunks => {
      const base64 = chunks.join("").replace(/\s+/g, "");
      if (!base64.startsWith("UklGR")) {
        throw new Error("Darian Gayle portrait fallback is invalid");
      }
      activeSource = `data:image/webp;base64,${base64}`;
      updateDataSources(activeSource);
      applyPortrait(activeSource);
      return activeSource;
    }).catch(error => {
      console.error("Darian Gayle portrait fallback failed", error);
      throw error;
    });

    return fallbackPromise;
  }

  function handleImageError(image) {
    if (image.dataset.darianFallbackAttempted === "true") return;
    image.dataset.darianFallbackAttempted = "true";

    buildFallbackSource().then(source => {
      image.removeAttribute("srcset");
      image.src = source;
      image.hidden = false;
      image.closest(".featured-artist-card, .artist-roster-card")?.classList.add("has-image");
    }).catch(() => {
      image.hidden = true;
      image.closest(".featured-artist-card, .artist-roster-card")?.classList.remove("has-image");
    });
  }

  function configureImage(image, source) {
    if (!image || image.dataset.darianPortraitConfigured === source) return;

    image.dataset.darianPortraitConfigured = source;
    image.alt = "Darian Gayle portrait";
    image.loading = image.loading || "lazy";
    image.decoding = "async";
    image.hidden = false;
    image.removeAttribute("srcset");
    image.removeAttribute("data-fallback");
    image.style.setProperty("--artist-image-position", POSITION);
    image.style.objectPosition = POSITION;

    if (image.dataset.darianErrorListener !== "true") {
      image.dataset.darianErrorListener = "true";
      image.addEventListener("error", () => handleImageError(image));
    }

    image.src = source;
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
    card.classList.add("has-image");
    return image;
  }

  function applyPortrait(source = activeSource) {
    document.querySelectorAll('a[href*="/artists/darian-gayle"]').forEach(card => {
      configureImage(cardPortrait(card), source);
    });

    const profileMain = document.querySelector('main[data-artist="darian-gayle"]');
    if (profileMain) {
      profileMain.querySelectorAll("img.profile-image").forEach(image => {
        configureImage(image, source);
      });
    }

    document.querySelectorAll(
      'img[alt="Darian Gayle portrait"], img[alt="Darian Gayle artist portrait"]'
    ).forEach(image => configureImage(image, source));
  }

  updateDataSources(API_SOURCE);
  applyPortrait(API_SOURCE);

  const observer = new MutationObserver(() => applyPortrait(activeSource));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
})();
