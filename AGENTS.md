<!-- BEGIN:nextjs-agent-rules -->This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in "node_modules/next/dist/docs/" (resolved from this file's directory; in monorepos, the "next" package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by "next dev" — verify at "node_modules/next/dist/server/lib/generate-agent-files.js". Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Boarvest — Agent Task Controller & Workflow Manager

This file is the single source of truth for **what work an AI agent may do next**, in what order, and with what evidence. It is a controller, not a backlog: a phase is a gate that opens only with owner approval.

Read this whole file before touching the repository. Update it (and only it) as work is verified.

---

## 0. Operating Protocol (mandatory)

### 0.1 Task status legend

Every task in every phase uses exactly one of these markers:

| Marker | Status | Meaning |
| --- | --- | --- |
| `- [ ]` | **Pending** | Not started, or started but not yet verified. |
| `- [x]` | **Complete** | Implemented **and** verified with evidence recorded in the phase summary. |
| `- [-]` | **Blocked** | Cannot be completed right now. A blocked task must name the blocker and what is required to unblock it. |

Do not use any other marker. `[-]` is never a substitute for "I did not check".

### 0.2 Before beginning any phase

1. Review this `AGENTS.md` in full.
2. Read the status of every task in every phase.
3. Determine what is complete, what is pending, and what is blocked.
4. Report that assessment, then work **only** on the current approved phase.

Never assume a phase is next just because the previous one is complete — approval is required.

### 0.3 After completing a phase

1. Update the checklist markers in this file for the tasks worked on.
2. Write a phase summary immediately below that phase's checklist:
   - completed tasks and the evidence for each,
   - blocked tasks and precisely what is required,
   - any task deliberately left pending and why,
   - files touched (documentation only unless code work was approved).
3. **STOP.**
4. Request owner approval before proceeding.

### 0.4 Controller rules

- Do **not** automatically move to the next phase.
- Do **not** skip phases, even when a later phase looks related or easier.
- Do **not** start a phase's work before its approval is recorded in §0.6.
- If a task is already implemented in the codebase: verify it, mark it `[x]`, and include the evidence in the summary. Implementation alone is not verification.
- If a task cannot be completed: mark it `[-]` and state exactly what is required (credential, owner decision, environment access, migration, etc.).
- Never mark `[x]` from code inspection alone when the task asks to *verify behaviour*. Behavioural claims need a runtime observation or the owner's explicit manual confirmation, and the summary must say which.
- Do not re-open completed tasks without a stated reason (regression, new evidence, owner request).

### 0.5 Documentation-only rule

This task is **documentation changes only**:

- Do not modify application functionality.
- Do not modify database schema or migrations.
- Do not modify Supabase configuration.

Agents may edit `AGENTS.md`. Any other change requires explicit owner approval and its own phase.

### 0.6 Approval log

Record each owner approval here before starting the phase. Do not pre-fill future approvals.

| Phase | Status | Approved by | Date |
| --- | --- | --- | --- |
| Phase 1 — Infrastructure | Pending approval | — | — |
| Phase 2 — Authentication | Not started | — | — |
| Phase 3 — Admin Access | Not started | — | — |
| Phase 4 — Deposits | Not started | — | — |
| Phase 5 — Future Features | Not started | — | — |

---

## 1. Project Snapshot (verified from the repository)

**Stack:** Next.js 16.4.3 (App Router), React 19, TypeScript 6, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), ESLint 10, Tailwind 4. Node.js 24 is the documented runtime; `.github/workflows/ci.yml` defines CI.

**Authentication and session plumbing**

- `components/auth/AuthForm.tsx` — signup, login, password fields, `full_name` stored in Auth `user_metadata`.
- `components/auth/SignOutButton.tsx` — `auth.signOut()` then navigate to `/login`.
- `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/proxy.ts` + `proxy.ts` (session refresh).
- `app/auth/callback/route.ts` — exchanges `code`, honours `next`; `app/auth/redirect/route.ts`; `app/auth/error/page.tsx`.
- Password reset: `app/forgot-password/page.tsx` → `/auth/callback?next=/reset-password` → `app/reset-password/page.tsx`.

**Admin authorization**

- `lib/auth/admin.ts` — `getCurrentAdmin()` reads `admin_memberships` for the signed-in user (server-only).
- `app/admin/page.tsx`, `app/api/admin/users/route.ts`, `app/api/admin/deposits/route.ts`, `app/api/admin/deposits/[id]/review/route.ts`.
- The admin user directory requires the server-only `SUPABASE_SERVICE_ROLE_KEY`.

**Deposits and accounting**

- `app/api/deposits/route.ts`, `app/api/deposits/mine/route.ts`, `app/dashboard/deposits/page.tsx`, `app/dashboard/transactions/page.tsx`.
- `app/api/admin/deposits/[id]/review/route.ts` calls the `review_deposit_request(p_deposit_id, p_decision, p_review_note)` RPC and maps missing-function errors (`42883`, `PGRST202`) and missing-table (`42P01`) to HTTP 503 "migration must be applied".

**Database schema (from `supabase/migrations/`)**

- `20261017000000_create_admin_memberships.sql` — `public.admin_memberships` + RLS: a user may view only their own membership row.
- `20261019000000_create_deposit_accounting.sql` — `public.deposit_requests`, `public.account_ledger`, and the functions `public.review_deposit_request`, `public.assert_deposit_ledger_integrity`, `public.reject_ledger_mutation`, `public.reject_reviewed_deposit_mutation`; RLS lets users see/create only their own pending deposits and see only their own ledger rows, while admins can view deposits and ledger.

Finding these files proves the schema is **declared**, not that it is **applied** to the Supabase project. Phase 1 verifies the deployed database.

**Environment variables** (see `.env.example`)

- `NEXT_PUBLIC_SUPABASE_URL` — project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public key (current name; `NEXT_PUBLIC_SUPABASE_ANON_KEY` is legacy and unused).
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; required by admin routes.
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` — optional local callback override (documented example is `http://localhost:3000/auth/callback`; a localhost value must never be used in production).

Never print, commit, or paste secret values. Presence checks only.

**Validation commands** (run from the repository root)

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `scripts/test-local-supabase.sh` — local Supabase smoke script.

Record the actual output of each command. Never mark validation complete when it failed or was not run.

---

## 2. Phase Controller

### Phase 1 — Infrastructure

- [ ] Verify Supabase connection
- [ ] Verify environment variables
- [ ] Verify database schema
- [ ] Verify admin_memberships table
- [ ] Verify deposit_requests table
- [ ] Verify account_ledger table
- [ ] Verify review_deposit_request RPC

**Evidence expected:** a successful authenticated read (e.g. an authenticated page or `select` returning rows/empty set rather than a configuration error), presence-only checks for each required variable, and confirmation that each table/RPC is reachable through the project's API (missing relations return `42P01`; missing functions return `42883`/`PGRST202`). Migration files alone do not satisfy "applied".

**STOP AND REQUEST APPROVAL**

#### Phase 1 Summary

_Not started. Awaiting owner approval._

---

### Phase 2 — Authentication

- [ ] Verify signup
- [ ] Verify login
- [ ] Verify logout
- [ ] Verify password reset
- [ ] Verify protected routes

**Evidence expected:** observed behaviour for each flow (redirect target, session cookie, visible result), plus `proxy.ts` / `lib/supabase/proxy.ts` behaviour for unauthenticated access to `/dashboard/*` and `/admin`. Note the known outstanding password-reset redirect defect recorded in §5; retest it end to end before marking it complete.

**STOP AND REQUEST APPROVAL**

#### Phase 2 Summary

_Not started. Awaiting owner approval._

---

### Phase 3 — Admin Access

- [ ] Verify admin account setup
- [ ] Verify admin_memberships authorization
- [ ] Verify admin dashboard access
- [ ] Verify admin API protection

**Evidence expected:** an authorised admin can load `/admin`; a signed-in non-admin gets no admin data (not merely a hidden link), and each `/api/admin/*` route returns 403 without an `admin_memberships` row. Confirm the service-role key is only read server-side.

**STOP AND REQUEST APPROVAL**

#### Phase 3 Summary

_Not started. Awaiting owner approval._

---

### Phase 4 — Deposits

- [ ] Verify deposit creation
- [ ] Verify pending deposits
- [ ] Verify deposit approval
- [ ] Verify deposit decline
- [ ] Verify accounting update behavior

**Evidence expected:** a deposit created as a user appears as pending, approval and decline each produce the correct `deposit_requests` state, and approval writes the matching `account_ledger` entry exactly once. Confirm the ledger mutation guards reject later edits and that review is admin-only. Create test records only; do not mutate existing financial data.

**STOP AND REQUEST APPROVAL**

#### Phase 4 Summary

_Not started. Awaiting owner approval._

---

### Phase 5 — Future Features

- [ ] Withdrawals
- [ ] Audit logs
- [ ] Reporting improvements
- [ ] Portfolio management

**Evidence expected:** this phase is implementation work, not verification. Each item needs an approved scope, its own design notes, and explicit authorisation before any code, schema, or configuration change. Until then every item stays `[ ]` Pending.

**STOP AND REQUEST APPROVAL**

#### Phase 5 Summary

_Not started. Awaiting owner approval._

---

## 3. Phase Summary Template

Use this shape for every phase summary so the next agent can resume without guessing:

```text
#### Phase N Summary — YYYY-MM-DD

- Completed: task text → evidence (command output, HTTP status, observed UI, owner confirmation).
- Blocked: task text → [-] reason → what is required to unblock.
- Pending on purpose: task text → why it was not attempted this phase.
- Files changed: AGENTS.md only (unless code work was approved).
- Next step: awaiting owner approval for Phase N+1.
```

No summary means the phase is not finished, even if the checkboxes look right.

---

## 4. Standing Rules

### 4.1 Security

- Never commit secrets, API keys, service-role keys, or database credentials.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or client components; keep privileged Supabase credentials server-only.
- Never allow settings or profile features to modify account balances, deposit approvals, ledger entries, investment records, or administrative privileges.
- Never allow a user to access or update another user's profile or another admin's data.
- Do not run destructive database operations against production financial data.
- Report secret presence, never secret values.

### 4.2 Supabase

- Use the browser client in client components, the server client in server actions and route handlers.
- Follow the existing SSR-safe authentication patterns.
- A schema change must be documented and proposed under `supabase/migrations/` before approval; never apply one without explicit authorisation.
- Do not change Supabase configuration (URLs, redirect allow-lists, email templates, RLS) as part of a documentation or verification phase — report the required change instead.

### 4.3 Code standards

- Keep components small, typed, and reusable; follow existing App Router conventions.
- Inspect repository-specific implementations before proposing changes; avoid unrelated refactors.
- Preserve existing authentication, redirect, and logout behaviour.

### 4.4 Validation and reporting

- Run the validation commands listed in §1 when a phase requires them, and paste their real results.
- If a command fails, report the actual error; do not mark the task complete.
- Distinguish agent-executed evidence, owner-reported evidence, and code inspection in every summary.
- Never claim a feature works unless it was tested.

### 4.5 Branch and PR expectations

- Do not merge branches, push, or deploy without explicit authorisation.
- Keep changes scoped to the approved phase; document any environment, schema, or authentication impact.
- Preserve working deposit, transactions, and admin functionality.

---

## 5. Archive — Completed Work (do not re-open without a reason)

This section records earlier, separately approved work so it is not redone. These are historical summaries, not active phase tasks.

- **Settings page (Phases 2–5 of the previous programme):** navigation label renamed to `Settings` with the route `/dashboard/settings` preserved; responsive Profile Information, Security, and Account Preferences sections built. Profile editing updates only Auth `full_name`; Security adds reauthenticated password change, show/hide controls, reset link, and the existing Sign Out; Account Preferences adds a USD/SOL/ETH/BNB display selector persisted in Auth metadata as `display_currency`, with display-only conversion of the total balance and a `Rate unavailable` state for missing/stale rates.
- **Deferred by design:** earned-profit and portfolio conversion (both are unverified `$0.00` placeholders), and account deletion (no UI, API, or database work).
- **Known outstanding defect:** the password-reset email link redirected to `localhost:3000` and returned `otp_expired` / `access_denied`. The code builds the callback from `window.location.origin`; the likely cause is a Supabase Site URL / Redirect URL / email-template mismatch, unproven. This must be retested in Phase 2 before password reset is marked complete.
- **Previous validation:** `npm run lint` (one pre-existing `@next/next/no-img-element` warning in `app/dashboard/deposits/DepositInterface.tsx`), `npx tsc --noEmit`, and `npm run build` passed at the time of those phases. Re-run before relying on them.
