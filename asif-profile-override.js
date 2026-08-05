(function () {
  var profiles = window.NGS_ARTIST_PROFILES;
  if (!profiles || !profiles["asif-sultaan"]) return;

  var profile = profiles["asif-sultaan"];
  delete profile.image;
  profile.imageKey = "asif-sultaan";
  profile.imagePosition = "50% 36%";
})();