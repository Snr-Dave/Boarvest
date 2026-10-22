# Boarvest Development Roadmap

This roadmap distinguishes code present in the repository from work that is only designed or planned. A feature is not production-ready merely because a route or UI exists.

## Phase 1 — Foundation and documentation

**Status: Completed in code; documentation maintained continuously.**

- Next.js App Router, TypeScript, React, Tailwind, and Supabase SSR clients are configured.
- Repository architecture, route boundaries, environment scopes, and security rules are documented.
- Lint, type-check, and production-build commands are defined in `package.json`.

## Phase 2 — Public site and authentication

**Status: Completed in code; deployment verification remains environment-dependent.**

- Public homepage, login, signup, password reset, callback, and redirect routes exist.
- Supabase email/password sessions use server checks and proxy cookie refresh.
- Authenticated users reach `/dashboard`; authorized administrators reach `/admin`.

## Phase 3 — User dashboard and deposits

**Status: Partially implemented; integration-dependent.**

- Dashboard shell and unavailable financial states exist.
- Deposit UI supports SOL, ETH, and BNB selections, price estimation, validation, and submission.
- User deposit history exists at `/dashboard/transactions`.
- Database-backed operation requires the chronological admin-membership and deposit-accounting migrations, RLS, and safe integration testing.

## Phase 4 — Admin control center

**Status: Partially implemented.**

- Server-protected admin route and membership authorization exist.
- Live deposit list, counts, filters, approval/decline controls, and accounting RPC integration exist in code.
- Users directory and selected-user details exist in code and require `SUPABASE_SERVICE_ROLE_KEY` for Auth Admin API access.
- Withdrawal, audit-log, and settings surfaces are visibly unavailable where no authoritative backend exists.

## Phase 5 — Financial verification and operations

**Status: Planned.**

- Verify network, asset, destination, transaction hash, amount, and confirmations.
- Add withdrawal requests, reservations, payout recording, wallet address support, and reconciliation.
- Add immutable audit events, operational alerts, and tested recovery paths.
- Complete security, compliance, custody, and legal review before real funds.

## Phase 6 — Test and release readiness

**Status: In progress.**

- Run local/disposable Supabase migration and RLS/RPC tests.
- Test owner isolation, admin denial, invalid transitions, duplicate approvals, append-only ledger enforcement, and concurrent review behavior.
- Verify deployment variables without exposing values.
- Perform browser, accessibility, security, and production-configuration review.

## Current development position

The repository is beyond the original placeholder-only architecture, but financial integration remains gated by database readiness and testing. The next safe milestone is to validate the existing migrations and deposit workflows against a disposable local Supabase environment, then review any findings before production changes.
