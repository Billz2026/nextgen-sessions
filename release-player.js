(function () {
  "use strict";

  document.querySelectorAll("[data-release-player]").forEach(player => {
    const button = player.querySelector("[data-release-play]");
    if (!button) return;

    button.addEventListener("click", () => {
      const videoId = String(player.dataset.videoId || "").trim();
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;

      const frame = document.createElement("iframe");
      frame.title = player.dataset.videoTitle || "NextGen Sessions release";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
      player.replaceChildren(frame);
    }, { once: true });
  });
})();
