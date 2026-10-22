# Boarvest Application Architecture

**Status: Current implementation map with planned boundaries.**

## Runtime structure

Boarvest uses the Next.js 16 App Router, React 19, TypeScript, and Supabase SSR clients. Authentication cookies are synchronized by `proxy.ts` through `lib/supabase/proxy.ts`. Server pages and Route Handlers use `lib/supabase/server.ts`; browser components use `lib/supabase/client.ts`.

```text
app/
├── page.tsx
├── login/page.tsx
├── signup/page.tsx
├── auth/{callback,error,redirect}/
├── dashboard/
│   ├── page.tsx
│   ├── deposits/{page.tsx,DepositInterface.tsx}
│   └── transactions/{page.tsx,TransactionsList.tsx}
├── admin/page.tsx
└── api/
    ├── deposits/{route.ts,mine/route.ts}
    ├── admin/deposits/{route.ts,[id]/review/route.ts}
    ├── admin/users/route.ts
    └── market-prices/route.ts
```

## Feature status

- Public homepage: **Completed**.
- Email/password Auth UI, callbacks, password reset, and session refresh: **Completed in code**.
- Protected user dashboard shell: **Completed**.
- Deposit request creation and user history: **Completed in code; requires the accounting schema and configured Supabase runtime**.
- Admin membership authorization: **Completed in code; requires `admin_memberships`**.
- Admin deposit review and ledger credit path: **Completed in code; requires `deposit_accounting` migration and integration testing**.
- Admin user list/details: **Completed in code; requires `SUPABASE_SERVICE_ROLE_KEY` server configuration**.
- Withdrawals, blockchain verification, investment returns, and referral commissions: **Planned**.

## Authorization boundaries

`app/admin/page.tsx` and every admin API independently call `getCurrentAdmin()` from `lib/auth/admin.ts`. The helper authenticates the session with `auth.getUser()` and checks `public.admin_memberships`. A browser-selected user ID is input, not authorization evidence. The service-role key is read only in the server-side admin users and deposit routes and is never imported by client components.

## Data and operational boundary

The migration files describe the database contract, but Git does not prove that a Supabase project has applied them. Treat pending/missing tables or functions as a deployment prerequisite, not as a reason to fabricate data. Use local or disposable integration testing before any production migration or financial operation.
