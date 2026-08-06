(() => {
  "use strict";

  if (window.__NGS_ANDRE_PORTRAIT_READY__) return;

  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/artists" && path !== "/artists/andre-kadeem") return;

  window.__NGS_ANDRE_PORTRAIT_READY__ = true;

  const API_SOURCE = "/api/andre-portrait?v=20260806-andre1";
  const POSITION = "50% 32%";
  const CHUNK_PATHS = [1, 2, 3, 4, 5].map(
    part => `/assets/artists/andre-kadeem-portrait/part-${part}.txt?v=20260806-andre1`
  );

  let activeSource = API_SOURCE;
  let fallbackPromise = null;

  function updateDataSources(source) {
    window.NGS_ARTIST_IMAGES = window.NGS_ARTIST_IMAGES || {};
    window.NGS_ARTIST_IMAGES["andre-kadeem"] = {
      src: source,
      portrait: source,
      fallback: source,
      position: POSITION
    };

    const profile = window.NGS_ARTIST_PROFILES?.["andre-kadeem"];
    if (profile) {
      profile.imageKey = "andre-kadeem";
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
        throw new Error("Andre Kadeem portrait fallback is invalid");
      }
      activeSource = `data:image/webp;base64,${base64}`;
      updateDataSources(activeSource);
      applyPortrait(activeSource);
      return activeSource;
    }).catch(error => {
      console.error("Andre Kadeem portrait fallback failed", error);
      throw error;
    });

    return fallbackPromise;
  }

  function handleImageError(image) {
    if (image.dataset.andreFallbackAttempted === "true") return;
    image.dataset.andreFallbackAttempted = "true";
    buildFallbackSource().then(source => {
      image.removeAttribute("srcset");
      image.src = source;
      image.hidden = false;
    }).catch(() => {
      image.hidden = true;
    });
  }

  function configureImage(image, source) {
    if (!image || image.dataset.andrePortraitConfigured === source) return;

    image.dataset.andrePortraitConfigured = source;
    image.alt = "Andre Kadeem portrait";
    image.loading = image.loading || "lazy";
    image.decoding = "async";
    image.hidden = false;
    image.removeAttribute("srcset");
    image.removeAttribute("data-fallback");
    image.style.setProperty("--artist-image-position", POSITION);
    image.style.objectPosition = POSITION;

    if (image.dataset.andreErrorListener !== "true") {
      image.dataset.andreErrorListener = "true";
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
    document.querySelectorAll('a[href*="/artists/andre-kadeem"]').forEach(card => {
      configureImage(cardPortrait(card), source);
    });

    const profileMain = document.querySelector('main[data-artist="andre-kadeem"]');
    if (profileMain) {
      profileMain.querySelectorAll("img.profile-image").forEach(image => {
        configureImage(image, source);
      });
    }

    document.querySelectorAll(
      'img[alt="Andre Kadeem portrait"], img[alt="Andre Kadeem artist portrait"]'
    ).forEach(image => configureImage(image, source));
  }

  updateDataSources(API_SOURCE);
  applyPortrait(API_SOURCE);

  const observer = new MutationObserver(() => applyPortrait(activeSource));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
})();
