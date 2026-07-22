# Security & Error-Handling Review

_Focused pre-launch pass over authentication, input validation, rate limiting,
and error handling. Date: 2026-07-22._

## Summary

The codebase was in good shape. One public endpoint (`/api/contact`) was
missing the validation + rate limiting that every other public write route
already had; it has been hardened. A hardcoded personal name prefilled into the
checkout form was removed. No secret exposure, injection, or auth-bypass issues
were found.

## What was checked

### Authentication / authorization
- **All 13 admin API routes** (`/api/admin/**`) call `guardAdmin()`, which
  returns 401 unless the session role is `ADMIN`/`SUPER_ADMIN`. ✅
- **Cron endpoint** (`/api/cron/sheets-sync`) requires `Authorization: Bearer
  $CRON_SECRET` and refuses to run if the secret isn't configured. ✅
- **Account endpoint** (`/api/account`) requires an authenticated session and
  scopes updates to `session.user.id`. ✅

### Input validation
- Every POST/PATCH route validates its body with Zod and bounded string
  lengths. Coverage confirmed across signup, orders, nps, account, chat,
  resend-verification, and (after this pass) contact. ✅

### Rate limiting
- Public write routes are rate-limited per IP: signup (5/10min),
  resend-verification, orders (10/min), chat (15/min), nps (5/min), and
  (after this pass) contact (5/10min). ✅

### Secret handling / injection
- No `dangerouslySetInnerHTML`, `eval`, or `new Function` anywhere. ✅
- No non-public `process.env` reads in client components; no secrets logged or
  returned in responses. ✅
- All DB access goes through Prisma (parameterised) — no raw SQL. ✅

## Fixes applied in this pass

1. **`/api/contact` hardened** — added Zod validation (name/email/phone/message
   with length caps), added per-IP rate limiting (5 per 10 min), and stopped
   echoing the created `lead` record (with its DB id) back to the client.
2. **Checkout form** — removed a hardcoded `defaultValue="JoWayne Fearon"` on
   the full-name field; it now shows a neutral placeholder.

## Notes / lower-priority follow-ups

- `/api/account` (authenticated) has no rate limit; abuse is limited to
  signed-in users, so this is low risk. Could add a limiter for completeness.
- `/api/nps` accepts an `orderNo` label from the client without verifying it
  belongs to the caller. It's only a reporting label (no authorization decision
  rests on it), so impact is minimal.
- The in-memory rate limiter (`lib/rateLimit.ts`) is per-instance and resets on
  restart — fine for a single instance, but swap for a shared store (Upstash /
  Vercel KV) if the app scales to multiple serverless instances.
