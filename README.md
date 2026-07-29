# NextGen Sessions website

Public website for [NextGen Sessions](https://nextgensessions.pages.dev/), an independent multi-artist music network.

## Structure

- `index.html` — homepage and featured artists
- `artists/` — full searchable artist roster and profile pages
- `releases/` — searchable, genre-filtered official release catalogue
- `submit.html` — artist submission form
- `functions/api/latest.js` — Cloudflare Pages Function that reads the latest eligible YouTube channel uploads
- `functions/api/releases.js` — Cloudflare Pages Function that reads the official releases playlist
- `site.js` — shared roster and release rendering
- `releases.js` — release catalogue parsing, search and filtering
- `styles.css` — shared visual system
- `404.html` — branded not-found response

## Release feed

The homepage requests `/api/latest`. Full channel uploads are sorted newest first while Shorts, teasers, trailers and promos are excluded. A curated playlist and static list provide fallbacks if YouTube is temporarily unavailable.

The release archive requests `/api/releases`. It uses the official releases playlist as its controlled source, presents up to 25 newest-first entries and falls back to a curated local list if the feed is unavailable.

## Deployment

The site is deployed through Cloudflare Pages from the repository's default branch. Changes should be reviewed in a pull request before merging.

## Local preview

Serve the repository root with any static web server. Cloudflare Pages Functions require the Wrangler development server for full API testing.
