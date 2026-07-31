(function () {
  "use strict";

  const profiles = window.NGS_ARTIST_PROFILES || {};
  const renz = profiles["renz-cole"];
  if (!renz) return;

  Object.assign(renz, {
    eyebrow: "NextGen Sessions featured artist",
    headline: "Modern London rap with sharp personality, football-coded confidence, summer energy and memorable hooks.",
    bio: [
      "Renz Cole represents the contemporary UK rap lane within NextGen Sessions: direct delivery, recognisable visual identity and songs built around clear concepts rather than anonymous uploads.",
      "His catalogue moves between football-coded ambition, London pressure and warmer late-night records, supported by polished artwork, full-length releases and a consistent campaign identity."
    ],
    featuredVideo: {
      id: "JwFCGCLWw0I",
      title: "Outside Till Late",
      label: "Renz Cole — Outside Till Late",
      published: "2026-06-12T17:43:08Z"
    },
    catalogueAliases: ["Renz Cole"],
    related: [
      { name: "Reiss", genre: "UK Rap" },
      { name: "Andre Kadeem", genre: "UK Rap" },
      { name: "Mace K", genre: "UK Rap / Grime" }
    ]
  });
})();
