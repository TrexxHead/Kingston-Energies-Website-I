# Upgrade plan — November 2026

Inputs: a review of the current site, Tesla's product and solar pages as a reference for how to present energy products, and the owner's *Solar PV Installation — Master Learning Notebook* (Solar Coach Jamaica course, expanded and corrected, Nov 2026).

## 1. Where the site is today

Strong, careful tools that each answer one question:

| Tool | Answers | Gap |
|---|---|---|
| Rooftop solar estimator (`/solar`) | How much could my roof make? | Starts from the roof, not from the household. Doesn't size an inverter or a battery from real loads, doesn't explain losses, stops at a price range. |
| My Energy (`/my-energy`) | What do I run, and for how long would backup last? | Load data never flows into a system design. |
| Bill Explainer (`/bill-explainer`) | Why is my bill this amount? | Monthly kWh never seeds a design. |
| Financing (`/financing`) | What would the loan cost? | Reached by link only, not part of a purchase journey. |
| Storm-ready, Garage, Home charging, Map | Their own questions | Separate islands. |

Each tool is honest and evidence-based (unknown stays unknown). What's missing is **one journey** that turns a household into a system, a price and a booked survey, and then supports the customer after installation.

## 2. What to take from Tesla

Tesla doesn't make customers assemble a system from parts. The patterns worth borrowing:

1. **One configurator, one answer.** Address or bill in → a recommended system (panels, battery count) → price and monthly payment → order. Every choice updates a single summary.
2. **Tangible outcome first.** "Power your home for X hours in an outage", "Y% of your use from the sun". Specs come second, behind "details".
3. **A sticky summary.** Price, monthly payment, savings stay visible while the customer changes options.
4. **A visible process after the order.** Order → design → permits → install → turn on, tracked in the app.
5. **Restraint.** One message per screen, large type, generous space, one primary button.

What *not* to copy: Tesla hides the maths. Kingston Energies' edge is the opposite: show the working (loss chain, assumptions, sources), because the notebook shows how often the course figures, and installers' quick rules, are wrong.

## 3. What the notebook adds for customers

Client-side material, by chapter:

| Notebook | What it gives the site |
|---|---|
| Ch 3 system types; §3.6 Jamaica | Grid-tied vs off-grid vs hybrid comparison, and why hybrid fits Jamaica (outages, net-billing export credit below retail, rising tariffs). |
| Ch 6 loss chain | Derate factor from a stated chain (temperature 0.90, soiling 0.97, mismatch 0.98, DC wiring 0.985, MPPT 0.99, inverter 0.943, AC wiring 0.99; stored share × 0.90): 0.779 direct, about 0.74–0.78 for a hybrid; **0.75 design value**. Explains "why does my 5 kW system show 19 kWh, not 25". |
| Ch 7 load calculation | Duty cycles (fridges, A/C), the JPS-bill cross-check (load table within about 15% of the bill), peak demand × 1.25 for the inverter, motor surge, day/night split for the battery. |
| Ch 8 design | The six steps; array = daily Wh ÷ (PSH × DF); modules = ⌈array ÷ module W⌉; battery nameplate = night Wh × autonomy ÷ (DoD × efficiency); battery-to-inverter current matching. |
| Ch 12 site practice | Site-survey checklist, roof types (concrete slab, zinc, tile, ground), hurricane uplift practice, coastal corrosion hardware. |
| Ch 14 Jamaica | Who governs what (MSET, OUR, JPS, GER, BSJ, local authority); GER inspection for every system; licence + Standard Offer Contract only when exporting; net billing; reported tax credit (marked *verify*). |
| Ch 15 monitoring | Performance ratio check (PR ≈ 0.75 healthy) and the zero-export "curtailment trap". |
| Ch 16 handover and maintenance | Commissioning record, handover (shutdown procedure, app, alarms), twice-yearly maintenance checklist, storm before/after steps. |
| Ch 17 capstone | What a complete design and quotation contain (load table with assumptions, sizing, strings, protection, single-line diagram, BOM, settings). |

Corrections the site must respect (they would change a real design): C01 refrigerator energy (duty cycle, not 24 h at rating), C02 no loss factor, C03 battery nameplate needs DoD and efficiency, C21 panel count units. Regulatory and incentive facts the notebook marks **[Verify]** stay marked as reported, with their source, never stated as settled.

## 4. Plan

### Tranche 1 (this change)
1. **Engine 1.9.0 `systemDesign`** — the notebook's method as tested code: loss chain → derate; array and module count; inverter from peak × 1.25 and a surge check; battery nameplate from night energy, autonomy, DoD and efficiency; battery current the bank must supply; bill cross-check; system-type recommendation. Tests reproduce the notebook's worked examples (6.1, 8.1, 8.5, 17.4).
2. **Design your system (`/solar/design`)** — the Tesla-style configurator: usage from the JPS bill (or bill history) or from My Energy equipment → what to keep on in an outage → system type → a live system card (panels, inverter, battery, backup hours, share of use from the sun), "where the sunlight goes" loss chart, price range from approved price records, monthly payment, and **Book a site survey**. Every figure shows its working.
3. **Going solar in Jamaica (`/guides/going-solar`)** — the process from design to monitoring as a timeline (Tesla's order timeline, with Jamaican approvals), survey preparation, what a proper design and quote contain, system types, storm and maintenance practice.
4. **System health check (`/solar/health`)** — for owners: performance ratio from kWh produced, system size and sun hours, with the curtailment trap and a fault-finding order (curtailment → soiling → shade → call us).

### Tranche 2 (next)
- Homepage and `/solar` landing in the Tesla manner: one hero per product line (Solar, Backup, EV), outcome-led copy, the configurator as the primary action.
- Carry a saved design into the booking, the quote (admin) and the customer hub.
- **Project tracker** in the customer hub: Survey → Design → Approvals → Install → Inspection → Turned on, with documents (design, single-line diagram, inspector's certificate, handover record).
- Survey booking that collects the notebook's checklist up front (roof type and age, photos, main panel, JPS meter).
- Quotation builder in admin that follows the capstone structure (load table, sizing, BOM with GCT, labour, inspection).

### Tranche 3
- Monitoring: import production from the inverter app (SOLARMAN export, CSV) for a monthly PR and degradation check.
- Maintenance plans with reminders (twice yearly), plus a storm-season call-out list.
- String-design checker for staff (cold Voc, hot Vmp, MPPT window, current per input), from notebook §8.4, fed by verified datasheets.

## 5. Owner inputs needed
- Install price records (J$/kWp, battery J$/kWh) in Admin → Reference data, so the configurator shows prices.
- The module wattage and battery products you sell (verified datasheets), so designs can name real products instead of sizes.
- Confirmation of the [Verify] items before they're shown as fact: current net-billing credit rate, licence steps and fees, the tax credit's amount and deadline, the wiring code edition.
