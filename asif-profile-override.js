(function () {
  var profiles = window.NGS_ARTIST_PROFILES;
  if (!profiles || !profiles["asif-sultaan"]) return;

  var profile = profiles["asif-sultaan"];
  delete profile.image;
  profile.imageKey = "asif-sultaan";
  profile.imagePosition = "50% 36%";
  profile.genre = "Punjabi / South Asian Fusion";
  profile.location = "Location undisclosed";
  profile.eyebrow = "NextGen Sessions featured artist";
  profile.headline = "Modern Punjabi crossover shaped by commanding vocals, South Asian trap texture and polished global production.";
  profile.catalogueAliases = ["Asif Sultaan"];
  profile.featuredVideo = {
    id: "3nEDJw-gvGI",
    title: "Nazar",
    label: "Asif Sultaan — Nazar",
    published: "2026-05-12T08:12:46Z"
  };
  profile.additionalReleases = [
    {
      id: "3nEDJw-gvGI",
      artist: "Asif Sultaan",
      title: "Nazar",
      group: "Punjabi / South Asian Fusion",
      published: "2026-05-12T08:12:46Z"
    },
    {
      id: "7EXt64hyMfA",
      artist: "Asif Sultaan",
      title: "Wazan",
      group: "Punjabi / South Asian Fusion",
      published: ""
    }
  ];
  profile.featuredExperience = {
    enabled: true,
    albumLabel: "Asif Sultaan catalogue",
    aboutLabel: "About Asif Sultaan",
    compactViewThreshold: 6
  };
})();