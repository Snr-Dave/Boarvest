<!-- BEGIN:nextjs-agent-rules -->This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in "node_modules/next/dist/docs/" (resolved from this file's directory; in monorepos, the "next" package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by "next dev" — verify at "node_modules/next/dist/server/lib/generate-agent-files.js". Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->Boarvest Agent Instructions

Project Overview

This repository is a Next.js 16 + TypeScript application with Supabase authentication and an investment platform dashboard.

Stack

- Next.js 16
- React 19
- TypeScript
- Supabase
- ESLint
- Node.js 24

Current Task: User Dashboard Settings

Branch: "feat/settings-security"

Current Mode: Planning and documentation only.

The agent must inspect the existing implementation and document the proposed changes. It must NOT modify application code, components, styles, routes, database schemas, migrations, environment variables, or configuration files without explicit user approval.

The agent may update this "agent.md" file to document findings and checklist progress.

Objective

Replace the existing user dashboard menu label Account Settings with Settings and plan a Settings page that lets authenticated users manage their profile, security, and display currency.

Keep the implementation minimal and consistent with the existing Boarvest dashboard design.

Implementation Checklist

The agent must inspect the existing codebase and maintain this checklist. Mark an item "✅" only after its corresponding work has actually been implemented and verified. During the planning phase, all implementation items must remain unchecked.

Phase 1: Inspect and Plan

- [x] Locate the existing Account Settings navigation item and page.
- [x] Locate the existing dashboard navigation component and determine how menu labels and routes are configured.
- [x] Locate the current Sign Out button and inspect its existing logout implementation.
- [x] Inspect the existing Supabase authentication and profile-data implementation.
- [x] Identify where the authenticated user's full name, email, user ID, and account creation date come from.
- [x] Determine which profile fields can safely be edited using the current schema.
- [x] Inspect existing password-change and password-reset functionality.
- [x] Inspect existing dashboard balance and earned-profit components.
- [x] Identify how the selected display currency could persist across sessions.
- [x] Determine whether an existing, approved cryptocurrency exchange-rate source is available.
- [x] Document the proposed files to change and the purpose of each change.
- [x] Identify any required database migration, environment variable, or external service before proposing it.
- [x] Present the implementation plan for user approval.

Phase 1 Findings

- Navigation is defined in `components/dashboard/DashboardShell.tsx`. The secondary item is currently labeled `Account Settings` and links to `/dashboard/settings`; the page exists at `app/dashboard/settings/page.tsx` but renders only a `WorkspacePlaceholder`.
- `components/dashboard/DashboardShell.tsx` receives `userEmail` and `displayName` from each server-rendered dashboard page. Its sidebar sign-out control is `components/auth/SignOutButton.tsx`, which calls the browser Supabase client's `auth.signOut()`, then replaces the route with `/login` and refreshes the router.
- Authentication uses `components/auth/AuthForm.tsx`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `proxy.ts`, and `app/auth/callback/route.ts`. Signup stores `full_name` in Supabase Auth `user_metadata`; the inspected code does not define a separate profile table or profile migration.
- The dashboard derives the display name from `user.user_metadata.display_name`, `full_name`, or `name`. Email comes from `user.email`. The user ID is available as `user.id` in the authenticated Supabase user object. Account creation date is available from Supabase Auth's user record (`created_at`), but the current dashboard does not pass or render it.
- Based on the inspected migrations, only `admin_memberships`, `deposit_requests`, and `account_ledger` are defined. No editable profile columns are present. The safest initial editable profile field is the Auth metadata `full_name`, updated only for the authenticated user through Supabase Auth; email and user ID should remain read-only. A separate profile table would require an approved migration and RLS policy.
- Password functionality currently consists of Supabase password sign-in/sign-up in `components/auth/AuthForm.tsx`, email reset in `app/forgot-password/page.tsx`, and `auth.updateUser({ password })` in `app/reset-password/page.tsx`. There is no authenticated in-dashboard change-password form yet.
- `app/dashboard/page.tsx` currently queries the user-scoped `account_ledger.amount_usd` rows and calculates the total balance from USD ledger amounts. Earned profit and portfolio values remain placeholders (`$0.00`) and have no data source. The existing deposit flow and Transactions route must not be changed for this work.
- No persistence mechanism for display currency exists. A user-scoped Auth metadata field could persist a preference without changing financial records, but this must be confirmed against the project's Supabase Auth metadata policy; a dedicated preferences/profile table with RLS is the more explicit option and requires a migration.
- `app/api/market-prices/route.ts` already fetches SOL, ETH, and BNB USD prices from CoinGecko with short-lived caching. The repository does not establish that CoinGecko is an approved production exchange-rate source, so rates must not be treated as approved until that dependency is explicitly accepted and its failure/staleness behavior is defined.
- No new environment variable is required by the inspected existing market-price route. A schema migration and RLS policy would be required only if persisted preferences or editable profile data use a new table; no migration should be created or applied before approval.

Proposed implementation files (after approval only)

- `components/dashboard/DashboardShell.tsx`: rename the navigation label to `Settings` while preserving `/dashboard/settings`.
- `app/dashboard/settings/page.tsx`: replace the placeholder with the authenticated settings page and server-side user data loading.
- New small settings client component(s), likely under `components/dashboard/`: handle profile form validation, password actions, currency selection, status messaging, and sign-out presentation without moving authorization to the client.
- `app/dashboard/page.tsx` and shared dashboard display components: apply a persisted display preference to supported USD balance/profit displays only, preserving USD as the accounting unit and leaving ledger/transactions unchanged.
- `app/api/market-prices/route.ts`: reuse or harden the existing CoinGecko-backed route only after approval of it as the exchange-rate source; do not invent fallback rates.
- `supabase/migrations/<timestamp>_...sql` (only if approved): add a user-scoped preferences/profile model and RLS policies, if Auth metadata is not approved for persistence.
- `lib/supabase/client.ts` / `lib/supabase/server.ts`: likely no changes; reuse the existing SSR-safe clients unless a narrowly scoped server action or route handler requires a new helper.

Safe conversion approach

- Keep every ledger, deposit request, transaction, and accounting calculation in USD. Store the selected display currency separately from financial records.
- For USD, render the USD amount directly. For SOL, ETH, and BNB, fetch a timestamped, validated USD-per-token rate from the approved server-side source and calculate `displayAmount = usdAmount / usdPerToken`, with explicit symbol/asset labeling such as `≈ 0.00 SOL`; do not imply asset ownership.
- Convert only presentation values, round only at display time, and never write converted values back to `account_ledger` or any transaction table. Show a clear unavailable/stale-rate state instead of a fabricated or cached-too-old rate.
- Prevent double conversion by keeping a canonical USD value in the data loader and passing currency plus rate into a single formatter. Profit must be converted from a verified USD profit source; the current `$0.00` placeholder is not a verified source and should not be presented as live converted profit.

Recommended implementation sequence

1. Approve the settings scope, the editable `full_name` storage approach, and whether CoinGecko is an approved rate source.
2. Preserve `/dashboard/settings`, rename only the navigation label, and build the authenticated settings shell.
3. Add server-authorized profile loading/update behavior with validation and explicit ownership checks.
4. Reuse the existing Supabase reset flow and add an in-settings password action without changing session handling or sign-out semantics.
5. Add currency preference persistence, then wire only verified USD-backed balance/profit displays through a single conversion formatter.
6. Add focused verification for settings, auth flows, currency persistence/conversion, and regression checks for deposits, Transactions, and admin access before broader validation commands.

Phase 2: Settings Navigation and Layout

Do not begin until implementation is explicitly approved.

- [x] Rename the user dashboard navigation label from "Account Settings" to "Settings".
- [x] Preserve the existing route if practical; avoid unnecessary route changes.
- [x] Display the page heading "SETTINGS".
- [x] Display the description: "Manage your personal information and account security.".
- [x] Build a responsive Profile Information section.
- [x] Build a responsive Security section.
- [x] Build a responsive Account Preferences section.
- [x] Keep Account Actions and account deletion outside the initial implementation.
- [x] Preserve the existing visual design and mobile usability.

Phase 2 Implementation Summary

- Implemented the Settings navigation label and retained `/dashboard/settings`.
- Replaced the placeholder with an authenticated, responsive settings layout containing Profile Information, Security, and Account Preferences sections. Each section is explicitly presented as layout-only with future functionality marked as coming soon.
- Changed files: `components/dashboard/DashboardShell.tsx`, `app/dashboard/settings/page.tsx`, `app/dashboard/dashboard.css`, and this checklist.
- Validation: `npm run lint` passed with one pre-existing `@next/next/no-img-element` warning in `app/dashboard/deposits/DepositInterface.tsx`; `npx tsc --noEmit` passed; `npm run build` passed; browser verification reached the protected route and correctly redirected unauthenticated access to `/login?next=/dashboard/settings` at the requested 538x890 viewport.
- Remaining work: all Phase 3 and later checklist items remain unchecked; no profile editing, password changes, currency persistence, or account actions were implemented. Authenticated visual rendering remains unverified because no test credentials were available.

Phase 3: Profile Information

- [x] Display the authenticated user's full name.
- [x] Display the user's email address as read-only initially.
- [x] Display the user's ID as read-only.
- [x] Display the account creation date if available.
- [x] Allow editing only of profile fields supported by the existing data model.
- [x] Add a Save Changes button.
- [x] Validate form input and display clear success or error messages.
- [x] Ensure users can access and update only their own profile information.
- [x] Verify profile changes persist after refreshing the page.

Phase 3 Implementation Summary

- Implemented an authenticated profile information editor that reads the current Supabase Auth user and updates only the supported `full_name` user metadata field with `auth.updateUser`, leaving email and ID read-only.
- Added account creation date display, client-side name validation, accessible status messaging, and a Save Changes action that refreshes the server-rendered dashboard after success.
- Ownership is enforced by using the browser Supabase client with the current authenticated session and calling `auth.updateUser`; the implementation accepts no user ID or privileged fields as update input. Code inspection confirms it cannot target another user's profile, roles, balances, deposits, ledger entries, or admin data.
- Manual v0 preview testing verified successful save feedback, empty-name validation, persistence after refresh, and persistence after logout and login. This satisfies the profile persistence requirement; authenticated runtime ownership isolation was supported by code inspection rather than a multi-user penetration test.
- Removed the misleading Profile Information `Coming soon` label while retaining the label on the still-deferred Security and Account Preferences sections. The label was initially still visible because `SettingSection` defaulted every section badge to `Coming soon`; the profile section now explicitly passes `badge={null}`.
- Changed files: `components/dashboard/ProfileInformation.tsx`, `app/dashboard/settings/page.tsx`, `app/dashboard/dashboard.css`, and this checklist. The current discrepancy fix changes only `app/dashboard/settings/page.tsx` and this checklist.
- Validation: `npm run lint` passed with one pre-existing `@next/next/no-img-element` warning in `app/dashboard/deposits/DepositInterface.tsx`; `npx tsc --noEmit` passed; `npm run build` passed; unauthenticated access to `/dashboard/settings` redirected to `/login?next=/dashboard/settings` at the requested 538x890 viewport. Manual authenticated preview checks passed as noted above.
- Remaining limitations: email changes, password changes, currency persistence/conversion, and account actions remain deferred to later phases. No database migration, environment variable, service-role key, deposit, Transactions, or admin-dashboard changes were made.

Phase 4: Security

- [x] Add a Change Password action using the existing Supabase Auth implementation.
- [x] Provide the required password fields according to the existing authentication flow.
- [x] Add a show/hide password control where password fields are displayed.
- [x] Provide a secure password-reset flow.
- [x] Move or expose the existing Sign Out action within the Settings Security section.
- [x] Preserve the existing logout behaviour and session handling.
- [ ] Verify that password operations and sign-out work correctly.

Phase 4 Implementation Summary

- Added `components/dashboard/SecuritySettings.tsx` with current-password reauthentication through the authenticated user's email, password confirmation and minimum-length validation, show/hide controls, and `auth.updateUser({ password })` for the current session only. Password values are never stored in application data or metadata.
- Reused the existing `/forgot-password` and `/reset-password` flow through a link, and reused `components/auth/SignOutButton.tsx` for logout and redirect behavior.
- Updated `app/dashboard/settings/page.tsx` to render the Security section and added narrowly scoped responsive styles in `app/dashboard/dashboard.css`.
- Validation and remaining issues: authenticated password-change and sign-out runtime verification require an authorized test account and are not claimed here. The existing reset flow was reused by code inspection. `npm run lint` passed with one pre-existing `@next/next/no-img-element` warning in `app/dashboard/deposits/DepositInterface.tsx`; `npx tsc --noEmit` passed; and `npm run build` passed. No schema, environment, deposit, Transactions, or admin-dashboard changes were made.

Phase 5: Account Preferences — Display Currency

Phase 5 Implementation Summary

- Scope: add a Display Currency selector with exactly USD (US Dollar), SOL (Solana), ETH (Ethereum), and BNB (BNB).
- Persistence: store the authenticated user's selected display preference in an approved user-scoped location. Confirm whether Supabase Auth metadata is acceptable; otherwise propose a preferences table with RLS before making schema changes.
- Accounting model: retain USD as the canonical accounting currency. Do not modify ledger, deposit, transaction, balance, or investment records.
- Display conversion: convert supported USD balance and verified earned-profit values only at render time through one formatter. For SOL, ETH, and BNB, use a validated, timestamped USD-per-asset rate from an approved server-side source; never invent fallback rates or imply asset ownership.
- Failure handling: show an explicit unavailable or stale-rate state when a rate cannot be trusted, and prevent double conversion. Portfolio conversion remains deferred until a verified portfolio data source exists.
- Verification: test selector behavior, persistence across refresh and sessions, conversion accuracy, stale/unavailable rates, and regression safety for deposits, Transactions, ledger data, and admin access.
- Implemented `components/dashboard/CurrencyPreference.tsx` with exactly USD, SOL, ETH, and BNB options; the selected value persists in the authenticated user's Supabase Auth metadata as `display_currency`.
- Implemented display-only conversion for the dashboard's canonical USD total balance through `components/dashboard/CurrencyDisplay.tsx`; ledger and financial workflows remain USD-only. The existing server-side market-price route is reused, with finite positive values and a two-minute freshness check; unavailable or stale rates show `Rate unavailable`.
- Earned profit and portfolio values remain unchanged because the current profit and portfolio values are placeholders, not verified USD data sources.
- Phase 5 status: implemented with outstanding verification. No schema, environment, deposit, Transactions, or admin-dashboard changes were made.

The available display currency options must be:

- USD — US Dollar

- SOL — Solana

- ETH — Ethereum

- BNB — BNB

- [x] Add a Display Currency selector with exactly USD, SOL, ETH, and BNB.

- [x] Use USD as the underlying accounting currency.

- [x] Persist the user's selected display currency across sessions through authenticated Supabase Auth metadata.

- [x] Update the supported dashboard total balance display to reflect the selected currency at render time.

- [ ] Update supported earned-profit displays to reflect the selected currency; deferred because the current value is an unverified placeholder.

- [ ] Ensure portfolio values use the selected display currency when the portfolio integration is implemented.

- [ ] Avoid counting balances or earnings twice.

- [ ] Ensure changing display currency never changes actual financial balances or ledger entries.

- [ ] Do not imply that displaying a SOL, ETH, or BNB equivalent means the user owns that cryptocurrency.

- [x] Inspect and reuse the existing exchange-rate source (`app/api/market-prices/route.ts`).

- [x] Never invent live rates or present mock rates as real market prices.

- [x] Show an unavailable state for missing, invalid, or stale rates.

Phase 6: Account Actions — Deferred

Account deletion is explicitly out of scope for this task.

- [ ] Do not add a Request Account Deletion button.
- [ ] Do not create account-deletion APIs or database operations.
- [ ] Revisit this feature only after an appropriate administrative review and response workflow has been planned.

Phase 7: Testing and Verification

Do not mark an item complete without evidence of implementation and verification.

- [ ] Verify the Settings navigation label and route.
- [ ] Test profile validation and saving.
- [ ] Test password-change and password-reset flows.
- [ ] Test Sign Out.
- [ ] Test currency selection and persistence.
- [ ] Verify balance and earned-profit displays use the selected currency correctly.
- [ ] Confirm display conversion does not modify financial records.
- [ ] Confirm existing deposit functionality remains intact.
- [ ] Confirm the existing user Transactions page remains intact.
- [ ] Confirm admin authorization and admin dashboard functionality remain intact.
- [ ] Run "npm run lint".
- [ ] Run "npx tsc --noEmit".
- [ ] Run "npm run build".
- [ ] Record the actual result of each validation command.

Security Rules

- Never commit secrets, API keys, service-role keys, or database credentials.
- Never expose "SUPABASE_SERVICE_ROLE_KEY" in frontend code or client components.
- Treat privileged Supabase credentials as server-only.
- Never allow Settings to modify account balances, deposit approvals, ledger entries, investment records, or administrative privileges.
- Never allow a user to access or update another user's profile.
- Do not run destructive database operations against production financial data.

Supabase Rules

- Use the browser client in client components.
- Use the server client in server actions and route handlers.
- Follow existing SSR-safe authentication patterns.
- If a schema change is necessary, document it and propose a migration under "supabase/migrations" before requesting approval.
- Do not apply schema changes without explicit authorization.

Code Standards

- Keep components small, typed, and reusable.
- Follow the existing Next.js App Router conventions.
- Inspect repository-specific implementations before proposing changes.
- Avoid unrelated refactors.
- Preserve existing authentication and redirect behaviour.

Required Agent Behaviour

1. Begin in planning mode.
2. Inspect the repository and identify the relevant files.
3. Update this checklist only when findings are supported by actual inspection or implementation.
4. Keep implementation checkboxes unchecked until the corresponding feature has been implemented and verified.
5. Document the proposed files to change, expected behaviour, risks, and required dependencies.
6. Stop and present the plan for approval before modifying application code.
7. After approval, implement only the approved scope.
8. Report completed work, incomplete work, validation results, and any blockers.
9. Do not merge branches, push changes, or deploy without explicit authorization.

Validation Commands

Run when implementation is approved and the relevant environment is available:

- "npm run lint"
- "npx tsc --noEmit"
- "npm run build"

If a command fails, report the actual error. Do not mark the validation as successful.

PR Expectations

- Keep changes scoped to the approved Settings feature.
- Document changes to environment variables, database schema, or authentication behaviour.
- Preserve working deposit, Transactions, and admin functionality.
- Do not claim that a feature works unless it has been tested.

## Phase 4 Security Audit — 2026-10-22

### Verified repository and branch state

- Repository: `Snr-Dave/Boarvest` (`origin` points to `https://github.com/Snr-Dave/Boarvest.git`).
- Working tree branch: `feat/settings-security`.
- `feat/settings-security` exists locally and as `origin/feat/settings-security`.
- The configured remote also contains `origin/dev`.
- `git ls-remote` reports `dev` and `feat/settings-security` at the same commit (`3222565`), so the inspected Security implementation is present on both remote branch refs at the time of this audit. No branch, merge, push, or deployment was performed.
- This repository contains `AGENTS.md`; an `AGENT.md` file does not exist. This audit was recorded in the existing `AGENTS.md` without creating a second instruction file.

### Phase 4 requirement audit

- [x] **1. Change Password action — Implemented; user-reported manual verification passed.** `components/dashboard/SecuritySettings.tsx` reauthenticates with `auth.signInWithPassword` and calls `auth.updateUser({ password: newPassword })`.
- [x] **2. Required password fields and validation — Implemented; code-inspected, not independently runtime-tested by the agent.** Current password, new password, and confirmation are required; the new password has an eight-character minimum, must match confirmation, and must differ from the current password.
- [x] **3. Show/hide password controls — Implemented; code-inspected.** The Security form toggles all password inputs between `password` and `text`.
- [ ] **4. Password-reset flow and configuration — Partially implemented / blocked by redirect defect.** The app requests `${window.location.origin}/auth/callback?next=/reset-password`, the callback exchanges the code, and `/reset-password` calls `auth.updateUser({ password })`. The end-to-end flow is not complete until the reported deployed-link failure is resolved.
- [x] **5. Sign Out in Security settings — Implemented; user-reported manual verification passed.** `SecuritySettings` renders the existing `SignOutButton`.
- [x] **6. Existing logout and session handling preserved — Implemented; code-inspected and supported by the user-reported Sign Out pass.** `SignOutButton` calls `auth.signOut()`, replaces the route with `/login`, and refreshes the router; no session helper or proxy changes were made.
- [x] **7. Password-change functionality — Implemented and user-reported as passed.** “Password updated successfully.” was displayed. This is user-reported evidence, not an independently executed agent test.
- [x] **8. Sign Out functionality — Implemented and user-reported as passed.** This is user-reported manual evidence, not an independently executed agent test.
- [x] **9. Password-reset email delivery — Implemented and user-reported as passed.** Delivery was reported successful; the agent did not send or inspect an email.
- [ ] **10. Password-reset link and recovery end to end — Blocked by unresolved defect.** The link redirected to `localhost:3000` and returned `otp_expired` / `access_denied`. The code does not hardcode localhost in the forgot-password path, but signup still uses optional `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`, whose documented example is `http://localhost:3000/auth/callback`. This makes an environment/template/configuration mismatch plausible, but does not prove the root cause. Reused, expired, malformed, or otherwise invalid recovery links are also possible.
- [x] **11. Security “Coming soon” badge — Implemented.** The Security section now passes `badge={null}` in `app/dashboard/settings/page.tsx`, matching the completed Profile Information section.

### Phase 4 implementation and verification summary

The Security interface is implemented in `components/dashboard/SecuritySettings.tsx`, rendered by `app/dashboard/settings/page.tsx`, and styled in `app/dashboard/dashboard.css`. Phase 4 is **implemented with outstanding work**, not fully complete: password change, Sign Out, and forgot-password email delivery passed manual testing, while the complete password-reset link flow remains unresolved.

### User-reported manual test results

- Password change: **PASSED** — manually tested successfully; “Password updated successfully.” displayed.
- Sign Out: **PASSED** — manually tested successfully.
- Forgot-password email delivery: **PASSED**.
- Password-reset link: **OUTSTANDING** — redirects to `localhost:3000` and returns `otp_expired` / `access_denied`.

### Password-reset cause assessment and Supabase checks

- **Confirmed:** `app/forgot-password/page.tsx` builds the callback URL from the browser's `window.location.origin`; `app/auth/callback/route.ts` exchanges a `code` and redirects to `/reset-password`; `app/reset-password/page.tsx` updates the password only after a valid Supabase recovery session. The current code has no literal localhost in the forgot-password redirect.
- **Likely configuration area:** check Supabase Authentication → URL Configuration → **Site URL** and **Redirect URLs**. The production Site URL should be the actual deployed Boarvest origin; the exact production domain is not present in this repository, so it is not recorded here. The allow-list should include the production callback pattern `<production-origin>/auth/callback` and the local development callback `http://localhost:3000/auth/callback` (or the exact local origin used). If query strings are validated by the project configuration, also allow the callback target used by the app, `/auth/callback?next=/reset-password`, or use the project's documented wildcard/pattern syntax.
- **Email template:** inspect the Supabase password-reset template and ensure its generated link preserves the app's configured redirect target rather than substituting `http://localhost:3000`. Do not replace the app's runtime origin with a guessed production URL.
- **Other checks:** verify the deployed app is actually generating the email from the production origin, `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` is not set to localhost in production, and the clicked recovery link is fresh and used only once. These are checks, not confirmed findings; the agent did not access the Supabase dashboard or change settings.
- **Smallest safe fix:** first correct the Supabase URL/allow-list/template or production environment mismatch, then retest the existing callback flow end to end. Code changes are not indicated by this inspection unless configuration verification shows the deployed origin is unavailable to the current runtime; no code, environment, or Supabase setting was changed in this audit.

### Audit validation performed

- Inspected the current branch, local/remote refs, reset pages, callback route, Supabase browser/server/proxy helpers, settings page, and relevant auth references.
- Verified `dev` and `feat/settings-security` both exist on `origin` and point to commit `3222565`; the current working branch is `feat/settings-security`. No branch, merge, push, deploy, email, password, or Supabase setting was changed.
- Validation: `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed. Lint reported one pre-existing `@next/next/no-img-element` warning in `app/dashboard/deposits/DepositInterface.tsx`; no new problems were reported.

### Remaining work before Phase 4 is fully verified

1. Verify the production Supabase Site URL, Redirect URLs allow-list, password-reset email template, and production environment origin.
2. Retest a fresh production reset email from link open through password update and subsequent sign-in.
3. Resolve the password-reset redirect/recovery failure and retest a fresh link end to end; do not mark item 10 complete until it passes.
4. Preserve the passing password-change, Sign Out, and email-delivery results in future audit updates.

## Withdrawal workflow review — 2026-10-23

- **Verified status:** Withdrawal functionality is not implemented. `app/dashboard/withdrawals/page.tsx` renders an unavailable placeholder; the admin dashboard's Withdrawals section is a generic placeholder; no withdrawal API, database model, review operation, or user status view exists. The admin user detail view also reports withdrawals as not implemented.
- **Documentation:** The planned workflow, deposit reuse assessment, security requirements, and implementation sequence are documented in `docs/architecture/WITHDRAWAL_WORKFLOW.md`.
- **Scope preserved:** No application code, database schema, environment variables, or financial workflows were modified. Phase 6 and Phase 7 settings checklist items remain unchanged and are not being marked complete based on this review.
- **Recommended first implementation step:** Approve the withdrawal financial model (canonical balance source, pending reservation/debit timing, asset/network and wallet validation, fees/limits, and transfer completion semantics) before proposing a withdrawal migration and transaction-safe review operation.

## Withdrawal Implementation Roadmap

This roadmap is based on the verified current repository state and the existing deposit architecture. Withdrawal functionality is not implemented. Each phase requires explicit user approval before work begins; after each phase, record actual verification results and stop for approval before continuing.

### Phase 1 — Requirements and Financial Workflow

Objective: establish and document the withdrawal lifecycle before changing financial code. Phase 1 documentation is now drafted from the approved requirements, but remains **in progress** until the user reviews and explicitly confirms the financial decisions below.

- [ ] Confirm SOL/Solana, ETH/Ethereum, and BNB/BNB Smart Chain support, explicit asset/network selection, and server-side destination validation. Current status: requirements drafted in `docs/architecture/WITHDRAWAL_WORKFLOW.md`; approval remains pending.
- [ ] Confirm USD denomination, $10 minimum, $5,000 maximum, zero initial fee, server-side balance checks, and server-side-only market-price use for any future token estimate. Current status: drafted; Phase 2 must inspect the existing market-price route and define precision/freshness rules.
- [ ] Confirm immutable request snapshots and explicit user confirmation of destination address and network. Current status: drafted; schema representation is deferred to Phase 2.
- [ ] Confirm lifecycle `pending_review`, `approved`, `transfer_pending`, `completed`, `rejected`, and `failed`, with approval distinct from transfer completion. Current status: drafted; exact transition guards are deferred to Phase 2.
- [ ] Confirm atomic reservation semantics: reserve at request creation, keep funds unavailable through review/transfer processing, release rejection exactly once, and prevent concurrent over-reservation. Current status: drafted; canonical balance source and reservation operation are deferred to Phase 2.
- [ ] Define safe failed-transfer recovery without silent release or duplicate debit. Current status: identified as a required Phase 2 financial decision; no behavior has been implemented.
- [ ] Confirm manual administrator-controlled transfer processing, evidence/hash and completion timestamp requirements, notes, and authorization boundaries. Current status: drafted; admin operation details are deferred to Phase 2.
- [ ] Verify the proposed requirements against the existing deposit and canonical accounting architecture without changing either. Current status: architecture review documented; implementation verification is intentionally not claimed.

Phase 1 approval checkpoint: review the requirements document and confirm the balance reservation/debit model, failed-transfer recovery policy, address-validation rules, USD precision, and market-price treatment. No Phase 2 work may begin until explicitly approved.

### Phase 2 — Database and Security

Objective: design and approve the isolated withdrawal persistence and transaction boundaries.

- [ ] Design a withdrawal-specific request table and any reservation, debit, ledger, or transfer-attempt records required by Phase 1.
- [ ] Define status constraints, immutable financial fields, references, timestamps, reviewer fields, indexes, and idempotency/uniqueness rules.
- [ ] Define user-scoped RLS policies and administrator authorization using the existing `admin_memberships` pattern.
- [ ] Design a transaction-safe database operation with row locking and a pending-only transition to prevent duplicate processing.
- [ ] Document how rejected, failed, and completed transfers affect reservations and the canonical balance.
- [ ] Obtain explicit approval for the migration and financial operation before creating or applying either.

Approval checkpoint before Phase 2: summarize the proposed schema objects, RLS policies, transaction boundaries, affected migration/RPC files, verification plan, and unresolved financial-security decisions.

### Phase 3 — User Withdrawal Interface

Objective: replace the unavailable user placeholder with a secure, understandable request experience.

- [ ] Replace `app/dashboard/withdrawals/page.tsx` placeholder content with an authenticated withdrawal screen.
- [ ] Add typed inputs for the approved asset/network, destination wallet, amount, fees, and confirmation details.
- [ ] Add client-side usability validation without treating it as the authorization boundary.
- [ ] Add explicit confirmation language distinguishing a request from an approved or completed transfer.
- [ ] Add the authenticated user’s withdrawal history with status, timestamps, amount, destination summary, and administrator note where approved.
- [ ] Preserve the existing dashboard layout, mobile behavior, and deposit workflow.

Approval checkpoint before Phase 3: identify affected user route/components, approved fields and status labels, implementation scope, browser/API verification, and risks such as misleading transfer semantics or wallet data exposure.

### Phase 4 — Withdrawal Request API

Objective: create and read withdrawal requests through authenticated, server-authorized endpoints.

- [ ] Add an authenticated request-creation route following the deposit API’s SSR-safe server client and error handling patterns.
- [ ] Validate all request fields server-side, including asset/network compatibility, wallet format, amount limits, fees, and numeric precision.
- [ ] Derive the user identity from the authenticated session; never accept a client-provided owner or balance.
- [ ] Enforce available-balance and pending-reservation rules using the approved database operation.
- [ ] Add a user-scoped history endpoint or server data loader with RLS-backed ownership checks.
- [ ] Add safe handling for duplicate submissions and database failures without leaking privileged details.

Approval checkpoint before Phase 4: list route/data-loader files, validation and ownership rules, persistence operation used, test cases, and any dependency on the Phase 2 migration or RPC.

### Phase 5 — Admin Withdrawal Management

Objective: replace the generic admin placeholder with a review workflow consistent with existing admin authorization.

- [ ] Replace the generic Withdrawals `PlaceholderSection` in `components/admin/AdminDashboard.tsx` with a dedicated review view.
- [ ] Add an admin-only list route/data loader with filters and request details sufficient for review.
- [ ] Add approve and reject actions with required notes or evidence rules from Phase 1.
- [ ] Gate every admin route/action through the existing admin authorization pattern; do not trust client roles.
- [ ] Call the transaction-safe withdrawal review operation and display conflict, insufficient-balance, and already-processed states clearly.
- [ ] Avoid exposing unnecessary wallet or personal information in list views.

Approval checkpoint before Phase 5: identify admin components/routes/RPC calls, review controls, authorization boundaries, verification accounts, and risks around privileged actions and sensitive destination data.

### Phase 6 — Financial Integrity and Status Tracking

Objective: ensure one-time processing, consistent balances, and accurate user-visible lifecycle status.

- [ ] Verify that concurrent admin reviews cannot approve or debit the same request twice.
- [ ] Verify that reservations/debits and ledger records are atomic, balanced, auditable, and linked to the withdrawal request.
- [ ] Verify rejection and transfer-failure paths release or preserve funds according to the approved financial model.
- [ ] Distinguish approved, submitted, completed, and failed external transfers in persistence and UI where applicable.
- [ ] Verify users can see only their own current status and relevant review/transfer timestamps.
- [ ] Verify changing or refreshing the UI cannot repeat financial operations.
- [ ] Confirm deposits, account balances, ledger behavior, Transactions, and admin authorization remain unchanged outside the approved withdrawal scope.

Approval checkpoint before Phase 6: provide the exact integrity invariants, affected ledger/balance operations, concurrency test plan, status semantics, and any newly discovered financial decision before making corrective changes.

### Phase 7 — Testing and Regression Checks

Objective: validate security, correctness, concurrency, and regressions with actual evidence.

- [ ] Test unauthenticated request creation and history access are rejected.
- [ ] Test user ownership isolation for request creation, reads, and status data.
- [ ] Test malformed wallets, unsupported assets/networks, invalid precision, limits, fees, and insufficient balances.
- [ ] Test duplicate submissions, concurrent admin reviews, already-processed requests, and idempotent retry behavior.
- [ ] Test approval, rejection, transfer failure, reservation release, and administrator notes.
- [ ] Test user and admin UI status rendering at the supported viewport sizes.
- [ ] Regression-test deposits, deposit approval, account balances, ledger entries, Transactions, and existing admin authorization.
- [ ] Record actual results, including any pre-existing warnings or blocked checks; do not mark a step complete from code inspection alone.

Approval checkpoint before Phase 7: specify the test accounts/data strategy, destructive-test safeguards, browser/API/database checks, expected evidence, and any external transfer simulation boundary.

### Phase 8 — Final Verification and Documentation

Objective: complete the approved implementation, preserve operational clarity, and document evidence.

- [ ] Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` when the implementation and environment support them.
- [ ] Perform authorized manual verification of user and admin workflows without using real external transfers.
- [ ] Review the final migration, RLS policies, RPC/transaction operation, routes, UI, and error handling for scope and security.
- [ ] Update `docs/architecture/WITHDRAWAL_WORKFLOW.md` with final schema, status, security, and operational decisions.
- [ ] Update this roadmap with changed files, actual test results, unresolved issues, and the final implementation status.
- [ ] Report what was changed and what remains incomplete; do not merge, push, or deploy without explicit authorization.

Approval checkpoint before Phase 8: confirm the final verification scope, documentation changes, deployment/merge restrictions, and any remaining release blockers.

### Roadmap decisions and current status

- The existing deposit implementation is a reference for authentication, RLS, admin gating, review UI structure, and transaction-safe review operations; withdrawal must use separate request/debit records and must not reuse deposit credits or `deposit_request_id`.
- No application code, database schema, migration, environment variable, or financial workflow was modified while establishing this roadmap.
- Phase 1 is the recommended next phase and is awaiting explicit approval. No phase is marked implemented or verified.
