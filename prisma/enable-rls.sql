-- Enable Row Level Security on every table, with no policies attached.
--
-- Why this is safe: this app's entire authorization layer lives in
-- Next.js/Prisma (NextAuth sessions, guardAdmin()/getServerSession() checks
-- in every API route — see SECURITY-REMEDIATION.md §B.2/B.3/B.4). Prisma
-- connects via DATABASE_URL/DIRECT_URL using Supabase's `postgres` role,
-- which bypasses RLS by design. This script only affects the separate
-- `anon`/`authenticated` roles Supabase's auto-generated PostgREST API uses —
-- roles this app never uses and never grants a key to. With RLS enabled and
-- zero policies defined, PostgREST's default is deny-all, so this closes
-- that API off entirely without touching how the app itself talks to the
-- database.
--
-- Run this once in the Supabase dashboard → SQL Editor → New query → paste
-- and run. Safe to re-run — ENABLE ROW LEVEL SECURITY is idempotent.

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StockAdjustment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EnergyData" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProcurementFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomerAlias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RestockRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NpsResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PolicyDoc" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SiteSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LedgerAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JournalLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reconciliation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ScheduleRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FixedAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PrepaidExpense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RevenueSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DiscountCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PayrollRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payslip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BankConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BankStatementLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DocumentScan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ExchangeRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FeedState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BankRule" ENABLE ROW LEVEL SECURITY;
