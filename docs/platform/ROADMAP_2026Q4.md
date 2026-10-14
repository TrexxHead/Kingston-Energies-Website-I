# Roadmap — Q4 2026 (owner-approved order, 14 Oct 2026)

The to-do list for the next wave. Each item lists the goal, the build steps, where its data comes from, what blocks it (and who unblocks it), and how we'll know it works. Where something is blocked we **build the structure first** and finish when the blocker is cleared — never filling the gap with invented numbers. Status lives here and in `IMPLEMENTATION_CHECKLIST.md`.

Legend: ✅ done · 🟡 built, waiting on a blocker · ⏳ in progress · ⬜ not started · 🔒 needs the owner / a third party

---

## 0. Shared foundation

### R0 · Reference-data store (tariffs, fuel prices, shelters, lenders) ✅ built · 🟡 waiting on real records
- **Goal:** one place for the public numbers every calculator needs, each with a source, a date and a reviewer.
- **Build:** versioned records in `SiteSetting` (no migration) — `draft → approved → retired`; admin screen to enter, review and retire; public API returns only approved, in-effect records.
- **Data:** entered by staff from the published source (JPS/OUR tariff schedule, Petrojam weekly prices, ODPEM shelter list, lender pages).
- **Blocker 🔒:** someone to enter the current JPS tariff and this week’s Petrojam prices from the official documents.
- **Done when:** a calculator refuses to price without an approved record, and prices correctly once one exists (tests with a synthetic tariff).

---

## 1. Priority features

### P1 · Rooftop solar estimator ✅ built (`/solar`) · 🟡 verify PVGIS from the preview; savings appear once a tariff is approved
- **Goal:** anyone taps their roof on the Jamaica map and gets usable area, panel count, yearly/monthly output and bill savings — and can request a quote.
- **Build:**
  1. `/solar` page on the self-hosted map; tap a building (1.5 M outlines) or draw an outline.
  2. Roof maths: footprint area (geodesic), roof type (flat / pitched), usable fraction, setbacks, panel size and wattage → kWp. All assumptions shown and editable.
  3. Solar yield from **PVGIS** (EU JRC, free, covers Jamaica via NSRDB) through a cached server route; tilt/azimuth from the visitor; losses shown. If PVGIS can’t be reached, say so — no fallback number.
  4. Savings at the **approved tariff** (marginal, not average) against the visitor’s usage (typed in or from My Energy); refuse savings without an approved tariff.
  5. “Get a quote” → `Lead` with the estimate attached; admin sees it in leads.
  6. Bump `CALC_ENGINE_VERSION`.
- **Blockers:** PVGIS reachable from Vercel (can’t be tested from the dev container — verify on preview); tariff (R0) for savings.
- **Done when:** unit tests for area/kWp/savings; PVGIS parsing tested on the documented response shape; browser flow on a real Kingston roof.

### P2 · Bill Explainer ✅ built (`/bill-explainer`) · 🟡 tariff comparison + marginal cost appear once a tariff is approved; photo upload waits on an extraction provider
- **Goal:** “Why is my bill this high?” — a clear breakdown, what changed since last month, and what one fewer kWh is really worth.
- **Build:** bill entry form (period, kWh, reading type, line items); comparison of two bills using `lib/energy/engine/bills.ts` (period / consumption / price / fixed effects); priced breakdown and marginal saving with the approved tariff; save to My Energy; upload-a-photo structure for later.
- **Blockers:** tariff (R0) for the “what each kWh costs” part; 🔒 document-extraction provider for photo upload.
- **Done when:** effects sum exactly to the change; estimated readings flagged; works without a tariff (comparison only).

### P3 · EV vs petrol cost calculator ✅ built (`/ev-costs`) · 🟡 pre-fills once pump prices / tariff / operator prices are approved
- **Goal:** the first question every EV buyer asks — what will it cost me to run versus petrol?
- **Build:** `/ev-costs`: distance per week, petrol car L/100 km, EV kWh/100 km (entered, with ranges), share of home vs public charging, public price; annual cost both ways, difference and break-even on a price premium; all assumptions visible.
- **Data:** Petrojam weekly prices and JPS tariff via R0; public charging price entered by staff per operator.
- **Blockers:** R0 records.
- **Done when:** tests on the maths; refuses without approved prices; ranges shown, not single-point claims.

### P4 · Hurricane & outage readiness hub ✅ built (`/storm-ready`) · 🟡 verify NHC from the preview; shelters appear once an ODPEM list is approved
- **Goal:** the page people return to every season — active storms, shelters, “how long will my backup last?”, and a checklist.
- **Build:**
  1. `/storm-ready`: active Atlantic systems from the **US National Hurricane Center** public feed (public domain), cached server-side, with distance to Jamaica; link to the official Met Service bulletin.
  2. Shelters on the Kingston map from the ODPEM list (entered via R0).
  3. Backup runtime calculator using the visitor’s My Energy devices + a battery/power station (engine `battery.ts`), with ranges.
  4. Preparedness checklist (charge, fuel, generator safety, after-storm electrical safety); saved progress in the browser.
- **Blockers 🔒:** Met Service / ODPEM feed terms (link out until agreed); ODPEM shelter list entry.
- **Done when:** NHC parser tested on the documented feed; runtime refuses unknown loads rather than guessing.

---

## 2. Improvements to what exists

### M1 · One-tap driver reports ✅ built
Station card: “I charged here” / “It’s not working” → moderated community report → admin re-check prompt. Never changes public status by itself.

### M2 · Staff status reminders ✅ built · 🟡 e-mails send once the e-mail provider (EMAIL_API_KEY / EMAIL_FROM) is set in Vercel
Daily cron e-mails admins the stations whose “working” check expires within 24 h, and faults older than 7 days. Uses the existing e-mail provider; logs when unconfigured.

### M3 · Station pages for search ✅ built (`/energy-map/station/[slug]`) · 🟡 photos field not built yet (needs staff photos + consent policy)
`/energy-map/station/[slug]` with status, connectors, hours, nearby food/shops (self-hosted POIs), directions; schema.org markup; sitemap. Photos and prices fields (staff-entered).

### M4 · Product compatibility check ⬜
“Will this power station run my devices for 8 hours?” — verified catalogue specs × My Energy devices via the scenario engine. 🔒 product datasheets + second admin for verification.

### M5 · Measurement entry ⬜
Smart-plug / meter readings per device upgrade the evidence basis from assumed to measured.

---

## 3. Wider reach

### W1 · Net billing guide + tracker ⬜ — step-by-step with JPS/OUR references; customer’s own checklist of stages (no claim to know JPS’s internal status).
### W2 · Financing calculator ⬜ — repayment maths; lender list as reference data (rates entered from lender pages with date); no partnership claims.
### W3 · Business & farm tools ⬜ — commercial bill analysis (needs commercial tariff in R0), solar water-pump sizing, generator fuel & runtime.
### W4 · Verified installer directory ⬜ — listing requires licence evidence (Government Electrical Inspectorate) recorded and verified by staff.
### W5 · Bookings & deposits ⬜ — installation visits / audits / charger installs with Fygaro deposits (backlog C01–C03). 🔒 live Fygaro test payment.
### W6 · WhatsApp channel 🔒 — structure for alerts/support; needs a WhatsApp Business API provider and approved templates.

---

## 4. Larger projects

### L1 · Trip planner 🔒 — route + charge stops + elevation-aware energy. Needs a routing engine (self-hosted OSRM/Valhalla on the Jamaica extract, or Google Routes). Build the planner UI/energy model first.
### L2 · Satellite view ⬜ — cloud-free Sentinel-2 mosaic of Jamaica as self-hosted raster tiles.
### L3 · Operator live status 🔒 — OCPI/partner adapter structure now; needs owner authorisation to contact JPS Charge ’n Go and Evergo.

---

## Owner action list (unblocks the most)
1. Enter the current **JPS residential tariff** (and commercial, for W3) and **this week’s Petrojam prices** in Admin → Reference data.
2. Approve contacting **JPS / Evergo** (live status) and **Met Service / ODPEM** (feeds, shelters) — and name the sender.
3. Provide **product datasheets** and a **second admin** (catalogue verification).
4. Choose a **document-extraction provider** (bill photos) and a **WhatsApp Business** provider.
5. Run a **live Fygaro test payment**.
