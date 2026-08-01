(function () {
  "use strict";

  const profile = window.NGS_ARTIST_PROFILES?.["jay-starks"];
  if (!profile) return;

  const image = window.NGS_ARTIST_IMAGES?.["jay-starks"]?.portrait;
  if (image) profile.image = image;
  profile.imagePosition = "50% 38%";
})();
