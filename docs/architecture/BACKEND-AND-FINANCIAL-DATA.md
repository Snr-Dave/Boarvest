# Boarvest Backend and Financial Data Architecture

**Status: Mixed: authentication, deposit-request, admin-review, and ledger-read paths are implemented in code; withdrawals, blockchain verification, and reconciliation are planned.**

## Current backend modules

- `lib/supabase/client.ts` — browser publishable-key client.
- `lib/supabase/server.ts` — cookie-aware server client.
- `lib/supabase/proxy.ts` and `proxy.ts` — session refresh.
- `lib/auth/admin.ts` — server-side `admin_memberships` authorization.
- `app/api/deposits/route.ts` — authenticated user deposit validation and creation.
- `app/api/deposits/mine/route.ts` — owner-scoped request history.
- `app/api/admin/deposits/route.ts` — authorized admin listing and counts.
- `app/api/admin/deposits/[id]/review/route.ts` — authorized review operation.
- `app/api/admin/users/route.ts` — authorized Auth user listing and selected-user ledger details.

## Environment and secret boundaries

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public/client variables. `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` is an optional public development redirect. `SUPABASE_SERVICE_ROLE_KEY` is a server-only elevated secret used by protected admin Route Handlers. It must never be prefixed with `NEXT_PUBLIC_`, returned in JSON, logged, or imported into client code. A legacy `SUPABASE_SECRET_KEY` alias remains accepted by the admin deposits list only.

## Accounting model

A deposit request is user intent and remains pending until an authorized review. Pending and declined requests must not affect balances. The review operation is expected to create one corresponding `deposit_credit` ledger entry for an approved request; uniqueness and database-side transition checks are the source of truth for duplicate prevention. The admin users detail route sums ledger credit rows rather than adding both requests and credits.

This behavior depends on `supabase/migrations/20261019000000_create_deposit_accounting.sql` being applied successfully. The repository's migration and local test files should be run only against an explicitly disposable local/non-production database.

## Planned financial capabilities

Withdrawals, wallet-address persistence, blockchain transaction verification, reservations, immutable reconciliation/audit trails, referral commissions, and production operational controls remain **Planned**. Do not represent missing withdrawal records as zero; the admin UI reports them as unavailable/not implemented.

## Security requirements

Every sensitive mutation must authenticate with the server Supabase client and authorize the operation. User IDs from query strings are validated and scoped; they are never proof of permission. RLS remains defense in depth. Service-role access bypasses RLS, so application-level admin authorization is required before any privileged query.
