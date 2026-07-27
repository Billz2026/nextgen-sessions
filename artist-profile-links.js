(function () {
  "use strict";

  const profiles = window.NGS_ARTIST_PROFILES || {};
  const profileByName = Object.values(profiles).reduce((map, profile) => {
    map[String(profile.name || "").trim().toLowerCase()] = profile;
    return map;
  }, {});

  document.querySelectorAll(".featured-artist-card, .artist-roster-card").forEach(card => {
    const heading = card.querySelector("h3");
    const name = String(heading?.textContent || "").trim().toLowerCase();
    const profile = profileByName[name];
    if (!profile?.path) return;

    card.href = profile.path;
    card.removeAttribute("target");
    card.removeAttribute("rel");
    card.setAttribute("aria-label", `View ${profile.name} artist profile`);
    card.dataset.profileAvailable = "true";
  });
})();
