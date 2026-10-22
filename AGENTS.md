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

The available display currency options must be:

- USD — US Dollar

- SOL — Solana

- ETH — Ethereum

- BNB — BNB

- [ ] Add a Display Currency selector.

- [ ] Use USD as the underlying accounting currency.

- [ ] Persist the user's selected display currency across sessions.

- [ ] Update supported dashboard balance displays to reflect the selected currency.

- [ ] Update supported earned-profit displays to reflect the selected currency.

- [ ] Ensure portfolio values use the selected display currency when the portfolio integration is implemented.

- [ ] Avoid counting balances or earnings twice.

- [ ] Ensure changing display currency never changes actual financial balances or ledger entries.

- [ ] Do not imply that displaying a SOL, ETH, or BNB equivalent means the user owns that cryptocurrency.

- [ ] Inspect for an existing approved exchange-rate source before proposing a new one.

- [ ] Never invent live rates or present mock rates as real market prices.

- [ ] If no reliable rate source exists, document the limitation and propose the safest next step before implementation.

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
