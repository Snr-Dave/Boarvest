# Withdrawal Workflow Roadmap

## Verified status

Withdrawal functionality is **not implemented**. The user route `app/dashboard/withdrawals/page.tsx` renders a placeholder stating that withdrawals are unavailable. The admin dashboard lists “Withdrawals” in navigation, but routes it to the generic `PlaceholderSection`; there is no withdrawal API, review UI, persistence model, or balance-settlement workflow. The admin user detail view also reports total withdrawals as “Not implemented.”

No application code, schema, environment variable, or financial workflow was changed during this review.

## Planned workflow

1. The authenticated user opens **Withdrawals** in the dashboard.
2. The user enters a supported withdrawal asset/network, destination wallet, and USD amount, then confirms the request.
3. A server-authorized endpoint validates ownership, input, available balance, asset/network compatibility, and request limits before saving a pending request securely.
4. The pending request appears in the admin dashboard for review, with enough context to verify the user, amount, destination, and current balance.
5. An authorized administrator approves or rejects the request. The approval and balance/debit update must occur in one protected, transactional operation.
6. The user can view their own request history and status, including review time and an administrator note where appropriate.

## Reuse from deposits

- **Dashboard structure:** reuse the existing dashboard navigation/shell patterns and replace the withdrawal placeholder with a dedicated user interface; do not copy deposit wording or wallet direction blindly.
- **Request handling:** follow `app/api/deposits/route.ts` and `app/api/deposits/mine/route.ts` for authenticated server-client access, validation, scoped reads, consistent error responses, and pending-request creation.
- **Admin review:** follow `components/admin/AdminDashboard.tsx`, `app/api/admin/deposits/route.ts`, and `app/api/admin/deposits/[id]/review/route.ts` for admin gating, filters, review feedback, and refresh behavior.
- **Database/security patterns:** the deposit migration provides useful patterns: UUID request IDs and references, explicit status constraints, timestamps/reviewer fields, indexes, RLS scoped to `auth.uid()`, admin membership checks, immutable reviewed financial fields, row locking, and a security-definer review RPC with execute permissions restricted to authenticated users.
- **Accounting protection:** `account_ledger` is append-only and deposit approval is protected by database constraints/triggers. Withdrawals should not write a deposit credit or reuse `deposit_request_id`; they need a withdrawal-specific request/debit model and a transaction-safe balance reservation or debit strategy.

## Important differences from deposits

A withdrawal sends value to a user-controlled destination and reduces available funds. Before implementation, define the canonical balance source, whether pending requests reserve funds, supported wallet validation, minimum/maximum limits, fee handling, and whether an approved request represents an instruction or a completed transfer. Never trust a client-provided balance, exchange rate, approval state, or transaction result. Duplicate approvals must be rejected by row locking and a pending-only state transition, with an idempotent accounting record or unique constraint preventing duplicate debits.

## Recommended implementation sequence

1. Approve the withdrawal financial model and destination/asset requirements, then design the migration and RLS policies.
2. Add the withdrawal request table and secure database operation for pending creation, reservation/debit, and one-time admin review.
3. Add authenticated user request/status views and the admin review/listing endpoints and UI.
4. Add focused tests for ownership, validation, insufficient balance, concurrent review, duplicate processing, rejection, and unchanged deposit behavior.
5. Run the repository validation commands and manually verify both dashboards with authorized test accounts.
