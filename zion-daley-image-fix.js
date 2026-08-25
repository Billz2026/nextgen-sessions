(function () {
  "use strict";

  const portrait = "/assets/artists/zion-daley-portrait-final.webp?v=20260825-zionfinal2";
  window.NGS_ARTIST_IMAGES = window.NGS_ARTIST_IMAGES && typeof window.NGS_ARTIST_IMAGES === "object"
    ? window.NGS_ARTIST_IMAGES
    : {};

  window.NGS_ARTIST_IMAGES["zion-daley"] = {
    src: portrait,
    portrait,
    fallback: portrait,
    position: "50% 34%"
  };
})();
