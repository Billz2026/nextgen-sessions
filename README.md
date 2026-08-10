# NextGen Sessions website

Public website for [NextGen Sessions](https://nextgensessions.com/), an independent multi-artist music network.

## Structure

- `index.html` — homepage and featured artists
- `artists/` — full searchable artist roster and profile pages
- `releases/` — crawlable release archive plus generated dedicated release pages
- `submit.html` and `submit.js` — secure on-site artist submission form
- `functions/api/submit.js` — validates submissions and sends linked review/confirmation emails
- `functions/api/submission-config.js` — enables the form only when its production secrets are present
- `releases.json` — verified release source of truth generated from curated YouTube playlists
- `functions/api/latest.js` — Cloudflare Pages Function that selects the newest published item from the verified catalogue
- `functions/api/releases.js` — Cloudflare Pages Function that serves the verified catalogue
- `site.js` — shared roster and release rendering
- `releases.js` — client-side release search and filtering enhancement
- `scripts/update-catalogue.py` — fetches curated playlist membership plus real YouTube video publication metadata
- `scripts/render-releases.py` — renders static archive cards, dedicated release pages, artist schema dates and sitemap entries
- `styles.css` — shared visual system
- `404.html` — branded not-found response

## Releases 2.0

The release catalogue is refreshed hourly by `.github/workflows/update-catalogue.yml`. Curated playlists decide which videos are official releases. The builder then uses the YouTube `videos` endpoint for the canonical title, status and `snippet.publishedAt`, so playlist-added dates never determine release order.

The generated `releases.json` is the single release authority for the archive, artist discographies and homepage Latest Release. Future-dated/scheduled videos are excluded until they are actually published, and promo/teaser titles remain excluded.

Every catalogue item gets a stable `/releases/{artist}-{track}/` page with canonical metadata, structured data, artist links, YouTube embed and related releases. `scripts/render-releases.py` also writes the same releases directly into `/releases/index.html`, so search crawlers and visitors without JavaScript can read the catalogue.

## Deployment

The site is deployed through Cloudflare Pages from the repository's default branch. Changes should be reviewed in a pull request before merging.

## Local preview

Serve the repository root with any static web server. Cloudflare Pages Functions require the Wrangler development server for full API testing.

## Submission configuration

The submission flow expects these Cloudflare runtime values:

- `TURNSTILE_SITE_KEY` — public site key for the production hostname
- `TURNSTILE_SECRET_KEY` — secret used for mandatory server-side validation
- `RESEND_API_KEY` — transactional email key for the verified sending domain
- `SUBMISSION_RECIPIENT` — private inbox that receives review copies
- `SUBMISSION_FROM_EMAIL` — optional sender address; defaults to `submissions@nextgensessions.com`

Do not commit secret values. Add them as encrypted production variables in Cloudflare.
