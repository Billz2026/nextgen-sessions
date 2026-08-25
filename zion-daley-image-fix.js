(function () {
  "use strict";

  const visual = "/assets/artists/zion-daley-artist-visual.svg?v=20260825-zionfix1";
  window.NGS_ARTIST_IMAGES = window.NGS_ARTIST_IMAGES && typeof window.NGS_ARTIST_IMAGES === "object"
    ? window.NGS_ARTIST_IMAGES
    : {};

  window.NGS_ARTIST_IMAGES["zion-daley"] = {
    src: visual,
    portrait: visual,
    fallback: visual,
    position: "50% 40%"
  };
})();
