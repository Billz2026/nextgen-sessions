(function () {
  "use strict";

  const profiles = window.NGS_ARTIST_PROFILES || {};

  const reeko = profiles.reeko;
  if (reeko) {
    Object.assign(reeko, {
      eyebrow: "NextGen Sessions featured artist",
      headline: "Melodic Jamaican dancehall built around gullyside authority, nightlife energy, loyalty and sharp observation.",
      bio: [
        "Reeko represents the melodic gully dancehall lane within NextGen Sessions, balancing street authority with hooks that carry beyond the first listen.",
        "His catalogue moves between pressure, loyalty, nightlife and watchful street observation. The Mi Call Di Shots album anchors that identity, while later singles expand the sound without losing his recognisable Jamaican delivery and dark visual world."
      ],
      featuredVideo: {
        id: "EbmBjdo8jOI",
        title: "After Di Shots",
        label: "Reeko — After Di Shots",
        published: "2026-06-02T13:45:45Z"
      },
      catalogueAliases: ["Reeko"],
      additionalReleases: [
        {
          id: "U6lh9buVYHg",
          artist: "Reeko",
          title: "Smile Wid Knife",
          group: "Dancehall & Reggae",
          published: "2026-06-30T10:53:00Z"
        },
        {
          id: "EbmBjdo8jOI",
          artist: "Reeko",
          title: "After Di Shots",
          group: "Dancehall & Reggae",
          published: "2026-06-02T13:45:45Z"
        },
        {
          id: "oc7Cryy5xTM",
          artist: "Reeko",
          title: "Nuff Man A Watch",
          group: "Dancehall & Reggae",
          published: "2026-05-03T11:03:12Z"
        },
        {
          id: "ks4bSmghnDI",
          artist: "Reeko",
          title: "Mi Call Di Shots",
          group: "Dancehall & Reggae",
          published: "2026-04-01T07:02:40Z"
        },
        {
          id: "uB8nYq1co8c",
          artist: "Reeko",
          title: "Nuh Love Round Ya",
          group: "Dancehall & Reggae",
          published: "2026-03-29T14:52:49Z"
        },
        {
          id: "7gXvSVq-T_c",
          artist: "Reeko",
          title: "Gully Boss",
          group: "Dancehall & Reggae",
          published: "2026-03-29T12:32:02Z"
        },
        {
          id: "C6eDlpA08pg",
          artist: "Reeko",
          title: "Ready Fi War",
          group: "Dancehall & Reggae",
          published: "2026-03-27T12:59:11Z"
        },
        {
          id: "wvMNh7u0C4E",
          artist: "Reeko x Keisha",
          title: "Ride Wid Mi",
          group: "Dancehall & Reggae",
          published: "2026-03-26T08:50:52Z"
        }
      ],
      releaseTitleOverrides: {
        "7gXvSVq-T_c": "Gully Boss",
        "C6eDlpA08pg": "Ready Fi War"
      },
      featuredExperience: {
        enabled: true,
        albumLabel: "Mi Call Di Shots album",
        aboutLabel: "About Reeko",
        compactViewThreshold: 10
      },
      related: [
        { name: "Rudii Marka", genre: "Jamaican Dancehall" },
        { name: "Kemar Ranka", genre: "Jamaican Dancehall" },
        { name: "Rell Danja", genre: "Dark Dancehall" }
      ]
    });
  }

  const alia = profiles["alia-bleu"];
  if (alia) {
    Object.assign(alia, {
      eyebrow: "NextGen Sessions featured artist",
      headline: "Late-night UK R&B shaped by self-worth, emotional clarity, firm boundaries and a distinct blue-toned identity.",
      bio: [
        "Alia Bleu represents the contemporary UK R&B lane within NextGen Sessions, pairing smooth vocal presence with emotionally direct writing and polished late-night production.",
        "Her music centres on resilience, self-respect and knowing when to stop chasing what does not return the same energy. The restrained blue visual world keeps her profile recognisable while the writing remains the focus."
      ],
      featuredVideo: {
        id: "kK_M5TobLk0",
        title: "Dreams Don’t Chase You",
        label: "Alia Bleu — Dreams Don’t Chase You",
        published: "2026-06-15T13:32:10Z"
      },
      catalogueAliases: ["Alia Bleu"],
      additionalReleases: [
        {
          id: "kK_M5TobLk0",
          artist: "Alia Bleu",
          title: "Dreams Don’t Chase You",
          group: "R&B & Soul",
          published: "2026-06-15T13:32:10Z"
        }
      ],
      featuredExperience: {
        enabled: true,
        albumLabel: "Projects",
        aboutLabel: "About Alia",
        compactViewThreshold: 10
      },
      related: [
        { name: "Zara Veli", genre: "UK R&B" },
        { name: "Nyah Rae", genre: "R&B" },
        { name: "Marlo Saint", genre: "Afro Swing / R&B" }
      ]
    });
  }
})();
