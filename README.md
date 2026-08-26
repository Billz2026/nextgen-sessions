# NextGen Sessions website

Public website for [NextGen Sessions](https://nextgensessions.com/), an independent multi-artist music network.

## Structure

- `index.html` — homepage and featured artists
- `artists/` — full searchable artist roster and profile pages
- `releases/` — crawlable release archive plus generated dedicated release pages
- `submit.html` — current DM/email artist submission route
- `releases.json` — verified release source of truth generated from curated YouTube playlists plus safely discovered due scheduled releases
- `scheduled-releases.json` — metadata-only future release schedule; never stores private YouTube identifiers
- `this-week.json` — generated New This Week / Next Up state
- `search-index.json` — generated universal search index
- `functions/api/latest.js` — Cloudflare Pages Function that selects the newest published item from the verified catalogue
- `functions/api/releases.js` — Cloudflare Pages Function that serves the verified catalogue
- `functions/api/events.js` — first-party, privacy-safe engagement event ingestion
- `functions/api/trending.js` — aggregate rolling seven-day Trending feed with minimum-signal gating
- `functions/api/analytics-summary.js` — authenticated aggregate analytics API for private operations
- `ops/analytics/` — noindex private analytics dashboard
- `site-metrics.js` — shared first-party event instrumentation and session-level engagement deduplication
- `scripts/update-catalogue.py` — fetches curated playlist membership plus real YouTube publication metadata
- `scripts/discover-scheduled-releases.py` — discovers due scheduled releases from public channel uploads when playlist placement is missing
- `scripts/render-releases.py` — renders static archive cards, dedicated release pages, artist schema dates and sitemap entries
- `scripts/build-weekly-feed.mjs` — generates the automated weekly release feed
- `scripts/build-search-index.mjs` — generates universal catalogue search
- `styles.css` — shared visual system
- `404.html` — branded not-found response

## Releases 2.0

The release catalogue is refreshed every 15 minutes by `.github/workflows/update-catalogue.yml`. Curated playlists remain the normal authority for official releases. For a due item already present in the metadata-only release schedule, the automation can also discover the matching full public upload directly from the official channel so a missed playlist update does not leave the site stuck in `PUBLISHING SHORTLY`.

The generated `releases.json` is the single public release authority for the archive, artist discographies, homepage Latest Release, genre hubs and search. Future-dated/scheduled videos are excluded until they are actually public, and promo/teaser titles remain excluded.

Every catalogue item gets a stable `/releases/{artist}-{track}/` page with canonical metadata, structured data, artist links, YouTube embed and related releases. `scripts/render-releases.py` also writes the same releases directly into `/releases/index.html`, so search crawlers and visitors without JavaScript can read the catalogue.

## New This Week release system

Future release metadata is entered once in `scheduled-releases.json` only when pre-release website awareness is required. The schedule uses a local clock time plus IANA timezone such as `Europe/London`; UTC and daylight-saving conversion are derived automatically.

The generated weekly state drives the homepage New This Week / Next Up section, artist Next Release state and upcoming search result. The public catalogue—not the clock alone—is the authority for switching a release to `OUT NOW`.

For normal releases by existing artists where no pre-release website promotion is required, scheduling the public YouTube video and placing it in the appropriate curated playlist is sufficient. Once public, the 15-minute catalogue workflow updates the website automatically.

## First-party analytics and Trending

NextGen Sessions records limited first-party events into the Cloudflare Workers Analytics Engine dataset `nextgensessions_analytics`. The event schema is:

- `index1` — environment (`production`, `staging`, etc.)
- `blob1` — event name
- `blob2` — page path
- `blob3` — privacy-safe content label such as release/artist slug or video ID
- `blob4` — hostname
- `double1` — count (`1`)

No visitor identifier, analytics cookie, raw search term, IP address or user-agent string is written to the custom dataset. `site-metrics.js` uses browser session storage to suppress repeated engagement signals for the same item during the current session, while ordinary page views remain undeduplicated.

`/api/trending` calculates a rolling seven-day release ranking with an additional 24-hour recency boost. Release plays are the strongest signal, followed by release clicks and discovery actions. The endpoint stays inactive until minimum engagement and release-count thresholds are met. Public responses include ranking metadata only, not raw analytics counts.

The private `/ops/analytics/` dashboard queries aggregate Analytics Engine data server-side for 24-hour, 7-day and 30-day views. Its operations key is exchanged for an HttpOnly, Secure, SameSite=Strict session cookie; neither the dashboard key nor the Cloudflare analytics token is exposed to browser JavaScript after login.

### Analytics production configuration

The Cloudflare Pages production environment needs:

- `CF_ACCOUNT_ID` — the 32-character Cloudflare account ID
- `CF_ANALYTICS_READ_TOKEN` — secret Cloudflare API token with `Account | Account Analytics | Read`
- `ANALYTICS_DASHBOARD_KEY` — private random operations key, at least 16 characters; use a long generated value

Do not commit these values. Configure them as Cloudflare Pages production variables/secrets. The existing `ANALYTICS` binding continues to handle event writes; the read token is used only by server-side aggregate query endpoints.

## Deployment

The site is deployed through Cloudflare Pages from the repository's default branch. Cloudflare Pages compiles `functions/` as server-side Pages Functions. `.worker/` is not a public asset and should not be hand-edited as the production function source.

## Local preview

Serve the repository root with any static web server. Cloudflare Pages Functions require the Wrangler development server for full API testing. Analytics Engine read endpoints also require the production-style environment variables listed above.
