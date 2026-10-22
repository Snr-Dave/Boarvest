# Pre-existing table compatibility test plan

This is a design-only plan. Every scenario requires a newly created disposable local Supabase project/database. Never use a production project, a linked project, a shared local database, or a database containing user data.

## Target verification and setup

1. Confirm the checked-out branch is `dev`, `supabase/config.toml` has `project_id = "boarvest-local"`, and the database endpoint reported by the local CLI is `127.0.0.1` or `localhost`.
2. Confirm remote variables such as `SUPABASE_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `DATABASE_URL`, and `POSTGRES_URL` are absent without printing their values.
3. Create a fresh disposable local database/project for exactly one scenario. Do not reuse it between scenarios.
4. Apply the migrations only after the scenario's pre-existing object has been created in that same disposable database. Record the first failing statement and SQLSTATE; do not repair or retry automatically.
5. Destroy/reset only that disposable local database after recording the result. Never use a remote reset or migration command.

## Scenarios and expected outcomes

### 1. Incompatible deposit table
After the admin-membership migration, create `public.deposit_requests` with incompatible column types and omit `network`, `reviewed_by`, and the expected constraints. Applying the deposit migration is expected to fail at the first statement that references a missing/incompatible object (commonly `42P01`, `42703`, or `42804`, depending on the exact defect). The migration must not be treated as a repair tool.

### 2. Existing table with missing named constraints
Create a structurally compatible `deposit_requests` table but omit one or more named checks. The migration is expected to add those constraints because its `DO` blocks catch only `duplicate_object` (SQLSTATE `42710`). Verify the final catalog against the empty-database baseline; any failure is a migration finding, not a reason to modify the persistent schema.

### 3. Conflicting ledger table
Create `public.account_ledger` with a conflicting type or missing required column. The migration is expected to stop with a catalog/type error such as `42703` or `42804`. No automated cleanup or destructive repair is permitted.

### 4. Existing admin membership policy
Create an incompatible `admin_memberships` table or policy before applying the first migration. Record whether `CREATE TABLE IF NOT EXISTS`, policy creation, or later references fail. This scenario is separate because the deposit migration depends on the membership table's `user_id` contract.

## Evidence and cleanup

For each scenario capture only non-sensitive evidence: scenario name, first failing statement, SQLSTATE, and catalog comparison. Prove the target is loopback before any reset or cleanup. Cleanup is limited to destroying the disposable local database created for that scenario. A failure to prove locality is a blocker and must stop the scenario.

Expected outcome: incompatible pre-existing schemas are reported clearly; no persistent or production schema is altered; no migration file is modified.
