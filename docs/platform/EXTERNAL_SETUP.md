# External services: what we need, and from whom

Nothing here has been set up or requested on anyone's behalf. Secrets go into Vercel / environment settings — **never** into chat, issues or commits.

## 1. Staging environment (needed now)

There is no hosted staging today. M1 was verified against a local Postgres 16 database and a production build (`next build && next start`) in the development container.

To get a shareable staging site:

| Item | Who | Steps |
|---|---|---|
| Separate Supabase project (`kingston-energies-staging`) | Owner | New project → copy pooled (6543, `?pgbouncer=true`) and direct (5432) strings. Never point staging at production data. |
| Vercel preview/staging environment | Owner | Vercel → Project → Settings → Environment Variables → set the staging values for the **Preview** environment (or create a `staging` branch with its own domain, e.g. `staging.kingstonenergies.com`). |
| Schema | Engineer | `DATABASE_URL=… DIRECT_URL=… npx prisma db push` against staging, then run `prisma/enable-rls.sql` in the staging SQL editor. |
| Separate Google keys for staging | Owner | See §2 — referrer restriction for the staging domain. |

## 2a. Kingston Energies map (self-hosted — no account needed)

The default tab on `/energy-map`. Nothing to sign up for and no keys: every file is served from this site (`public/maps/`).
- Data: Overture Maps Foundation (OpenStreetMap-derived roads, water, land use, places, buildings — ODbL; Overture places — CDLA-Permissive-2.0) and AWS Terrain Tiles for elevation. Attribution is shown on the map and must stay.
- Refreshing the data: `scripts/map-data/README.md` (a few minutes; bump the versioned file names in `lib/map/mapData.ts`).
- Missing roads/places can be added at openstreetmap.org from your own knowledge or site visits — **never copied from Google Maps** — and appear after the next data refresh.

## 2b. Public data feeds (no account, no key)
- **PVGIS** (EU JRC) — `/api/solar/yield`; **NHC CurrentStorms.json** (NOAA, public domain) — `/api/storm/active`. Both are called from the server and cached. Neither can be reached from the dev container, so after each deploy open `/solar` (tap a roof) and `/storm-ready` on the preview to confirm they answer. If either is down the page says so — there is no fallback number. `PVGIS_BASE_URL` / `NHC_BASE_URL` exist only for local stand-ins; never set them in Vercel.

## 2c. Bookings, installers, WhatsApp (new tables + optional keys)
- **Schema:** this release adds `ServiceBooking` and `Installer`. Run `npx prisma db push` against staging, then production, before those pages are used (additive — no existing data changes).
- **Bookings:** Admin → Bookings → add services (name, how you quote the price, deposit J$), visits per morning/afternoon, closed days and deposit terms. Nothing is bookable until you do. Online deposits use the existing Fygaro settings (`FYGARO_LINK_URL`, `FYGARO_WEBHOOK_SECRET`); make one live test payment and check the webhook log, as noted in `lib/fygaro.ts`.
- **WhatsApp:** `NEXT_PUBLIC_WHATSAPP_NUMBER` (your WhatsApp Business number) shows “Chat on WhatsApp”. Automatic booking messages also need Meta WhatsApp Cloud API access — `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` — and an approved template whose name goes in `WHATSAPP_TEMPLATE_BOOKING` (body with four variables: name, service, date/time, reference). Messages go only to customers who tick the opt-in.

## 2d. Operator live status (OCPI) — after an agreement
- Once JPS Charge ’n Go / Evergo agree to share status, ask for **OCPI 2.2.1 Locations** access (a URL and a token). Put them in Vercel as `OCPI_FEEDS` = `[{"operator":"Evergo","url":"https://…/ocpi/2.2.1/locations","token":"…"}]` (operator name exactly as on our stations).
- For each station, enter the operator’s location id in Admin → Energy Map → station → “Operator location id”.
- Status is fetched live (≈1 min cache) and not stored. Check the agreement allows display on our site.
- **Live prices:** also ask for the **OCPI 2.2.1 Tariffs** module and add its URL to the same entry as `"tariffsUrl":"https://…/ocpi/2.2.1/tariffs"`. JMD tariffs then show on the map as “Live from <operator>’s system” (≈1 h cache), ahead of any price entered by hand. Tariffs that depend on charging power, energy or duration are left out and flagged.

## 2d-2. Price sheets (automatic price sync) — no account needed
- Make a Google Sheet with one tab per kind (fuel prices, public charging prices, lender offers, solar installed price, JPS fuel & IPP rate). Admin → Reference data → **Automatic price sync** → “Column headings for each tab” gives the header row to paste into each tab.
- Publish each tab: File → Share → **Publish to web** → choose the tab → **Comma-separated values (.csv)** → Publish. Paste each link into the panel and Save. Only `docs.google.com` / `googleusercontent.com` links are accepted.
- Every row needs `source_title` (where you read the price). The daily job runs at 6 am Jamaica time (Vercel Cron → `/api/cron/price-sync`, needs `CRON_SECRET`, already set for the other crons). **Sync now** runs it at once.
- Changed prices arrive as **drafts** to approve. Tick **auto-approve** only for a sheet you alone edit; auto-approved prices retire the version they replace.
- Note: anyone with the published link can read the sheet. Don’t put anything private in it.

## 2d-3. Bill photo reading (Anthropic)
- Uses the same `ANTHROPIC_API_KEY` as the chat assistant (set it for Preview too). Optional `BILL_READ_DAILY_CAP` (default 300 reads/day across the site) bounds cost.
- Bill photos/PDFs are sent to Anthropic to be read and are not stored by us; the page says so. Review Anthropic’s data-retention terms for your account.

## 2e. Road routing for the trip planner
- `/trip-planner` needs an OSRM-compatible routing server: `OSRM_BASE_URL`. Recommended: self-host OSRM on the Jamaica OpenStreetMap extract (small — a basic VPS is enough); the public OSRM demo server is not for production use. Until set, the page is unlisted and says planning isn’t on yet. When it’s live, add it to the footer and sitemap.

## 2f. Apple Maps satellite imagery (solar estimator) — recommended
Apple’s aerial imagery over Kingston is sharper and cleaner than Google’s, so the rooftop estimator uses it first when set up (Google stays as the fallback, and visitors can switch between them).
1. An **Apple Developer Program** membership (US$99/year) — developer.apple.com.
2. developer.apple.com/account → **Certificates, IDs & Profiles → Services → Maps → Configure → Tokens → (+)**. Token type **MapKit JS**, restriction **Domain**, validity **No expiration** (or a long period), websites: `kingstonenergies.com, www.kingstonenergies.com, *.vercel.app` (add the staging domain).
3. Vercel → Environment Variables (Production **and** Preview): `NEXT_PUBLIC_MAPKIT_TOKEN` = the token. Redeploy (it is read at build time).
- The token is meant to be public — its domain restriction is what protects it. MapKit JS includes a large free daily allowance; usage shows in the Maps dashboard.
- The site’s security policy already allows Apple’s map domains on `/solar` only.
- Labels, points of interest and rotation are off; the view is straight down and north-up, as panels are planned.

## 2. Google Maps Platform (Energy Map — M01, M04)

**Account**
1. Google Cloud project, e.g. `kingston-energies-maps`, owned by a company Google account (not a personal one).
2. **Billing account attached** — Maps Platform requires billing even within free usage caps. Use a company card. Set **budget alerts** (Billing → Budgets) at e.g. US$50 / $150 / $300. Alerts do *not* cap spending; the app enforces its own limits (`MAP_DISCOVER_DAILY_CAP`, per-IP rate limits).
3. Accept the Google Maps Platform Terms of Service for the project.

**Quickest start — Maps Embed API (free).** Enable *Maps Embed API*, create a key restricted to **Websites** (your domain, the Vercel preview domain `*-trexxheads-projects.vercel.app/*`) and **Maps Embed API** only, and set it as `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` in Vercel (Preview first). Redeploy — `NEXT_PUBLIC_` values are read at build time. `/energy-map` then shows Google's own charging-station search for the island or chosen parish, plus a "Show map" for each verified station. It can't plot our markers, sync with the list or show live availability; those need the JavaScript and Places APIs below.

**APIs to enable for the full map** (APIs & Services → Library)
- Maps JavaScript API — interactive map.
- Places API (New) — user-initiated "Search this area" discovery, incl. `evChargeOptions`.
- Routes API — later, for trip planning (M07). Not needed yet.

**Credentials — two separate keys**

| Env var | Restrictions |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Application restriction: **Websites** → `https://kingstonenergies.com/*`, `https://www.kingstonenergies.com/*`, the staging domain, `http://localhost:3000/*` (staging key only). API restriction: **Maps JavaScript API** only. |
| `GOOGLE_MAPS_SERVER_KEY` | API restriction: **Places API (New)** (and later Routes API). Application restriction: none is reliable on Vercel's dynamic egress IPs, so keep it server-only (never `NEXT_PUBLIC_`), rotate if exposed. |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (optional) | Maps Management → create a JavaScript vector Map ID — enables Advanced Markers. |

Use **different keys for staging and production**.

**Permissions** — a person with *Project Owner* or *Editor* creates keys; the engineer needs only the key values set in Vercel. Nobody needs to share their Google login.

**Data and terms we must follow** (built into the code; confirm with current terms at go-live)
- Places content is processed transiently; only Place IDs may be stored (`EvStation.googlePlaceId`). No harvesting Google results into the registry.
- Google attribution stays visible wherever Google data is shown.
- `evChargeOptions` fields are coverage-dependent. **First task once keys exist:** run the Jamaica capability test (checklist M01) and record which Jamaican chargers return connector counts, availability and `availabilityLastUpdateTime`.

**Cost notes** — requesting `evChargeOptions` puts Text Search in a higher (Enterprise) pricing tier. The plan's illustration (20k map loads + 5k details + 3k searches ≈ US$250/month) is illustrative only; measure real usage in staging.

**CSP** — `/energy-map` alone uses Google's Maps JavaScript allowlist (`*.googleapis.com`, `*.gstatic.com`, `*.google.com`, `'unsafe-eval'`, `blob:`) plus the OpenStreetMap tile host. Every other page keeps the strict policy.

## 3. EV charging data sources (M02) — needs your authorisation to contact

| Source | What to request | Status |
|---|---|---|
| JPS Charge 'n Go | Partner API / licensed export / OCPI feed: site + EVSE IDs, coordinates, connector groups, power sharing, hours, tariffs, operational status with observation timestamps, update frequency, attribution, storage/history rights, deep links | Not contacted |
| Evergo | Same | Not contacted |
| Open Charge Map | API key + per-source licence check for Jamaican records | Not contacted |
| Dealerships, hotels, malls | Permission to publish location, access rules, contact | Not contacted |

The outreach brief in plan §6.7 is ready to send. **Please confirm who should send it and from which mailbox** — I will not contact operators without explicit authorisation.

## 4. Other services the backlog will need

| Service | For | Needed by |
|---|---|---|
| Official tariff schedule (JPS / OUR) — a reviewer to enter an approved `TariffVersion` | Bill explainer marginal costs (E01) | Milestone 2 |
| Manufacturer datasheets + supplier docs for every stocked SKU, and the exact model numbers | Verified catalogue (F05) | **Now** — the catalogue can't recommend anything until a second admin verifies critical fields |
| Second admin account for evidence verification (two-person rule) | F05 | Now |
| Meteorological Service / ODPEM — confirm feed availability and redistribution rights | Storm centre (R01) | Milestone 3 |
| Document extraction provider (or Anthropic with retention settings reviewed) | Bill / proposal extraction (E01, R04) | Milestone 2 |
| Payment gateway confirmation (live Fygaro test payment) | Service bookings, deposits (C01–C03) | Milestone 3 |
| Upstash Redis | Shared rate limits across serverless instances (important for map/discovery cost control) | Before map goes public |
