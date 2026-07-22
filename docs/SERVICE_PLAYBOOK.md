# Kingston Energies — Customer-Centric Service Playbook

A working guide for how Kingston Energies wins and keeps customers, distilled
from the MGMT 3069 course material and wired into the platform. This document
mirrors the **Playbook** tab in the admin dashboard; use it for staff
onboarding, day-to-day service decisions, and as the reference behind the CRM
tools in the other tabs.

---

## IDIC — our CRM backbone

Peppers & Rogers' four-stage model: treat different customers differently, and
let every interaction teach us more.

| Stage | What it means | Where it lives in the platform |
|-------|---------------|-------------------------------|
| **Identify** | Know who each customer is — contact details plus their *primary need*. | Signup, checkout, Hub profile → `User.primaryNeed` |
| **Differentiate** | Rank customers by value and need. | Admin → Customers: auto value-tier from order history |
| **Interact** | Learn through every touchpoint. | NPS survey after each order and after a Jordyn chat |
| **Customize** | Act on what we learn. | Hub recommendations tailored to the customer's need |

## Customer needs (Identify)

Every customer is asked what they mainly need power for:

- **Everyday carry** — keeping phones and small devices topped up on the go
- **Home backup** — staying powered through outages at home
- **Off-grid** — power away from the grid (rural, camping, field work)
- **Small business** — keeping a shop, stall or work site running

## Value tiers (Differentiate)

From *The Value of Customers*: customers differ by **Actual Value** (lifetime
spend) and **Growth Potential** (recent activity). Each tier gets a different
strategy.

| Tier | Name | Strategy |
|------|------|----------|
| **MVC** | Most Valuable | Retain — protect with loyalty perks and priority service |
| **SGC** | Super-Growth | Retain and mine — high value and still growing |
| **MGC** | Most Growable | Grow — invest to capture more of their spend |
| **LMC** | Low Maintenance | Automate — serve efficiently via self-service |
| **BZC** | Below Zero | Deprioritise — costs more to serve than it returns |

Tiers are computed in `lib/crm.ts` (`customerValueTier`) from LTV, recency and
open tickets; thresholds live in `VALUE_TIER_CONFIG` and can be tuned as real
data lands. Supporting idea — the **Pareto principle**: ~20% of customers drive
~80% of value, so concentrate effort on the MVC/SGC tiers.

## Service quality — SERVQUAL / RATER

Measure the gap between what customers **expect** and what they **perceive**,
across five dimensions:

- **Reliability** — deliver on the promise: accurate ETAs, correct orders, honest warranties
- **Assurance** — knowledgeable, courteous staff; clear specs and certifications
- **Tangibles** — the site, packaging and product condition on arrival
- **Empathy** — individual care, especially for outage-driven urgent purchases
- **Responsiveness** — fast help on chat, WhatsApp and phone

## Service culture

A branded service culture keeps the experience consistent across every channel.
Position: **the reliable power partner** — a Service + Convenience leader.

- **Mission** — keep Jamaica powered with dependable, honestly-priced portable energy
- **Consistency** — same tone and quality online, in person and over WhatsApp
- **Empowerment** — front-line staff may resolve small issues (replacements, expedited delivery) without escalation
- **Proactive** — flag delays before the customer has to ask

Underpinning theory: the **Service-Profit Chain** / **Cycle of Success** — well-
trained, empowered staff drive customer satisfaction and loyalty, which drives
revenue. Understaffing support cheaply pushes you into the Cycle of Failure.

## Handling complaints

Most unhappy customers never complain (the *complaint iceberg*), so treat every
complaint as a gift and follow the same steps:

1. **Listen** — let them finish without interrupting
2. **Apologise** — own it, even if the cause is unclear
3. **Clarify** — paraphrase to confirm you understand
4. **Take responsibility** — acknowledge and set expectations for the fix
5. **Fix & follow up** — resolve per policy, then check back

When a complaint type spikes, run the **5 Whys** to find the root cause before
changing policy or supplier. Watch for the four types of dissatisfied customer
(Voicers, Passives, Irates, Activists) — reach silent Passives with a proactive
post-purchase check-in before they churn.

## Service guarantee design

A good guarantee is:

- **Meaningful** — promise something beyond the ordinary (e.g. on-time delivery or it's credited)
- **Fair payout** — make the customer whole
- **Easy to invoke** — the return/RMA flow should be one simple form, never a runaround

---

*Frameworks sourced from MGMT 3069 (Quality Service Management, Building a
Service Culture, Strategic Customer Experience, Identifying Your Customers,
The Value of Customers, Complaints & Guarantees).*
