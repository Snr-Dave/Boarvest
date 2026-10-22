<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Boarvest Agent Instructions

## Project overview
This repository is a Next.js 16 + TypeScript application with Supabase authentication and an investment platform dashboard for the Snr-Dave ecosystem.

## Stack
- Next.js 16
- React 19
- TypeScript
- Supabase
- ESLint
- Node.js 24

## Setup
- Use Node.js 24
- Run `npm install`
- Copy `.env.example` to `.env.local` and fill the required values
- Do not commit `.env.local`

## Required validation before completion
Run:
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Security rules
- Never commit secrets, API keys, service role keys, or database credentials
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or client components
- Treat all Supabase admin credentials as server-only
- Update `.env.example` whenever adding new env variables

## Supabase rules
- Use the browser client in client components
- Use the server client in server actions / route handlers
- Prefer SSR-safe patterns for auth session handling
- When changing DB schema, update the migration files under `supabase/migrations`

## Code standards
- Keep components small and typed
- Prefer reusable server/data utilities
- Avoid direct use of `window` in server code
- Respect existing Next.js app-router conventions
- Preserve authentication flow and redirect behavior

## PR expectations
- Keep changes scoped
- Do not add unrelated refactors
- Call out any change to env vars, schema, or auth behavior in the PR description

## Important note
This project uses a custom Next.js environment and may have breaking changes compared to older versions. Always verify the repo-specific implementation before changing framework behavior.
