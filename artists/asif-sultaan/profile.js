(function () {
  var profiles = window.NGS_ARTIST_PROFILES;
  if (!profiles || !profiles["asif-sultaan"]) return;

  var profile = profiles["asif-sultaan"];
  delete profile.image;
  profile.imageKey = "asif-sultaan";
  profile.imagePosition = "50% 36%";
  profile.genre = "Punjabi / South Asian Fusion";
  profile.location = "South Asian diaspora";
  profile.eyebrow = "NextGen Sessions featured artist";
  profile.headline = "Modern Punjabi crossover shaped by commanding vocals, South Asian trap texture and polished global production.";
  profile.catalogueAliases = ["Asif Sultaan"];
  profile.featuredVideo = {
    id: "s7W3lr2h3vI",
    title: "Tor Wakhri",
    label: "Asif Sultaan — Tor Wakhri",
    published: "2026-08-21T17:00:00Z"
  };
  profile.additionalReleases = [
    {
      id: "s7W3lr2h3vI",
      artist: "Asif Sultaan",
      title: "Tor Wakhri",
      group: "Punjabi / South Asian Fusion",
      published: "2026-08-21T17:00:00Z"
    },
    {
      id: "3nEDJw-gvGI",
      artist: "Asif Sultaan",
      title: "Nazar",
      group: "Punjabi / South Asian Fusion",
      published: "2026-05-23T17:00:00Z"
    },
    {
      id: "7EXt64hyMfA",
      artist: "Asif Sultaan",
      title: "WAZAN",
      group: "Punjabi / South Asian Fusion",
      published: "2026-04-23T17:00:00Z"
    }
  ];
  profile.featuredExperience = {
    enabled: true,
    albumLabel: "Asif Sultaan catalogue",
    aboutLabel: "About Asif Sultaan",
    compactViewThreshold: 6
  };
})();
