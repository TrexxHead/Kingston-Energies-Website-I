# Kingston Energies — Deployment & Handoff Guide

**Last Updated:** 2026-07-22 (session 4: IDIC CRM framework, NPS, service playbook, docs manager, security pass)  
**Status:** Ready for production deployment (pending GitHub push + Supabase setup)

---

## Session Summary

### ✅ What's Complete

**Core Platform:**
- Full Next.js 15 storefront (shop, cart, checkout, product details)
- Real database (Postgres 17, Prisma 5.22) with auth (NextAuth.js + Google OAuth + credentials)
- **Email verification required** for credentials sign-up (confirmation link, 24h expiry, resend flow)
- Admin dashboard (CRM, inventory, orders, customers, tickets, suppliers)
- **Live Google Sheets sync** — admin dashboard has a "Sync now" button + auto-sync every 15 min in prod (Sales, Customers, Inventory, Suppliers, Support Tickets, Overview KPIs)
- Customer Hub (profile, orders, loyalty points)
- Jordyn AI assistant (streaming chat, fallback nav helper, JMD pricing)
- Reviews section (smooth-scroll carousel, DB-backed, product links)
- All prices in Jamaican Dollars (JMD)
- Instagram link (@kingstonenergies) in footer
- Multi-method checkout (Visa/Mastercard, Google Pay, PayPal, Cash on Delivery) — method persisted on orders
- Legal pages (privacy, terms, returns, warranty)
- SEO (sitemap.xml, robots.txt, Open Graph metadata)
- Rate limiting (signup, orders, chat, resend-verification, nps, contact endpoints)
- Tests (50 passing: rate-limit, catalog, products, impact, password, initials, Jordyn, full CRM taxonomy)

**CRM — IDIC framework (MGMT 3069 course material):**
- **Identify** — customers set a *primary need* (Everyday / Backup / Off-grid / Business) at signup and in the Hub; shown and editable in admin
- **Differentiate** — each customer auto-tagged into a value tier (MVC / SGC / MGC / LMC / BZC) computed from LTV + recency; admin Customers tab filters by tier and shows a CRM insights strip (Pareto 80/20, tier counts, % identified)
- **Interact** — NPS survey after every order and after a Jordyn chat; admin Analytics tab shows overall + per-source NPS, distribution, and recent comments
- **Customize** — Hub recommendations and Jordyn's answers tailored to the customer's need
- **Service Playbook** (admin tab + `docs/SERVICE_PLAYBOOK.md`) — customer-centric guide (IDIC, SERVQUAL/RATER, service culture, complaint handling, guarantee design)
- **Policies & documentation manager** — store Google Drive (or any) share links in the admin Playbook tab; optional `NEXT_PUBLIC_DRIVE_FOLDER_URL` button
- All CRM logic centralised in `lib/crm.ts` (fully unit-tested); see `docs/SECURITY_REVIEW.md` and `docs/WHATSAPP_JORDYN.md` for the security pass and the WhatsApp-Jordyn plan

**Build & Deploy Ready:**
- ✅ Production build passes (`npm run build`)
- ✅ TypeScript clean (`npx tsc --noEmit`)
- ✅ `.gitignore` excludes secrets (`.env.local`, `node_modules`)
- ✅ 147 files committed to local git (commit hash `ece5b89`)
- ✅ Dynamic pages configured (cart, checkout, confirm, track marked `export const dynamic = 'force-dynamic'`)
- ✅ Prisma schema includes `directUrl` for Supabase pooler support

### 🔴 What's Not Yet Public (Gated on User Actions)

1. **GitHub** — code is committed locally but not pushed to GitHub yet (blocked on user: `git remote add` + `git push`)
2. **Supabase** — local Postgres used; cloud database not created yet (blocked on user: Supabase signup + string copy)
3. **Vercel** — deployment not attempted (blocked on user: GitHub repo exists + env vars configured)
4. **Jordyn AI Live** — Anthropic API key is valid but account has no credits (blocked on user: add balance at console.anthropic.com/billing)
5. **Live Payments** — PayPal/Google Pay not wired (blocked on user: PayPal + Google Pay credentials)
6. **Google Sheets Live Sync** — code is built and ready; needs a Google Cloud service account + a blank Google Sheet shared with it (blocked on user: ~10 min one-time setup, steps below)
7. **Email delivery** — without a Resend API key, verification/order emails log to the server console instead of sending (fine for testing, required before real users sign up)
8. **Real Instagram Prices & Photos** — placeholder JMD prices and stock photos in use; actual product list (names, prices, specs) and real product photos not imported (blocked on user: provide list + images)

> **Note:** Apple Sign In has been dropped from scope — Google + Email/password cover sign-in for now.

---

## Local Project Location

```
C:\Users\cowar\Downloads\Kingston-Energies-Project\kingston-energies
```

Browse files in VS Code: `code .` from that folder, or File → Open Folder in VS Code.

---

## The Three-Step Public Deployment

### Step 1: Push to GitHub (5 min)

1. Create an empty repo at **github.com** (sign in → `+` icon → New repository)
   - Name: `kingston-energies`
   - Visibility: Private (recommended) or Public
   - ⚠️ Do NOT check "Add README", "Add .gitignore", or "Add a license"

2. Copy the URL (looks like `https://github.com/YourName/kingston-energies.git`)

3. In PowerShell, from your project folder:
   ```powershell
   cd "C:\Users\cowar\Downloads\Kingston-Energies-Project\kingston-energies"
   git remote add origin https://github.com/YourName/kingston-energies.git
   git push -u origin main
   ```

4. When prompted, log in via Git Credential Manager (browser popup). If it asks for a password, create a Personal Access Token (github.com → Settings → Developer settings → Personal access tokens (classic) → Generate, tick `repo`) and paste that instead.

5. Refresh your GitHub repo page — all 147 files are now there, secrets excluded.

---

### Step 2: Create & Populate Supabase (10 min)

1. Sign up at **supabase.com** (free tier)
2. New Project → pick a region near Jamaica (e.g., US East)
3. Wait for the database to initialize (~2 min)
4. Go to **Settings → Database** and find two connection strings:
   - **Transaction pooler** (port 6543, has `?pgbouncer=true`) → copy this as `DATABASE_URL`
   - **Direct connection** (port 5432, no pgbouncer) → copy this as `DIRECT_URL`

5. From your project folder in PowerShell:
   ```powershell
   $env:DATABASE_URL="<paste-transaction-pooler-here>"
   $env:DIRECT_URL="<paste-direct-connection-here>"
   $env:ADMIN_PASSWORD="YourSecurePassword123"
   npx prisma db push
   npm run db:seed
   ```

6. Check Supabase console → Tables tab to confirm `users`, `products`, `orders`, `reviews`, etc. are populated.

---

### Step 3: Deploy on Vercel (5 min + deploy time)

1. Go to **vercel.com** and sign in with GitHub
2. **Add New** → **Project** → select `kingston-energies` repo
3. Vercel auto-detects Next.js. Before clicking Deploy, add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | your Supabase pooled connection string |
| `DIRECT_URL` | your Supabase direct connection string |
| `NEXTAUTH_SECRET` | generate: `openssl rand -hex 32` or use a password generator |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` (Vercel shows this) |
| `NEXT_PUBLIC_SITE_URL` | same as `NEXTAUTH_URL` |

(Leave `ANTHROPIC_API_KEY`, payment gateway keys, email keys, and Google Sheets keys blank for now — they all degrade gracefully. Add Google Sheets once you've done the setup in the next section, so cron sync works from day one.)

4. Click **Deploy**. In ~2 min, you'll have a live URL.

5. Test it: browse to the URL, try the shop, create an account (check your inbox — or the Vercel function logs if email isn't configured yet — for the verification link), place an order (payment methods record but don't charge in demo mode).

---

### Step 4: Live Google Sheets Setup (10 min, optional but recommended)

This makes the "Sync now" button in the admin dashboard work, and turns on automatic syncing every 15 minutes once deployed.

1. **Create a Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com) (or reuse an existing one).
2. **Enable the Google Sheets API**: APIs & Services → Library → search "Google Sheets API" → Enable.
3. **Create a service account**: APIs & Services → Credentials → Create Credentials → Service Account. Give it any name (e.g. `kingston-sheets-sync`). Skip the optional role/access steps.
4. **Create a key**: open the new service account → Keys tab → Add Key → Create new key → JSON. A file downloads — keep it safe, it's a secret.
5. From that JSON file, you need two values:
   - `client_email` → this is `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `private_key` → this is `GOOGLE_SHEETS_PRIVATE_KEY` (paste it exactly as-is, including the `\n` characters and `-----BEGIN PRIVATE KEY-----` header — the app converts the `\n` sequences back to real newlines automatically)
6. **Create a blank Google Sheet** at [sheets.new](https://sheets.new). Name it anything (e.g. "Kingston Energies — Live Data").
7. **Share it with the service account**: click Share → paste the `client_email` from step 5 → give it **Editor** access → Send (uncheck "notify" if it complains about it being a non-person).
8. **Copy the Spreadsheet ID** from the sheet's URL: `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit` → this is `GOOGLE_SHEETS_SPREADSHEET_ID`.
9. **Generate a cron secret**: any random string works, e.g. `openssl rand -hex 16`. This is `CRON_SECRET`.
10. Add all four to Vercel env vars (Project → Settings → Environment Variables), then redeploy:

| Variable | Value |
|----------|-------|
| `GOOGLE_SHEETS_CLIENT_EMAIL` | from the service account JSON |
| `GOOGLE_SHEETS_PRIVATE_KEY` | from the service account JSON |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | from the sheet's URL |
| `CRON_SECRET` | any random string |

11. Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to the cron endpoint, so no further wiring is needed — `vercel.json` already schedules the sync every 15 minutes.

**Note on Vercel plans:** Hobby (free) accounts may restrict cron jobs to once per day rather than every 15 minutes — check your plan's current cron limits in the Vercel dashboard. If 15-minute syncing isn't available on your plan, either upgrade to Pro or use the manual **"Sync now"** button in the admin dashboard (Executive tab), which always works regardless of plan.

Once configured, the admin dashboard's Executive tab shows a "Live spreadsheet" card with a **Sync now** button, a link to open the sheet, and the last sync time. The sheet gets six tabs: Overview (KPIs), Sales, Customers, Inventory, Suppliers, Support Tickets.

---

### Step 5: File Uploads (Supabase Storage — 5 min, optional)

Turns on **file uploads** for admin documents/policies and procurement attachments (invoices, quotes, price lists, contracts). Until this is set up, both features still work with **links** — you can paste any share URL (Google Drive, Dropbox, etc.) instead of uploading a file. No code changes are needed to enable uploads later.

1. In the **Supabase dashboard** → **Storage** → **New bucket**.
2. Name it exactly `admin-files`. **Leave the "Public bucket" toggle OFF** — these files (invoices, contracts) must stay private.
3. Get your API values: **Settings → API**:
   - **Project URL** (`https://<project-ref>.supabase.co`) → `SUPABASE_URL`
   - **`service_role` secret** (under Project API keys — *not* the `anon` key) → `SUPABASE_SERVICE_ROLE_KEY`
4. Add both to Vercel env vars (Project → Settings → Environment Variables), then redeploy:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | your project URL, e.g. `https://abcd1234.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` secret from Settings → API |

**Security note:** the `service_role` key bypasses row-level security, so it must live **only** in server env vars (never `NEXT_PUBLIC_`). The app only ever uses it inside admin-guarded API routes, and files are served through short-lived **signed URLs** (1-hour expiry) — never public links. Uploads are capped at **20 MB** per file.

Once configured, the "Add" buttons in **Policies & documentation** and **Suppliers & procurement** gain an **Upload file** tab alongside **Add link**.

---

## Admin Access

**Email:** `admin@kingstonenergies.com`  
**Password:** `Kingston!Admin2026` (or whatever you set via `ADMIN_PASSWORD` during seed)

Log in at `/admin/login` on your live site.

---

## Later: Fill in the Blanks

Once the site is live, you can add features without redeploying code:

**Jordyn AI:**
- Add credits at **console.anthropic.com** → Settings → Billing
- She goes live automatically (exists in `ANTHROPIC_API_KEY` env var)

**Payments:**
- Create PayPal merchant account → get `NEXT_PUBLIC_PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET`
- Create Google Pay merchant account → get `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID`
- Add to Vercel env vars → redeploy (click Redeploy in Vercel → Deployments)

**Instagram Prices:**
- Paste your product list (name, J$ price, specs) in Slack/email
- I'll update `lib/catalog.ts` and `prisma/seed.js` → push → Vercel auto-redeploys

**Email Confirmations:**
- Create Resend account (resend.com, free tier)
- Get `EMAIL_API_KEY` + set `EMAIL_FROM` → add to Vercel env vars
- Required before real users can sign up with email/password (without it, verification links only appear in server logs)

**Google Sheets Live Sync:**
- Follow "Step 4: Live Google Sheets Setup" above (~10 min, one-time)
- Once configured, sales/customers/inventory data syncs automatically every 15 min + on-demand from the admin dashboard

---

## Technical Details for Next Session

### Database Schema
- **Users** (admin + customers, NextAuth-linked)
- **Products** (12 seeded from catalog, JMD prices)
- **Orders** (real checkout creates rows, status tracked)
- **Reviews** (8 seeded, smooth carousel on home)
- **Suppliers** + **PurchaseOrders** (for inventory planning)
- **Tickets** (customer support)

All in `prisma/schema.prisma`. Add columns or tables via `prisma.schema` → `npx prisma db push` → `npm run db:seed` (idempotent, uses upserts).

### Key Files
- **Storefront:** `app/page.tsx`, `app/shop/page.tsx`, `app/product/[id]/page.tsx`, `app/checkout/page.tsx`
- **Admin:** `app/admin/dashboard/page.tsx` + `_components/` sections
- **API:** `app/api/orders/route.ts`, `app/api/admin/*/route.ts`, `app/api/chat/route.ts`
- **Jordyn:** `lib/camille.ts`, `components/camille/Camille.tsx`, `components/camille/CamilleAvatar.tsx`
- **Pricing:** `lib/catalog.ts` (JMD conversion at top)
- **Tests:** `tests/*.test.ts`, run with `npm test`

### Environment Variables (Template)
```env
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host/db"
NEXTAUTH_SECRET="<random-32-chars>"
NEXTAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_CLIENT_ID="<from Google Cloud>"
GOOGLE_CLIENT_SECRET="<from Google Cloud>"
NEXT_PUBLIC_PAYPAL_CLIENT_ID=""
PAYPAL_CLIENT_SECRET=""
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=""
EMAIL_API_KEY="<from Resend>"
EMAIL_FROM="Kingston Energies <orders@kingstonenergies.com>"
ADMIN_EMAIL="admin@kingstonenergies.com"
ADMIN_PASSWORD="<secure-password>"
GOOGLE_SHEETS_CLIENT_EMAIL="<from service account JSON>"
GOOGLE_SHEETS_PRIVATE_KEY="<from service account JSON>"
GOOGLE_SHEETS_SPREADSHEET_ID="<from the sheet's URL>"
CRON_SECRET="<random string>"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service_role secret — server only, never NEXT_PUBLIC>"
INTEGRATION_API_KEY="<random 32+ char secret for the WhatsApp/Instagram n8n bots>"
WIPAY_ACCOUNT_NUMBER="<your WiPay merchant account number — only for card payments>"
WIPAY_API_KEY="<your WiPay API key — used to verify payment callbacks>"
WIPAY_ENVIRONMENT="sandbox"
```

### Payments

The storefront supports five methods, all managed from **Admin → Finance →
Payment methods** (toggle each on, fill in your own details):

| Method | Setup | Cost |
|--------|-------|------|
| **Bank transfer** | Enter your bank/account/branch in the admin panel | Free |
| **Lynk** | Enter your Lynk handle/phone | Free |
| **PayPal** | Enter your PayPal.me link / email | Free |
| **Cash on delivery** | On by default | Free |
| **Card (Visa/MC)** | Needs a **WiPay** merchant account + the `WIPAY_*` env vars above | Per-transaction fee |

For the four direct methods, the checkout shows the customer how to pay and asks
them to quote their **order number** as the reference; you confirm the money and
click **Mark as paid** on the order (Admin → Orders → open the order). Nothing
sensitive (bank/Lynk details) lives in code — it's all in the admin panel.

**Card payments (WiPay):** card only appears at checkout once `WIPAY_ACCOUNT_NUMBER`
and `WIPAY_API_KEY` are set *and* you've switched "Card" on in the admin panel.
1. Open a merchant account at [wipayfinancial.com](https://wipayfinancial.com) (Jamaica).
2. From your WiPay dashboard, copy your **account number** and **API key**.
3. Add the three `WIPAY_*` vars in Vercel; keep `WIPAY_ENVIRONMENT=sandbox` for
   testing, switch to `live` when ready. Redeploy.
4. WiPay hosts the card page and redirects back to `/api/payments/wipay/callback`,
   which verifies the payment and marks the order **paid** automatically.
   (Field names / the callback hash follow WiPay's published "Request A
   Transaction" docs — confirm them against your merchant dashboard, and test in
   sandbox first.)

### WhatsApp & Instagram automation (n8n)

Automated Jordyn replies + in-chat ordering on WhatsApp Business and Instagram,
with those orders showing in the admin dashboard tagged by channel. The website
exposes `/api/integrations/*` (products, chat, orders); n8n connects Meta to it.
Set `INTEGRATION_API_KEY` (above), then follow **`docs/WHATSAPP-INSTAGRAM.md`**
for the full Meta + n8n setup and the API contract.

### Authentication Flow

- **Google**: sign in via OAuth, auto-verified (Google already confirms emails), works immediately once `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.
- **Email/password**: sign-up sends a confirmation link (24h expiry) via `lib/email.ts` → `sendVerificationEmail`. Login is blocked with a "confirm your email" message + one-click resend until the link is clicked. Without `EMAIL_API_KEY` configured, the link is logged to the server console instead of emailed — still fully testable locally.
- **Apple**: out of scope for now — Google + Email/password cover sign-in.

---

## To Continue Development

1. `git clone` your GitHub repo
2. `npm install`
3. Copy `.env.local` template from `.env.example`, fill in your Supabase + API keys
4. `npm run db:seed` (idempotent, safe to run anytime)
5. `npm run dev` (starts local server on port 3000)
6. Edit code → commit → `git push` → Vercel auto-redeploys

---

## Known Limitations (Next Priorities)

- ✅ **Shop ↔ Admin unified:** `lib/products.ts` joins the static catalog (`lib/catalog.ts` — images, specs, copy) with live DB price/stock by product name, so admin Inventory edits show up on the storefront immediately. Falls back to static catalog prices if the DB is unreachable. Admin dashboard reads/writes the DB directly via `/api/admin/products`.
- **Live payment capture:** Orders record the chosen method but don't charge. The checkout UI (card/Google Pay/PayPal/COD) is built and ready — wiring the actual PayPal/Google Pay SDK just needs `NEXT_PUBLIC_PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/`NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` from your merchant accounts (see "Later: Fill in the Blanks").
- **Tests:** 23 unit tests pass (up from 13 — added coverage for `lib/products.ts` DB-fallback behavior, `lib/impact.ts`, `lib/password.ts`, `lib/initials.ts`). E2E + component tests are still the next layer for deeper coverage.
- **Email:** Gracefully no-ops if `EMAIL_API_KEY` not set; configure Resend for production.

---

## Rollback / Emergency

- **Supabase:** Data persists; can always repull via `npx prisma db push` + `npm run db:seed`
- **Vercel:** Every push is a new deployment; old versions available under Deployments tab (can revert instantly)
- **GitHub:** Full history; `git reset` or branch recovery available if needed

---

## Support

If you hit issues during any step:
1. Paste the error text
2. I'll diagnose and fix (usually 1–2 commands)

Good luck! 🚀
