(() => {
  "use strict";
  const section = document.querySelector("[data-ngs-albums]");
  if (!section) return;
  const preview = section.querySelector(".ngs-album-preview");
  const title = preview.querySelector("[data-album-title]");
  const artist = preview.querySelector("[data-album-artist]");
  const watch = preview.querySelector(".ngs-album-watch");
  const frameHost = preview.querySelector("[data-album-frame]");
  const close = preview.querySelector(".ngs-album-stop");
  let activeCard = null;
  const cleanup = () => {
    const previous = activeCard;
    frameHost.replaceChildren();
    if (previous) previous.querySelector(".ngs-album-play").setAttribute("aria-pressed","false");
    activeCard = null;
    if (previous) previous.querySelector(".ngs-album-play").focus({preventScroll:true});
  };
  const stop = () => { if (preview.open) preview.close(); cleanup(); };
  const play = card => {
    const id = card.dataset.albumId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    if (preview.open) stop();
    const frame = document.createElement("iframe");
    const name = card.querySelector("h3").textContent;
    title.textContent = name;
    artist.textContent = card.querySelector(".ngs-album-copy p").textContent;
    watch.href = "https://www.youtube.com/watch?v=" + id;
    frame.title = "YouTube album player: " + name;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&playsinline=1&rel=0";
    activeCard = card; card.querySelector(".ngs-album-play").setAttribute("aria-pressed","true");
    frameHost.replaceChildren(frame);
    preview.showModal(); close.focus();
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
  close.addEventListener("click", stop);
  preview.addEventListener("cancel", e => { e.preventDefault(); stop(); });
  preview.addEventListener("close", () => { if (!preview.open) cleanup(); });
  preview.addEventListener("click", e => {
    if (e.target !== preview) return;
    const r = preview.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) stop();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
})();
