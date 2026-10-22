# Boarvest Admin Dashboard Architecture

**Status: Partially implemented; core admin flows are present in code, while withdrawals, audit logs, and operational verification remain planned.**

## Routes and navigation

- `/admin` is a server-protected administrator route.
- The Control Center contains Overview, Users, Deposits, Withdrawals, Audit Log, and Settings.
- Admin Transactions and Notifications destinations are intentionally not present.
- The Overview retains user and deposit summary metrics; the old Review Queue section is not a separate surface.
- The user dashboard's `/dashboard/transactions` page and its APIs are separate and preserved.

## Implemented admin flows

### Authorization

`app/admin/page.tsx` redirects unauthenticated visitors and returns a safe not-found response for authenticated non-admins. `lib/auth/admin.ts` checks the authenticated Supabase user against `public.admin_memberships`. Admin Route Handlers repeat this check; UI visibility is not relied upon for security.

### Deposits

`GET /api/admin/deposits` loads deposit requests and counts. `POST /api/admin/deposits/:id/review` validates the UUID, decision, and review note, then delegates the state transition and ledger credit to the database RPC. The service-role client is used only after application-level admin authorization for privileged admin reads. The accounting migration must be applied and tested before this is treated as operational.

### Users

`GET /api/admin/users` has two server-authorized modes:

1. Without `userId`, it paginates `auth.admin.listUsers` and returns only UUID, email, and display name.
2. With a validated UUID, it calls `auth.admin.getUserById` and reads approved deposit-credit ledger rows for that user. Withdrawal total and wallet address are explicitly unavailable because no authoritative withdrawal implementation exists.

`components/admin/AdminDashboard.tsx` shows the directory first, loads details only after selection, and provides a return-to-list action. It includes loading, empty, error, and unavailable states. The endpoint requires `SUPABASE_SERVICE_ROLE_KEY`, which must remain server-only.

## Not implemented

- Withdrawal processing and authoritative withdrawal records.
- Wallet-address persistence for withdrawals.
- Blockchain evidence/confirmation service.
- Admin audit-log storage and UI.
- Production readiness of financial workflows without database integration tests, reconciliation, and operational review.

## Required database contract

The chronological migrations are:

1. `20261017000000_create_admin_memberships.sql` — admin membership table, RLS, and grants.
2. `20261019000000_create_deposit_accounting.sql` — deposit requests, append-only ledger, review RPC, RLS, triggers, and integrity constraints.

A migration file is not evidence of live schema state. Validate against a disposable local database first.
