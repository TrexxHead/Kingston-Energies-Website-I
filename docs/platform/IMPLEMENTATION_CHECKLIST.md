# Kingston Energies platform — implementation checklist

**This is the source of truth across sessions.** Update it in the same commit as the work. Spec: *Kingston Energies Website Execution Plan* (12 Oct 2026) — full scope retained; priority = dependency order only.

Related: [GAP_ASSESSMENT.md](./GAP_ASSESSMENT.md) (F01 audit) · [EXTERNAL_SETUP.md](./EXTERNAL_SETUP.md) (accounts, credentials, data agreements)

Status: ✅ done · 🟢 foundation done, more to build · 🟡 in progress · ⛔ not started · 🔒 blocked on external input

## Milestones

| Milestone | Scope | State |
|---|---|---|
| M1 (12 Oct 2026) | F01 audit, F03 profile, F04 engine, F05 evidence gate, M03/M04/M05 map foundation | Done in staging (local). **Not deployed to production.** |
| M2 (next) | F06 admin review UIs (catalogue evidence, map moderation, station registry editor), E02 checkup on engine, E03 compatibility chain, E01 bill explainer UI, approved tariff entry | Planned |

## Backlog

| ID | Work package | Depends on | Status | Done so far / evidence | Outstanding |
|---|---|---|---|---|---|
| F01 | Existing-site audit and staging | Access | 🟢 | Audit in GAP_ASSESSMENT.md. Local staging: Postgres 16 + `next build && next start`. | Hosted staging (separate Supabase + Vercel preview) — owner action, EXTERNAL_SETUP §1. Move to `prisma migrate`. |
| F02 | Identity, household/business permissions | F01 | ⛔ | Profile rows are scoped per user; cross-user delete returns 404 (e2e). | `organisation`, `membership`, invites, roles, isolation tests. |
| F03 | Energy profile and evidence model | F01 | 🟢 | Prisma: `EnergyProperty`, `EnergyDevice` (engine `LoadModel` JSON with evidence basis per number), `DeviceMeasurement`, `EnergyScenario`, `ScenarioItem` (unique per scenario+device), `CalculationRun`. Contract `lib/energy/profileSchema.ts`; browser store `lib/energy/localProfile.ts`; DB store `lib/energy/profileStore.server.ts`. APIs: `GET/PUT /api/energy/profile`, `POST /api/energy/profile/merge`, `DELETE /api/energy/properties/:clientId`. UI `/my-energy`. | Acceptance "one appliance reused across **three** tools": profile feeds scenarios + Backup Match today; Energy Checkup (E02), Storm Centre (R01) and Solar Passport (R03) must read it. Measurement entry UI. Retention policy doc for deletion of runs. |
| F04 | Calculation engine and versions | F03 | 🟢 | `lib/energy/engine` v1.0.0: loads (steady / cycling / measured / cooling via input W or BTU÷EER), battery runtime (capacity basis, usable fraction, inverter loss, idle, reserve, derates), continuous + surge checks, recharge, bill comparison (period/consumption/price/fixed decomposition, arrears separate), tariff records with marginal vs average cost, scenario aggregation (nameplate vs simultaneous vs startup peak vs energy), immutable runs with input hash. 38 golden/edge tests. | Technical review screen + adviser correction creating superseding runs. Approved real `TariffVersion` (needs official schedule). EV energy/cost/duration functions (M07). Business loss model (R02). Migrate legacy `lib/energyCheckup` maths. Independent review of engine policy values by a qualified energy reviewer. |
| F05 | Verified SKU catalogue | Supplier docs | 🟢 🔒 | `CatalogueSku`, `SpecEvidence`; `lib/catalogue/evidence.ts` (critical fields per product kind, verified / claimed / expired / conflicting / unknown); publish gate; `lib/catalogue/backupMatch.ts`. Admin APIs: list, sync storefront stubs, add evidence, review (two-person rule, listing claims can't be verified), publish (409 until critical fields verified). 15 storefront SKUs synced in staging as drafts with listing claims only. | **Blocked:** exact model numbers + datasheets for every stocked SKU, and a second admin to verify. Admin UI (F06). Link to stock / landed cost / lead time. Document upload to private storage. |
| F06 | Admin and audit history | F02 F03 | 🟡 | Catalogue actions write to existing ActivityLog. | Review-queue UIs: catalogue evidence, map reports, station registry editor, coverage reviews, run corrections. |
| E01 | Bill extraction and explanation | F03 F04 | 🟡 | Engine: `summariseBill`, `compareBills`, `reconcileWithBill` with tests (arrears, estimated readings, bill-specific periods). | Upload, extraction with field confidence, confirmation UI, review queue, paid review handoff. |
| E02 | Expanded energy checkup | F03 F04 | ⛔ | Existing `/hub/energy-checkup` preserved untouched. | Rebuild calculations on engine + profile; billing-period reconciliation; scenarios; measured imports; before/after. |
| E03 | Runtime and compatibility | F04 F05 | 🟢 | Backup Match: continuous, surge (+duration), runtime vs target, 110–120 V, 50 Hz vs 60 Hz-only, waveform, scenario completeness → pass / fail / needs_review; never pass on unverified evidence. Shown in `/my-energy`. | Full chain (mains → charger → cable → device), USB-PD, connectors, accessory kits, bundles, sourcing brief workflow, trial/setup booking. |
| E04 | Cooling planner | F04 E02 | ⛔ | Engine cooling model refuses BTU-only input. | Planner UI and scenarios. |
| E05 | Replacement comparison | F04 F05 | ⛔ | | |
| C01 | Quote and booking engine | F02 F05 | ⛔ | Existing quote → order conversion retained. | Service definitions, capacity, idempotent booking + payment. |
| C02 | Service work orders and capacity | C01 F06 | ⛔ | | |
| C03 | Deposits, rentals, trials | C01 C02 | ⛔ | | |
| C04 | Corporate, event, rental, family workflows | C02 C03 | ⛔ | | |
| C05 | E-book entitlements and downloads | C01 | ⛔ | | |
| R01 | Storm plan and official sources | F03 | ⛔ | Existing storm-prep hub preserved. | Move browser-only data to profile with sync/conflicts; official feed with issue/valid/retrieved times (feed rights 🔒). |
| R02 | Business continuity | F03 F04 C02 | ⛔ | | Contribution-margin loss model; replace `outageCost` heuristic. |
| R03 | Solar passport | F03 C02 | ⛔ | | |
| R04 | Proposal comparison | E01 F04 R03 | ⛔ | | |
| M01 | Google account and field capability test | Billing/access | 🔒 | Adapter `lib/map/googlePlaces.ts` (field mask, Jamaica clamp, transient, attribution) tested with mocked fetch. | **Blocked:** Google Cloud project, billing, two restricted keys (EXTERNAL_SETUP §2). Then run the Jamaica coverage report. |
| M02 | Source rights and operator acquisition | Authorised outreach | 🔒 | `EvSourceRecord` stores source, licence, scope, dates. | **Blocked:** your authorisation + sender for JPS / Evergo / Open Charge Map outreach. |
| M03 | Station registry and reconciliation | M02 F06 | 🟢 | Schema: `EvOperator`, `EvStation` (googlePlaceId cross-ref only), `EvConnectorGroup` (groups ≠ ports), `EvSourceRecord`, `EvStatusObservation`, `EvCommunityReport`, `MapCoverageReview`. Registry is empty — no stations invented. | Registry editor, dedupe/merge-split, conflicting evidence handling, coverage reviews per parish, operator feed imports. |
| M04 | Interactive map and discovery | M01 | 🟢 🔒 | `/energy-map`: list-first (works without map), filters (unknown kept), coverage panel, parish coverage, Nearby on demand (denial handled), directions handoff, reports, Google map + "Search this area" when key exists, separate Google results with attribution and cap note. Scoped CSP + geolocation policy. Tested at 375 px. `GET /api/map/stations`, `POST /api/map/discover` (503 when unconfigured; per-IP + daily caps). | Live Google test (🔒 M01); marker clustering; synchronised list↔marker highlight polish;  |
| M05 | Live status adapter and freshness | M01 M02 M03 | 🟢 | `lib/map/status.ts`: six display states; observation vs retrieval time; missing counts stay unknown; zero ≠ in use; per-source freshness policy (to validate); moderated community evidence never overrides provider status; station summary names the connector group. 16 tests. | Operator feed adapters (🔒 M02); validate freshness windows per provider. |
| M06 | Community and operator portal | F02 M03 | 🟡 | `POST /api/map/reports` (pending moderation, rate limited, Jamaica bounds). | Moderation UI, operator claims with verification. |
| M07 | Vehicle and trip planning | M04 M05 F04 | ⛔ | | Routes API (🔒 key), vehicle profiles, battery-aware stops. |
| A01 | Notifications and follow-ups | Consent C02 | ⛔ | | |
| A02 | Guided adviser | F04 F05 E01–R04 | ⛔ | | |
| Q01 | Accessibility, performance, security | Each module | 🟡 | New pages: labelled controls, status words + icons (not colour alone), aria-live results, no horizontal scroll at 375 px, no console errors (Playwright). | Full WCAG audit; keyboard pass on map markers once live. |
| Q02 | Monitoring, backup, restoration | Platform | ⛔ | | Migrations, restore drill, alerts. |

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-12 | Extend the existing Next.js/Prisma app; no companion app or second customer database. | Custom code, already authenticated and deployed (plan §7). |
| 2026-10-12 | New engine lives in `lib/energy/engine`; legacy `lib/energyCheckup` left intact until E02 migrates the Checkup. | Preserve working functionality and its calibrated tests. |
| 2026-10-12 | Device load stored as validated JSON (`EnergyDevice.load`) rather than many nullable columns. | The engine's load models are a discriminated union; zod validates on every write. |
| 2026-10-12 | Anonymous profile merges on sign-in by clientId, then by property name+kind and device fingerprint (key-order-independent). | Acceptance: merge without duplicating equipment. |
| 2026-10-12 | Calculation runs are immutable and cascade-deleted with their property. | Explainability + customer-initiated deletion removes private input snapshots. Revisit with formal retention policy. |
| 2026-10-12 | Engine policy values (basis uncertainty ±5/15/25/40 %, 80 % continuous margin, assumed usable fraction 0.85, inverter efficiency 0.85, AC load fraction 0.75) are versioned engine policy, shown as assumptions. | Plan requires visible assumptions; values need qualified review. |
| 2026-10-12 | Jamaica grid treated as 110 V / 50 Hz; 60 Hz-only inverters → needs review, 230 V → fail. | JPS supply characteristics; confirm wording with electrical reviewer. |
| 2026-10-12 | Storefront specs imported only as `listing_claim`; listing claims can never be verified; verification needs a document and a second person. | No invented or unverified specs in recommendations. |
| 2026-10-12 | Map registry starts empty; Google results shown transiently and separately. | No simulated stations; publication rights not yet established. |
| 2026-10-12 | `/my-energy` and `/energy-map` linked from the top menu, footer and hub Tools sidebar (PR preview). | Owner could not find the pages in the preview. Production still requires explicit approval to merge. |
| 2026-10-12 | Login honours same-site `callbackUrl`. | Return customers to `/my-energy` after sign-in to complete the merge journey. |

## Verification record

**M1 (12 Oct 2026)**
- Unit: `npx vitest run` → 64 files, 446 tests pass (371 pre-existing + 75 new: `energyEngine`, `catalogueEvidence`, `mapStatus`, `energyProfile`). `npx tsc --noEmit` clean. `next build` succeeds.
- API e2e against local staging DB (34 checks, all pass): anonymous calc; BTU-only AC kept unresolved and startup peak unknown; anonymous save 401; merge twice → no duplicates; identical device from another browser not duplicated; saved run carries version + snapshot; device removal prunes scenario; property delete cascades devices + runs; cross-user delete 404; admin-only catalogue; storefront sync idempotent; listing claim can't be verified; recorder can't verify own evidence; publish refused with blocking fields; storefront station match is not a pass; map has 14 unreviewed parishes and zero invented stations; discover 503 when unconfigured; reports stored pending.
- Browser e2e (Playwright, production build, 15 checks, all pass): anonymous add devices → results → refresh survives → product check never confidently passes → sign in via `callbackUrl` → merge message, equipment visible, browser copy cleared → map honesty states → missing-charger report via UI → 375 px no horizontal scroll → no page errors.
- Bugs found and fixed by these tests: unresolved motor load hid an unknown startup peak; JSONB key reordering defeated duplicate detection; reports dated "today" were sent as noon (future) and rejected.

## How to run locally (staging-like)

```bash
service postgresql start   # or any Postgres 14+
# .env.local: DATABASE_URL / DIRECT_URL to a throwaway DB, NEXTAUTH_SECRET, NEXTAUTH_URL
npx prisma db push && node prisma/seed.js
npx next build && npx next start     # next dev can't hydrate under the site CSP
npx vitest run
```
