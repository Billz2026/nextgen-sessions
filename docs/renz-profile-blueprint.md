# Featured artist profile blueprint

Renz Cole is the reference implementation for the remaining featured artist pages.

## Required profile structure

1. Maintain one authoritative artist record. Do not correct profile metadata through later script overrides.
2. Use a clean artist portrait and accurate identity copy.
3. Add quick navigation for Featured, Latest, Albums, All songs and About.
4. Use one main YouTube player only.
5. Artwork and Play now controls start songs through the main player without forcing the visitor away from the catalogue.
6. Keep a compact now-playing bar visible while the visitor continues browsing.
7. The Stop control must unload the active autoplay iframe, clear the highlighted card and restore the editorial featured release.
8. Featured Release stays under editorial control.
9. Latest Release and All Songs update from the official release catalogue.
10. Album sections appear only when a verified album exists.
11. Album counts describe standalone videos, not the album's total track count.
12. Related artists must match the artist's actual musical lane.
13. Navigation, metadata, keyboard access and mobile behaviour must match the main site.
14. Artists with more than the configured catalogue threshold receive a Cards / Compact list switch.
15. Missing artwork must not break playback or hide the YouTube fallback link.

## Shared implementation

The reusable experience lives in:

- `/featured-artist-experience.js`
- `/featured-artist-experience.css`

A profile opts into the system through its authoritative data record:

```js
featuredExperience: {
  enabled: true,
  albumLabel: "Album name",
  aboutLabel: "About artist",
  compactViewThreshold: 10
}
```

Do not create a separate playback script for each featured artist.

## Renz Cole release rule

Outside Till Late remains the latest public release until Heatwave is published and enters the official UK Rap & Grime playlist catalogue. Heatwave must not be manually exposed before its YouTube release. Once the catalogue refreshes, it should appear once, sort newest-first and become the automatic latest release. The editorial Featured Release remains Outside Till Late until NextGen Sessions deliberately changes it.

## Lock-in QA

Before applying this blueprint to another artist, verify on desktop and mobile:

- Every song artwork and Play now control starts the correct release.
- Switching tracks replaces the existing iframe rather than creating another player.
- Stop removes active audio, clears the gold highlight and restores the editorial featured release.
- Escape also stops playback for keyboard users.
- The now-playing bar never covers essential controls.
- Album quick play and the full-album button work.
- Missing artwork falls back without breaking YouTube access.
- A catalogue outage still leaves protected fallback releases available.
- New releases appear once and sort newest-first after catalogue refresh.
