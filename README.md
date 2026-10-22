# Boarvest

Boarvest is a Next.js 16 application with Supabase Auth, a protected user dashboard, and a server-authorized admin control center. The repository includes deposit-request and review code backed by Supabase migrations; live financial operation remains dependent on the migrations and deployment configuration being applied and verified safely.

## Implementation status

| Area | Status | Source of truth |
| --- | --- | --- |
| Public homepage and authentication UI | Completed | `app/page.tsx`, `components/auth/AuthForm.tsx` |
| Supabase SSR sessions and request refresh | Completed | `lib/supabase/{client,server,proxy}.ts`, `proxy.ts` |
| Protected user dashboard | Completed | `app/dashboard/page.tsx`, `components/dashboard/DashboardShell.tsx` |
| User deposit request UI and API | Completed in code; integration-dependent | `app/dashboard/deposits/`, `app/api/deposits/route.ts` |
| User transaction history | Completed in code; integration-dependent | `app/dashboard/transactions/`, `app/api/deposits/mine/route.ts` |
| Admin authorization | Completed in code; requires `admin_memberships` | `lib/auth/admin.ts`, `app/admin/page.tsx` |
| Admin deposit list and review | Completed in code; integration-dependent | `app/api/admin/deposits/`, `components/admin/AdminDashboard.tsx` |
| Admin user directory and selected details | Completed in code; requires service-role configuration | `app/api/admin/users/route.ts`, `components/admin/AdminDashboard.tsx` |
| Withdrawals, portfolio accounting, blockchain verification | Planned | `docs/ROADMAP.md` |

A code path is not considered production-ready solely because it builds. Confirm the relevant Supabase migrations, RLS policies, credentials, and integration tests before enabling financial operations.

## Architecture

```text
app/                         # App Router pages and Route Handlers
components/                  # Auth, dashboard, and admin UI
lib/auth/                    # Server-side authorization helpers
lib/supabase/                # Browser, server, and proxy clients
supabase/migrations/         # Chronological schema changes
supabase/tests/               # Local-only database test material
scripts/                     # Safe local test helpers
docs/architecture/           # Current implementation and design notes
```

Important routes:

- `/` — public homepage.
- `/login`, `/signup`, `/forgot-password`, `/reset-password` — Supabase Auth flows.
- `/dashboard` — authenticated user overview.
- `/dashboard/deposits` — deposit request interface.
- `/dashboard/transactions` — authenticated user's deposit history.
- `/admin` — server-protected administrator workspace.

Important APIs:

- `POST /api/deposits` — validates and creates an authenticated user's pending request.
- `GET /api/deposits/mine` — returns the current user's requests.
- `GET /api/admin/deposits` — returns admin deposit data and counts.
- `POST /api/admin/deposits/:id/review` — performs the authorized review operation.
- `GET /api/admin/users` — lists Auth users or returns one user's accounting details; requires an administrator and a server-only service-role key.
- `GET /api/market-prices` — retrieves market-price data for the deposit estimator.

## Setup

### Prerequisites

- Node.js compatible with Next.js 16.
- npm.
- A Supabase project for authentication and the repository's migrations.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

### Environment variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local`.

| Variable | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/public | Yes | Supabase project URL used by browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client/public | Yes | Supabase publishable key for browser and SSR clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/public/legacy | Not read by the current source | Supabase's legacy name for the public anon key. Do not configure it instead of `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` unless the application is explicitly migrated to read this name. |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Client/public | Optional | Development email-confirmation callback, normally `http://localhost:3000/auth/callback`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only/elevated secret | Required for admin user directory and privileged admin reads | Service-role credential used only in protected server Route Handlers. Never prefix it with `NEXT_PUBLIC_` or expose it to the browser. |
| `SUPABASE_SECRET_KEY` | Server-only/legacy alias | Optional | Legacy alias accepted by the admin deposit list; prefer `SUPABASE_SERVICE_ROLE_KEY`. |

To locate the public URL and keys, open the Supabase Dashboard, select the project, then go to **Project Settings → API**. Copy only the values into the matching local or deployment secret settings. Treat the service-role key as a high-privilege secret and store it only in server-side environment settings. On Vercel, add variables in the project settings for the required Development, Preview, and/or Production environments; do not place secrets in source control or client-exposed variables.

### Supabase schema

The migrations are chronological:

1. `supabase/migrations/20261017000000_create_admin_memberships.sql`
2. `supabase/migrations/20261019000000_create_deposit_accounting.sql`

Apply and test them only against an explicitly selected disposable local or non-production project. The repository's local test notes are in `supabase/tests/`.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The project contains no claim that production database state matches the migration files. Verify database readiness separately and never use fabricated balances, users, or deposits.

## Documentation

- [Application architecture](docs/architecture/APPLICATION.md)
- [Authentication and access control](docs/architecture/AUTHENTICATION-AND-ACCESS-CONTROL.md)
- [Admin dashboard](docs/architecture/ADMIN-DASHBOARD.md)
- [User dashboard](docs/architecture/USER-DASHBOARD.md)
- [Backend and financial data](docs/architecture/BACKEND-AND-FINANCIAL-DATA.md)
- [Deposit roadmap](docs/architecture/USER-DASHBOARD-AND-DEPOSIT-ROADMAP.md)
- [Roadmap](docs/ROADMAP.md)

## Safety boundary

Do not commit credentials, use service-role keys in client code, apply migrations to production without review, or treat a submitted deposit as a verified payment. Admin authorization is enforced server-side through `public.admin_memberships`; hiding an admin link is not authorization.
