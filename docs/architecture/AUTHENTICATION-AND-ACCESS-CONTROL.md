# Authentication and Access Control

## 1. Overview
Boarvest uses Supabase Auth for user identity and a small admin-membership table to gate administrator privileges. Authentication (who a user is) is handled by Supabase sessions; administrator authorization (what a user is allowed to access) is enforced server-side by checking public.admin_memberships.

## 2. User Authentication
- Client-side:
  - The sign-up / sign-in UI is implemented in components/auth/AuthForm.tsx. It uses the browser Supabase client (lib/supabase/client.ts) to call signUp(...) and signInWithPassword(...). Signup can include user metadata (full_name) and references an email redirect URL via an env var.
  - After a successful sign-in, the client asks the server for a post-login destination and then routes the user accordingly.
- Server-side:
  - Server components and routes use a server Supabase client (lib/supabase/server.ts) that reads cookies from Next.js and calls supabase.auth.getUser() to identify the current session and user.
  - A middleware/proxy (proxy.ts and lib/supabase/proxy.ts) synchronizes auth cookies between requests and responses so server-side code can reliably read sessions.

## 3. Administrator Access Control
- public.admin_memberships (migration source)
  - The repository contains supabase/migrations/20261017000000_create_admin_memberships.sql which defines the admin_memberships table used for admin authorization. The migration file documents the intended schema and policies; its presence in GitHub does not prove the migration has been applied to any live database.
  - Table schema (as declared in the migration):
    - user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE
    - created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
  - Row Level Security (RLS): the migration enables RLS on public.admin_memberships.
  - SELECT policy:
    - A policy named "Admins can view their own membership" is created:
      - ON public.admin_memberships FOR SELECT TO authenticated USING (auth.uid() = user_id)
      - This allows an authenticated user to read their own membership row only when auth.uid() equals that row's user_id.
  - Privilege revocations:
    - The migration revokes INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER on public.admin_memberships from anon and authenticated.
    - Because the migration defines no INSERT/UPDATE/DELETE policies for anon/authenticated, write operations from those roles are not permitted by the migration itself; modifying admin_memberships requires a higher-privileged role or an operator applying changes.

- Server-side admin check
  - getCurrentAdmin() (lib/auth/admin.ts) performs authorization server-side:
    1. Calls supabase.auth.getUser() to get the authenticated user's identity.
    2. Queries public.admin_memberships for a row with user_id = user.id.
    3. Returns the user only if a matching membership row exists; otherwise returns null.
  - Important: a valid Supabase session (authenticated user) does not automatically confer admin rights — the explicit admin_memberships lookup is required for administrator authorization.

## 4. Post-Login Routing
- The login flow in components/auth/AuthForm.tsx calls the server POST /auth/redirect (app/auth/redirect/route.ts) after a successful sign-in.
- /auth/redirect calls getCurrentAdmin() and returns JSON { destination: "/admin" } if the user is an admin, otherwise { destination: "/dashboard" }.
- The client navigates to the returned destination.
- Route protections implemented server-side:
  - /admin (app/admin/page.tsx):
    - If not signed in: redirect to /login?next=/admin.
    - If signed in but getCurrentAdmin() is falsy: respond with notFound() (404); the admin UI is not rendered for non-admins.
  - /dashboard (app/dashboard/page.tsx):
    - If not signed in: redirect to /login?next=/dashboard.
    - If the signed-in user is an admin (getCurrentAdmin() truthy): redirect to /admin so admins see the admin surface instead.

## 5. Session Handling and Route Protection
- proxy.ts and lib/supabase/proxy.ts provide a middleware that creates a server Supabase client tied to the incoming request's cookies, calls supabase.auth.getUser(), and mirrors any set-cookie values into the response. This helps server code read and refresh session cookies when server components cannot mutate cookies directly.
- lib/supabase/server.ts is the server-side client factory used in pages and server components; lib/supabase/client.ts creates the browser client used on the frontend.
- Distinction: session retrieval (supabase.auth.getUser()) identifies the signed-in user; it does not by itself authorize admin access. Administrator authorization requires getCurrentAdmin()'s explicit membership lookup.

## 6. Current Limitations
- Admin deposit listing and review are implemented in code, but live operation depends on the deposit-accounting migration, Supabase RLS/RPC state, and integration testing.
- The admin user directory uses the Supabase Auth Admin API and therefore requires `SUPABASE_SERVICE_ROLE_KEY` on the server. The key is not available to browser code.
- Withdrawal settlement, blockchain verification, reconciliation, and investment accounting are not implemented.
- Migration files document the expected schema and policies; they do not prove those changes are applied to a running Supabase project.

## 7. Relevant Files
- supabase/migrations/20261017000000_create_admin_memberships.sql — migration that defines public.admin_memberships and RLS/policy/privilege revocations.
- lib/auth/admin.ts — getCurrentUser() and getCurrentAdmin() server helpers; getCurrentAdmin queries admin_memberships.
- app/auth/redirect/route.ts — POST endpoint that returns the post-login destination (uses getCurrentAdmin()).
- components/auth/AuthForm.tsx — client-side signup/login UI and post-login routing logic.
- app/admin/page.tsx — server admin route: redirects unauthenticated users to login and returns 404 for non-admins.
- app/dashboard/page.tsx — server dashboard route: redirects unauthenticated users to login and routes admins to /admin.
- proxy.ts and lib/supabase/proxy.ts — middleware and helper to synchronize Supabase auth cookies/sessions.
- lib/supabase/server.ts and lib/supabase/client.ts — server and browser Supabase client factories.

---

Notes on verification
- I inspected the files listed above on the dev branch to prepare this document. I did not (and cannot) verify live database state, migration application, or Supabase project-level configuration from the repository alone.
