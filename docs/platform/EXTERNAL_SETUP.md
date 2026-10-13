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

## 2a. Kingston Energies map (OpenStreetMap — no account needed)

The default tab on `/energy-map`. Nothing to sign up for.
- Street detail: OpenStreetMap vector tiles from **OpenFreeMap** (free, no key, no usage agreement). To self-host or switch provider later, set `NEXT_PUBLIC_OPEN_MAP_TILES_URL` (TileJSON, OpenMapTiles schema) and `NEXT_PUBLIC_OPEN_MAP_GLYPHS_URL` (fonts), then redeploy — the map page CSP picks the hosts up automatically. `off` shows only our own layers.
- Terrain (hill shading, 3D): AWS Terrain Tiles (open data, no key); `NEXT_PUBLIC_OPEN_MAP_TERRAIN_URL` to swap, `off` for flat.
- Parish boundaries and the coastline mask are self-hosted (`public/maps/`).
- Licence: OpenStreetMap data is ODbL — keep "© OpenStreetMap contributors" visible (built in). Missing roads/places can be added at openstreetmap.org from your own knowledge or site visits — **never copied from Google Maps**.

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
