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

### 0.5 Scope rule

Documentation-only mode ended on 2026-11-03 by owner instruction. From then on:

- Agents may edit `AGENTS.md` at any time to record findings, statuses, and summaries.
- Any change outside `AGENTS.md` — database schema, Supabase configuration, application code, or migrations — requires an approved phase that explicitly authorises it.
- Migration files in `supabase/migrations/` are inputs. Never edit them to make an apply succeed; record the first failing statement and its SQLSTATE instead.
- No destructive database operation runs without an approved rollback plan in that phase.

The only change currently proposed (and **not** approved) is **Phase 1A — Database Migration Setup** in §2.

### 0.6 Approval log

Record each owner approval here before starting the phase. Do not pre-fill future approvals.

| Phase | Status | Approved by | Date |
| --- | --- | --- | --- |
| Phase 1 — Infrastructure | Approved — executed 2026-11-03 (2 complete, 5 blocked) | Owner | 2026-11-03 |
| Phase 1A — Database Migration Setup | **Proposed — awaiting approval** (no schema change applied) | — | — |
| Phase 2 — Authentication | Not started — blocked behind Phase 1A / Phase 1 re-run | — | — |
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

- [x] Verify Supabase connection
- [x] Verify environment variables
- [-] Verify database schema
- [-] Verify admin_memberships table
- [-] Verify deposit_requests table
- [-] Verify account_ledger table
- [-] Verify review_deposit_request RPC

**Evidence expected:** a successful authenticated read (e.g. an authenticated page or `select` returning rows/empty set rather than a configuration error), presence-only checks for each required variable, and confirmation that each table/RPC is reachable through the project's API (missing relations return `PGRST205`/`42P01`; missing functions return `42883`/`PGRST202`). Migration files alone do not satisfy "applied".

**STOP AND REQUEST APPROVAL**

#### Phase 1 Summary — 2026-11-03

**Result: blocked on the database schema.** 2 of 7 tasks complete, 5 blocked. No application code, migration, or Supabase configuration was changed.

**Completed**

- `[x]` **Verify Supabase connection.** Evidence: from inside the running `web` container, `GET {project}/auth/v1/health` returned **200** and `GET {project}/rest/v1/` returned **200** with a parseable OpenAPI document. The configured URL is HTTPS on a `*.supabase.co` project, not the local placeholder.
- `[x]` **Verify environment variables.** Evidence: presence and shape checked without reading values. `NEXT_PUBLIC_SUPABASE_URL` present — https, `supabase.co`, 20-character project ref, not `127.0.0.1`; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` present — `sb_publishable_*`, 46 characters; `SUPABASE_SERVICE_ROLE_KEY` present — JWT shape, 219 characters. No placeholder values are in effect.

**Blocked**

- `[-]` **Verify database schema.** The PostgREST OpenAPI document at `/rest/v1/` exposes only `/` and zero definitions: the `public` schema is empty, so no migration object is live.
- `[-]` **Verify admin_memberships table.** `404 PGRST205` — `Could not find the table 'public.admin_memberships' in the schema cache`.
- `[-]` **Verify deposit_requests table.** `404 PGRST205` — `Could not find the table 'public.deposit_requests' in the schema cache`.
- `[-]` **Verify account_ledger table.** `404 PGRST205` — `Could not find the table 'public.account_ledger' in the schema cache`.
- `[-]` **Verify review_deposit_request RPC.** `404 PGRST202` — `Could not find the function public.review_deposit_request(p_decision, p_deposit_id, p_review_note) in the schema cache`; the OpenAPI document lists no `/rpc/review_deposit_request` path.

**Blocker.** Both files in `supabase/migrations/` are declarations only; neither has been applied to the hosted Supabase project. Probes used the service-role key, so the 404s reflect missing objects, not RLS.

**Required remediation (owner action — documentation-only scope forbids applying schema)**

1. Apply, in order, `supabase/migrations/20261017000000_create_admin_memberships.sql` then `supabase/migrations/20261019000000_create_deposit_accounting.sql` — planned and tracked as **Phase 1A — Database Migration Setup** (proposed, §2). That phase needs owner approval and DB access before these tasks can be re-verified.
2. The second migration creates `deposit_requests`, `account_ledger`, `review_deposit_request`, and the guard functions `assert_deposit_ledger_integrity`, `reject_ledger_mutation`, `reject_reviewed_deposit_mutation`. The guards are trigger functions and are not REST-exposed; they are verified indirectly in Phase 4.
3. If the tables still return `PGRST205` afterwards, reload the API schema cache with `NOTIFY pgrst, 'reload schema';`.
4. Re-run the Phase 1 probe; a `200` on each table read (service role) and `/rpc/review_deposit_request` in `/rest/v1/` closes the five remaining tasks.
5. Phase 3 additionally needs an `admin_memberships` row for the administrator's user id; that is an owner setup step, not part of this phase.

**Files changed:** `AGENTS.md` only. Probe scripts were run from `/tmp` inside the container and are not part of the repository.

**Next step:** awaiting owner remediation and approval to re-run Phase 1. Phase 2 has not started.

---

### Phase 1A — Database Migration Setup (Proposed)

**Status: proposed only. Nothing has been applied.** Created 2026-11-03 in response to the Phase 1 schema blockers. This phase is the approved-remediation path for the five blocked Phase 1 tasks.

**Purpose:** apply the two existing migration files to the hosted Supabase project safely, verify the resulting schema, and re-run the Phase 1 probe.

**Ordering:** Phase 1A → Phase 1 re-run → Phase 2. No later phase starts until Phase 1A is complete and Phase 1's blocked tasks are re-verified.

**Files under review (inputs — must not be edited):**

- `supabase/migrations/20261017000000_create_admin_memberships.sql`
- `supabase/migrations/20261019000000_create_deposit_accounting.sql`

#### Phase 1A Checklist

- [ ] Owner approves Phase 1A and the row in §0.6 is updated
- [ ] Confirm the execution channel and access (owner-run SQL editor, or CLI/`psql` with credentials)
- [ ] Pre-flight: confirm the target is the empty project from Phase 1 and that `public` exposes no objects
- [ ] Optional rehearsal on a disposable local Supabase (`supabase db reset`, then `supabase/tests/deposit-accounting.sql`)
- [ ] Apply `20261017000000_create_admin_memberships.sql` as a single transaction
- [ ] Apply `20261019000000_create_deposit_accounting.sql` as a single transaction
- [ ] Reload the PostgREST schema cache (`NOTIFY pgrst, 'reload schema';`)
- [ ] Verify tables: `admin_memberships`, `deposit_requests`, `account_ledger` with expected columns, 10 CHECK constraints, 3 indexes, RLS enabled
- [ ] Verify policies and grants: 6 RLS policies (1 + 3 + 2), no client write access to `account_ledger`, no client write access to `admin_memberships`
- [ ] Verify functions: 4 functions present, all triggers attached (including the deferred constraint trigger), `security definer` with empty `search_path`
- [ ] Verify execution grants: `authenticated` may execute `review_deposit_request`; `anon` may not; guard functions executable by no client role
- [ ] Re-run the Phase 1 probe and record the results in the Phase 1 summary
- [ ] Record the rollback plan as reviewed (not executed)

#### Objects that will be created

**Migration 1 — `20261017000000_create_admin_memberships.sql`**

- `public.admin_memberships`
  - `user_id uuid` primary key, `references auth.users(id) on delete cascade`
  - `created_at timestamptz not null default timezone('utc', now())`
- RLS enabled; policy `Admins can view their own membership` (`select` to `authenticated` where `auth.uid() = user_id`)
- `revoke insert, update, delete, truncate, references, trigger` from `anon` and `authenticated` — membership rows can only be provisioned by privileged SQL or the service role

**Migration 2 — `20261019000000_create_deposit_accounting.sql`**

- Extension `pgcrypto` (`create extension if not exists` — a no-op on Supabase; `gen_random_uuid()` is core since PostgreSQL 13 anyway)
- `public.deposit_requests` — `id`, `reference` (`DEP-` + 12 hex, unique), `user_id` → `auth.users` (cascade), `asset`, `network`, `requested_usd numeric(12,2)`, `estimated_token_amount numeric(30,12)`, `destination_wallet`, `status` (default `pending`), `created_at`, `reviewed_at`, `reviewed_by` → `auth.users`, `review_note`
- `public.account_ledger` — `id`, `user_id` → `auth.users` (cascade), `deposit_request_id` unique → `deposit_requests` (`on delete restrict`), `entry_type` (default `deposit_credit`), `amount_usd numeric(12,2)`, `created_at`, `created_by` → `auth.users`
- CHECK constraints (10): asset ∈ {SOL, ETH, BNB}; network ∈ {Solana, Ethereum, BNB Smart Chain}; asset↔network pairing; `requested_usd` between 10 and 5000; destination wallet fixed per asset; status ∈ {pending, approved, declined}; review-field consistency; ledger `entry_type = 'deposit_credit'`; ledger `amount_usd > 0`
- Indexes (3): `deposit_requests_user_created_idx`, `deposit_requests_status_created_idx`, `account_ledger_user_created_idx`
- RLS on both tables, 5 policies: users read/insert only their own pending deposits; users read only their own ledger; admins read all deposits and all ledger
- Grants: `account_ledger` — select only for `authenticated`, all writes revoked; no INSERT policy, so credits only arrive through the review RPC

#### Functions and triggers that will be created

- `public.review_deposit_request(p_deposit_id uuid, p_decision text, p_review_note text default null)` — `security definer`, `set search_path = ''`, returns `public.deposit_requests`. Verifies `auth.uid()` is in `admin_memberships`, validates the decision, locks the row with `for update`, blocks self-review, rejects repeat review (`40001`), and on approval inserts exactly one `account_ledger` credit. `execute` granted to `authenticated`; revoked from `public`/`anon`.
- `public.assert_deposit_ledger_integrity()` — `security definer` trigger function. On ledger insert: the credit must match an approved request (same user, amount, reviewer). On `deposit_requests`: approved ⇔ exactly one credit, pending/declined ⇔ no credit. Executable by no client role.
- `public.reject_ledger_mutation()` — `security definer` trigger function raising `42501` on any `update`/`delete` of `account_ledger` (append-only, enforced even for privileged callers).
- `public.reject_reviewed_deposit_mutation()` — `security definer` trigger function raising `42501` when a reviewed deposit's financial fields change.
- Triggers: `account_ledger_validate_insert` (before insert), `deposit_requests_credit_consistency` (constraint trigger, **deferrable initially deferred**, checked at commit), `account_ledger_append_only` (before update/delete), `deposit_requests_financial_fields_immutable` (before update).

#### Risks

1. **Order dependency.** Migration 2's admin policies reference `public.admin_memberships`. Applying it before migration 1 fails. Apply strictly by filename timestamp, in one session.
2. **Migration 1 is not re-runnable.** `create table if not exists` is safe, but `create policy "Admins can view their own membership"` has no `drop policy if exists` guard, so a second run fails with `42710`. Migration 2 is largely re-runnable (it drops its own policies/triggers and swallows `duplicate_object`). Record the apply in `supabase_migrations.schema_migrations` (CLI) or never re-run it manually.
3. **`if not exists` is not a repair tool.** If a compatible-but-different table pre-existed, the migration would keep it and only add named constraints. Phase 1 proved `public` is empty, so this risk is currently theoretical; `supabase/tests/preexisting-table-plan.md` documents the scenarios.
4. **Wallet addresses and asset names are baked into CHECK constraints.** Verified to match `lib/deposits/config.ts` exactly (SOL→Solana with `HxDW…aurT`; ETH→Ethereum and BNB→BNB Smart Chain with `0x41eb…1d62`). Any mismatch or a wallet rotation rejects every deposit insert with `23514` and needs a new migration. `requested_usd` is likewise clamped to 10–5000, so the UI must stay inside that band.
5. **The ledger is append-only with a single entry type.** A mistaken approval cannot be corrected by `update`/`delete` (both raise `42501`), and `account_ledger_entry_type_check` forbids any other entry type such as a reversal. Correction would require a schema change — an owner decision to accept, not a migration defect.
6. **Deferred consistency check.** `deposit_requests_credit_consistency` is checked at `commit`, so a status change without the matching credit fails late in the transaction rather than at the statement. Correctness is preserved; error reporting is less immediate.
7. **Grant assumptions.** Neither migration grants `SELECT` on `deposit_requests` or `admin_memberships` to `authenticated`; both rely on Supabase's default privileges for the `public` schema. If those defaults were changed on the project, reads would fail with `42501`. Covered by the verification step.
8. **No admin rows are seeded.** Until an `admin_memberships` row exists for the owner's user id (a Phase 3 setup step, service-role only), the admin dashboard and the review RPC deny everyone.
9. **Stale schema cache.** PostgREST may keep returning `PGRST205`/`PGRST202` for a few seconds after DDL; `NOTIFY pgrst, 'reload schema'` plus a short wait resolves it.
10. **No destructive statements.** Neither file drops a table, deletes rows, or alters `auth`. The blast radius of a failure is partial DDL, not data loss.

#### Are these migrations safe on an empty Supabase project?

**Yes, with the ordering rule.** Both files are additive and create-only; they reference only `auth.users` (always present) and each other. Phase 1 verified the project's `public` schema is empty, so there is no data to lose, no name collision, and no pre-existing user content at risk. The realistic failure mode is an incomplete apply — mitigated by running each file in a single transaction and verifying the catalog afterwards. Nothing here is reversible-by-data-loss, so the only thing that can go wrong is schema state, and the rollback below removes all of it.

#### Migration plan (ordered — none of it executed yet)

1. Owner approves Phase 1A; update §0.6.
2. Choose the channel:
   - **Owner-run SQL editor** (no credentials leave your dashboard): paste each file in timestamp order, one at a time.
   - **CLI** (recommended, records migration history): `supabase link --project-ref <ref>` then `supabase db push`. This is the only channel that writes `supabase_migrations.schema_migrations` and prevents accidental re-runs.
   - **Direct `psql`** via the pooler connection string — requires a new secret (DB password), which the owner would add through the dashboard.
3. Pre-flight: re-confirm the target project is empty (`GET /rest/v1/` exposes only `/`), and that the admin's user id will be added later in Phase 3.
4. Optional rehearsal on a disposable local stack (`scripts/test-local-supabase.sh`; it refuses to run unless the branch is `dev` and the target is loopback). `supabase/tests/deposit-accounting.sql` is local-only and must never run against the hosted project — it writes synthetic `auth.users` rows.
5. Apply migration 1 as a single transaction; expect only table/policy/revoke notices.
6. Apply migration 2 as a single transaction; expect the extension no-op, two tables, ten checks, three indexes, five policies, four functions, four triggers.
7. Run `NOTIFY pgrst, 'reload schema';` and wait a few seconds.
8. Verify the catalog (tables, columns, constraints, indexes, RLS flags, policies, function attributes, grants) and the API surface (`/rest/v1/` lists the three tables and `/rpc/review_deposit_request`).
9. Do **not** run behavioural insert tests here: the negative cases need rows, and Phase 4 exercises them with the owner's own test deposit and cleanup. Phase 1A verifies structure and rejection *definitions*, not ledger behaviour.
10. Re-run the Phase 1 probe, update the Phase 1 summary, then **STOP** and request approval.

#### Rollback plan (documented, not executed)

If any step fails or the owner rejects the result, and the schema is still empty of user data:

```sql
-- order matters: dependents first
drop function if exists public.review_deposit_request(uuid, text, text);
drop function if exists public.assert_deposit_ledger_integrity() cascade;
drop function if exists public.reject_ledger_mutation() cascade;
drop function if exists public.reject_reviewed_deposit_mutation() cascade;
drop table if exists public.account_ledger;
drop table if exists public.deposit_requests;
drop policy if exists "Admins can view their own membership" on public.admin_memberships;
drop table if exists public.admin_memberships;
```

Leave the `pgcrypto` extension in place (it is shared infrastructure). If any row exists in either table, stop: deleting it would destroy financial records, and that requires its own approved phase.

**STOP AND REQUEST APPROVAL**

#### Phase 1A Summary

_Not started. Awaiting owner approval and an execution channel._

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
