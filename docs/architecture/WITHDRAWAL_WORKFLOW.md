# Withdrawal Workflow

## Phase 1 requirements — confirmed

Withdrawal functionality is **not implemented**. The user route `app/dashboard/withdrawals/page.tsx` is an unavailable placeholder, and the admin dashboard routes Withdrawals to the generic `PlaceholderSection`. There is no withdrawal API, persistence model, review UI, reservation operation, or transfer-completion workflow.

The following requirements are confirmed for the initial implementation:

- **Assets and networks:** SOL on Solana, ETH on Ethereum, and BNB on BNB Smart Chain. The user explicitly selects both asset and network; the server validates that pairing and the destination address format for that network.
- **Currency, limits, and fees:** requests are denominated in USD, with a $10 minimum and $5,000 maximum per request. The server enforces both limits and rejects amounts above available balance. The initial fee is $0. Token estimates, if later displayed, must use the existing market-price implementation server-side; client-provided rates are never trusted.
- **Request snapshot:** asset, network, destination address, USD amount, fee, request timestamp, and status are captured as immutable financial/destination details. The user must explicitly confirm the address and network.
- **Statuses:** `pending_review` → `approved` → `transfer_pending` → `completed`, with `rejected` and `failed` terminal outcomes as appropriate. Approval is an administrative decision, not proof of blockchain transfer completion.
- **Operations:** transfers are manual and administrator-controlled. A transaction hash/reference and completion timestamp are recorded when applicable. Automated blockchain transfers are out of scope.

## Planned workflow and reservation rules

1. An authenticated user opens Withdrawals, enters the approved fields, reviews the confirmation summary, and submits.
2. A server-authorized operation validates identity, asset/network compatibility, address, USD precision, limits, fee, and available balance. It atomically reserves the USD amount so concurrent requests cannot overdraw availability.
3. Reserved funds remain unavailable through review and transfer processing. The request appears in the admin dashboard with the user, immutable request snapshot, and relevant balance context.
4. An authorized administrator approves or rejects with an appropriate note. Approval moves the request to `approved`; it does not complete the transfer. Rejection releases the reservation exactly once.
5. The administrator records transfer submission separately, moving the request to `transfer_pending`, then records verified evidence and completion time before `completed`.
6. A failed transfer must be handled by an explicit, auditable operation defined in Phase 2: it must not silently release or double-debit funds. The final rule must preserve the reservation or release/re-credit it atomically according to verified transfer outcome and ledger policy.
7. Users can view only their own request history and current status; administrators can review and update requests through server-side authorization. Repeated reviews and retries are rejected or made idempotent.

## Deposit architecture to reuse selectively

- Reuse the dashboard shell and authenticated server-client patterns from `app/api/deposits/route.ts` and `app/api/deposits/mine/route.ts`, including session-derived identity, validation, scoped reads, and consistent errors.
- Reuse admin gating, list/review structure, and refresh behavior from `components/admin/AdminDashboard.tsx`, `app/api/admin/deposits/route.ts`, and `app/api/admin/deposits/[id]/review/route.ts`.
- Treat the deposit migration as a security reference for UUID identifiers, explicit statuses, timestamps/reviewer fields, indexes, RLS ownership, admin membership checks, immutable reviewed fields, row locking, and restricted review RPC execution.
- Do **not** reuse deposit request rows, deposit identifiers, deposit-credit operations, or deposit semantics. Withdrawals require withdrawal-specific request, reservation/debit, ledger, and transfer evidence records or operations.

## Phase 2 design decisions — not yet implemented

Phase 2 must define the canonical balance source and exact reservation representation, ledger/debit linkage, row-locking and idempotency constraints, RLS policies, address-validation library/rules, USD precision, and the safe failed-transfer recovery operation. It must also review `app/api/market-prices/route.ts` before any token estimate is specified. No migration, RPC, application code, environment variable, or financial operation has been changed for Phase 1.

## Verification approach

Before implementation, verify the requirements against the existing balance and deposit accounting model. Later phases must use authorized test accounts and simulated/manual transfer evidence to verify ownership isolation, malformed and unsupported wallets, limits, insufficient and concurrent balances, duplicate reviews, rejection reservation release, failed-transfer recovery, status visibility, and unchanged deposit behavior. Phase 1 remains planning-only until explicitly marked complete after documentation review.
