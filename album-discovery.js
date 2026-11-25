(() => {
  "use strict";
  const section = document.querySelector("[data-ngs-albums]");
  if (!section) return;
  const grid = section.querySelector(".ngs-album-grid");
  const optin = section.querySelector(".ngs-album-optin");
  const toggle = optin.querySelector("input");
  const preview = section.querySelector(".ngs-album-preview");
  const label = preview.querySelector("p");
  const frameHost = preview.querySelector("[data-album-frame]");
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  let timer, activeCard, mode;
  const stop = () => { clearTimeout(timer); frameHost.replaceChildren(); preview.hidden = true; activeCard = null; mode = null; };
  const play = (card, hover) => {
    if (activeCard === card && mode === (hover ? "hover" : "click")) return;
    const id = card.dataset.albumId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    stop();
    const frame = document.createElement("iframe");
    frame.title = "YouTube album player: " + card.querySelector("h3").textContent;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&playsinline=1&rel=0" + (hover ? "&mute=1" : "");
    label.textContent = (hover ? "Muted preview · " : "Now playing · ") + card.querySelector("h3").textContent;
    activeCard = card; mode = hover ? "hover" : "click";
    preview.hidden = false; frameHost.replaceChildren(frame);
  };
  const cards = [...grid.querySelectorAll("[data-album-id]")];
  for (const card of cards) {
    const button = card.querySelector(".ngs-album-play");
    button.hidden = false;
    button.addEventListener("click", () => play(card, false));
    card.addEventListener("pointerenter", () => {
      if (!fine.matches || !toggle.checked || mode === "click") return;
      clearTimeout(timer); timer = setTimeout(() => play(card, true), 650);
    });
    card.addEventListener("pointerleave", () => { clearTimeout(timer); if (mode === "hover" && activeCard === card) stop(); });
    const image = card.querySelector("img");
    image.addEventListener("error", () => {
      if (image.dataset.fallback) { image.hidden = true; return; }
      image.dataset.fallback = "1"; image.src = "https://i.ytimg.com/vi/" + card.dataset.albumId + "/hqdefault.jpg";
    });
  }
  const syncHover = () => { optin.hidden = !fine.matches; if (!fine.matches) { toggle.checked = false; if (mode === "hover") stop(); } };
  syncHover(); fine.addEventListener("change", syncHover);
  toggle.addEventListener("change", () => { if (!toggle.checked && mode === "hover") stop(); });
  preview.querySelector("button").addEventListener("click", stop);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !preview.hidden) stop(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  document.addEventListener("click", e => { if (e.target.closest("#latestVideoPlay,[data-mix-play],[data-archive-play]")) stop(); });
})();
