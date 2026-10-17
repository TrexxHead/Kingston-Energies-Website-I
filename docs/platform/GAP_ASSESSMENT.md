# Existing-site audit and gap assessment (backlog F01)

Audited 12 October 2026 against `Kingston_Energies_Website_Execution_Plan.md`. Repository: `trexxhead/kingston-energies-website-i`, branch `main` at `eb2353e`.

## 1. Platform

| Area | What exists | Assessment |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript, inline-style design system (`app/_design-system/tokens.css`) plus Tailwind/shadcn for admin | Custom code → **extend in place** (plan §7). No reason to migrate. |
| Hosting | Vercel (cron in `vercel.json`), Supabase Postgres via Prisma 5 (`DATABASE_URL` pooled + `DIRECT_URL`) | Fine. No migrations folder — schema changes ship with `prisma db push`. Recommend moving to `prisma migrate` before production data grows (see checklist Q02). |
| Auth | NextAuth 4: credentials (email verification required) + Google OAuth. Roles `USER / ADMIN / SUPER_ADMIN`. Middleware guards `/admin/dashboard`. | Works. No household/business memberships or invited members (F02 gap). |
| Storage | Supabase Storage: private `admin-files`, public `product-images`, signed URLs | Reusable for bill/proposal/label uploads (E01, F05). |
| Payments | Admin-configurable methods (bank, Lynk, PayPal link, COD) + WiPay and Fygaro hosted gateways with signed webhooks | Exists for product orders. Fygaro webhook field names are unconfirmed against a live payload (noted in `lib/fygaro.ts`). No service bookings, deposits or digital entitlements (C01–C05 gap). |
| Email | Resend (falls back to console) | Reusable for A01. |
| AI | Anthropic SDK — "Jordyn"/"Camille" assistant (`/api/chat`) | Exists as a chat helper, not a grounded tool-calling adviser (A02). |
| Analytics | GA4 behind cookie consent; web vitals | Plan §8 events not yet instrumented. |
| Security | CSP + hardening headers (`next.config.js`), rate limiting (Upstash or in-memory), RLS deny-all script, prior security review docs | Good baseline. CSP blocks `eval`, so `next dev` cannot hydrate client JS — use `next build && next start` for staging/browser testing. |
| Tests | Vitest, 60 files / 371 tests passing at audit time | Strong for pure libs; no browser E2E suite in repo. |
| Staging | None defined. Only local dev and (presumed) production Vercel | **Gap** — see EXTERNAL_SETUP.md §1. |

## 2. Planned features vs. what exists

Legend: ✅ exists and reusable · 🟡 exists, needs improvement · ⛔ must be built

| Plan item | Existing implementation | Status | Notes |
|---|---|---|---|
| Shared energy profile (§3) | Energy Checkup stores `EnergyCheckup` rows (sparse `rows` JSON keyed by library appliance id). Storm-prep profile, family plan, my-resources, checklist are **browser-local only**. Registered devices (`ProductUnit`) give a backup reserve signal. | 🟡→ built in M1 | No properties, no per-device evidence basis, no reuse between tools. M1 adds `EnergyProperty/EnergyDevice/EnergyScenario/CalculationRun`. Checkup and Storm Prep still need migrating onto it (E02, R01). |
| Calculation engine (§3) | `lib/energyCheckup/*` — careful, documented, tested: per-appliance kWh, calibration, reference rate, savings range, outage cost, solar orientation, backup runtime/surge/continuous checks, duty cycle, outage depletion | 🟡→ built in M1 | Good principles (refuses to invent specs). Gaps vs plan: AC modelled as fixed watts by type (no BTU/EER input path); single `REFERENCE_RATE` (J$52/kWh "reviewed 2026-07") used as average cost; savings as a % of bill; `outageCost` uses revenue × heuristic factor (plan §4.8 requires contribution margin); fridge age multiplier; no versioning or input snapshots; no evidence basis on results. M1 adds the versioned engine `lib/energy/engine`. |
| Verified SKU catalogue (§3) | `lib/catalog.ts` (15 storefront items) overlaid by admin `Product` rows (price, stock, specs JSON) | ⛔→ foundation in M1 | No exact manufacturer models for several listings (e.g. "Anker Power Station" with "60,000mAh", 87 W), no evidence sources, no verification, no voltage/frequency/surge/waveform. `capacityWh()` assumes 3.7 V. M1 adds `CatalogueSku/SpecEvidence` + publish gate; storefront values are recorded only as unverified listing claims. |
| Energy Checkup (§4.1) | `/hub/energy-checkup` — quick wizard, home/business, bill calibration, results, PDF-like report, consult form, lead capture | 🟡 | Keep. Migrate to engine + profile (E02); add billing-period reconciliation, scenarios, measured imports. |
| Bill Explainer (§4.2) | `lib/ocr` (document scan used by admin finance); Checkup bill step takes kWh + J$ | ⛔ | Engine `compareBills()` built in M1; UI, upload, extraction confirmation pending (E01). |
| Find My Power / Backup (§4.3) | `/find-my-power` — 4-option need picker → category; `/hub/storm-prep/build-my-system` — 3 fixed tiers from catalog | 🟡 | Not load-based. `/my-energy` + Backup Match (M1) is the replacement path; retire tiers once the catalogue has verified SKUs (E03). |
| Compatibility & protection (§4.4) | Appliance label helper (`storm-prep/appliance-label`), brownout page | 🟡 | Full-chain matching to build (E03). |
| Cooling planner (§4.5) | — | ⛔ | E04. Engine cooling model (input W / BTU÷EER) in M1. |
| Keep/Repair/Replace (§4.6) | — | ⛔ | E05. |
| Storm & Outage Centre (§4.7) | Extensive `/hub/storm-prep`: phases, setup, checklist, family plan, my resources, directory, command centre, outage simulation, scenarios, generator, solar, recover, offline card + service worker | 🟡 | Strong base. Gaps: browser-only storage, no official-feed handling with issue/valid/retrieval times, no sync/conflict resolution (R01). |
| Business continuity (§4.8) | `/business-power-continuity` marketing page → checkup | 🟡 | Loss model must change to contribution margin (R02). |
| Solar Readiness (§4.9) | `/hub/storm-prep/solar`, checkup solar orientation | 🟡 | Passport, vault, handoff to build (R03). |
| Quote Comparison (§4.10) | — | ⛔ | R04. |
| Guided adviser (§4.11) | Jordyn/Camille chat | 🟡 | Rebuild on engine tools after catalogue is verified (A02). |
| Services & bookings (§5) | `/services` page, quote requests → Lead → Order conversion, quotations, PO invoicing | 🟡 | No service definitions, capacity, bookings, work orders, deposits (C01–C04). |
| E-books (§5) | — | ⛔ | C05. |
| Jamaica Energy Map (§6) | — | ⛔→ foundation in M1 | Registry schema, status/freshness logic, Places adapter, APIs, `/energy-map` page built. Blocked on Google credentials (M01) and source rights (M02). |
| Admin & audit (F06) | Large admin dashboard (orders, CRM, finance ledger, HR, marketing, logs/activity trail) | 🟡 | Activity log reused for catalogue actions. Review-queue UIs for catalogue, map moderation still to build. |

## 3. Issues found during the audit (outside M1 scope unless noted)

1. **Product specs are not exact-SKU evidence.** The storefront's "Anker Power Station" has no model number; "60,000mAh" without a voltage is not an energy figure; the 87 W output is unverified. Any backup recommendation built on it is unsafe until verified (now enforced by the F05 gate).
2. **`/find-my-power` and Build-My-System tiers recommend products by category, not load.** They stay live (preserving functionality) but should be replaced by the profile + Backup Match journey once verified SKUs exist.
3. **Login ignored return paths.** Fixed in M1 (safe same-site `callbackUrl`).
4. **`Permissions-Policy: geolocation=()` site-wide** would have broken "Nearby" silently. M1 scopes `geolocation=(self)` and the Maps CSP to `/energy-map` only.
5. **`next dev` cannot hydrate under the CSP** (webpack eval). Pre-existing; affects anyone testing locally. Use a production build for browser testing.
6. **No schema migration history** (`db push` only) — risky for production data (Q02).
7. `REFERENCE_RATE` and the outage-cost heuristic should not be presented as tariff-accurate or profit-accurate figures (E02/R02).
