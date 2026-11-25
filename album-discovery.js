(() => {
  "use strict";
  const section = document.querySelector("[data-ngs-albums]");
  if (!section) return;
  const preview = section.querySelector(".ngs-album-preview");
  const label = preview.querySelector("p");
  const frameHost = preview.querySelector("[data-album-frame]");
  let activeCard = null;
  const stop = (restore = false) => {
    const previous = activeCard;
    frameHost.replaceChildren(); preview.hidden = true;
    if (previous) previous.querySelector(".ngs-album-play").setAttribute("aria-pressed","false");
    activeCard = null;
    if (restore && previous) previous.querySelector(".ngs-album-play").focus();
  };
  const play = card => {
    if (activeCard === card) { stop(true); return; }
    const id = card.dataset.albumId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    stop();
    const frame = document.createElement("iframe");
    frame.title = "YouTube album player: " + card.querySelector("h3").textContent;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&playsinline=1&rel=0";
    label.textContent = "Album player · " + card.querySelector("h3").textContent;
    activeCard = card; card.querySelector(".ngs-album-play").setAttribute("aria-pressed","true");
    preview.hidden = false; frameHost.replaceChildren(frame);
  };
  for (const card of section.querySelectorAll("[data-album-id]")) {
    const button = card.querySelector(".ngs-album-play");
    button.hidden = false;
    button.addEventListener("click", () => play(card));
    const image = card.querySelector("img");
    const fallback = () => {
      if (image.dataset.fallback) { image.hidden = true; return; }
      image.dataset.fallback = "1"; image.src = "https://i.ytimg.com/vi/" + card.dataset.albumId + "/mqdefault.jpg";
    };
    image.addEventListener("error", fallback);
    if (image.complete && (!image.naturalWidth || image.naturalWidth < 200)) fallback();
  }
  preview.querySelector("button").addEventListener("click", () => stop(true));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !preview.hidden) stop(true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  document.addEventListener("click", e => { if (e.target.closest("#latestVideoPlay,[data-mix-play],[data-archive-play]")) stop(); });
})();
