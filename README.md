# ElectroCRM

> **Copyright © 2026 Russell Habib. All rights reserved.**
> This code is public for viewing only. No permission is granted to copy, modify, distribute, or use it, in whole or in part, without written permission from the author. Third-party components keep their own licenses (see [ATTRIBUTIONS.md](ATTRIBUTIONS.md)).

A CRM for small electrical contractors (owner-operators and shops of about 1–15 people). It's built for electricians working from a truck or a job site on a phone, and its job is to take paperwork off their plate: estimates, scheduling, follow-ups, and invoicing.

The long-term goal is an **agentic** CRM: an AI assistant that drafts estimates, follow-up messages, and schedule changes from the shop's own records. The rule is that **the agent drafts and the human approves**. Nothing goes to a customer, gets rebooked, or moves money without an explicit click.

> **Status:** working prototype. Customers, jobs, estimates, the schedule, and the dashboard run against a real database. The AI assistant is not connected yet (planned: Groq). Invoices, permits, and job photos aren't built yet.

## What works today

- **Sign in** with email and password. Each shop's data is isolated by Postgres row-level security.
- **Dashboard** computed from real records: revenue from completed jobs, open jobs, completions this month, revenue by month, jobs by type, upcoming jobs, and a "Needs attention" list (unsent drafts, estimates waiting on the customer, approved estimates not yet converted, overdue scheduled jobs).
- **Customers:** list, search, add, edit, and view job history. Tap to call, email, or open the address in Maps.
- **Jobs:** create, edit, start, and complete (with actual hours).
- **Estimates:** build line items (materials, labor at the shop's rate, permits) with live totals using the shop's tax rate. Save as draft, mark as sent, record approved or declined, and convert an approved estimate into a job.
- **Schedule:** week view and month calendar.
- Built mobile first. Every page works at phone width.

"Mark as sent" only records that *you* sent the estimate. The app doesn't contact customers.

## Tech stack

| Part | Tools |
| --- | --- |
| Front end | React 18, Vite 6, TypeScript, Tailwind 4, shadcn/ui (Radix), react-router 7, recharts |
| Database and auth | Supabase (Postgres, Auth, Storage), run locally with the Supabase CLI and Docker |
| API | Hono on Node (`server/`), for agent tools and anything that needs secrets |

## Getting started

You need **Node 22+** and **Docker** running.

1. Install the front-end dependencies:

   ```bash
   npm install
   ```

2. Install the server dependencies from inside `server/`. Don't use `npm --prefix server install`, which adds a bad dependency.

   ```bash
   cd server && npm install
   ```

3. Start the local database (the first run downloads the Supabase images):

   ```bash
   npm run db:start
   ```

4. Apply the migrations and seed data:

   ```bash
   npm run db:reset
   ```

5. Generate the database types used by both type-checks:

   ```bash
   npm run db:types
   ```

6. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_ANON_KEY` to the anon key printed by `npx supabase status`.

7. Start the app at http://localhost:5173:

   ```bash
   npm run dev
   ```

Sign in with the demo account: **demo@electrocrm.local** / **password**. The seed data's dates are relative to the day you reset, so the schedule always has upcoming work. Run `npm run db:reset` any time to start fresh.

To also run the API on port 8787, which the front end doesn't call yet, copy `server/.env.example` to `server/.env`, fill in `SUPABASE_ANON_KEY`, then:

```bash
npm run server:dev
```

When you're done, stop the database:

```bash
npm run db:stop
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (doesn't type-check) |
| `npx tsc --noEmit` | Type-check the front end |
| `npm --prefix server run typecheck` | Type-check the server |
| `npm run db:start` / `db:stop` | Start or stop local Supabase |
| `npm run db:reset` | Reapply migrations and the seed |
| `npm run db:types` | Regenerate `server/src/database.types.ts` |
| `npm run server:dev` | Run the Hono API with reload |

There's no linter, formatter, test runner, or CI yet. The recommended setup is in [CLAUDE.md](CLAUDE.md#tooling-to-add-planned).

## Project layout

```
src/
  main.tsx, app/App.tsx, app/routes.tsx   boot and routes
  app/auth/        sign-in session and current shop
  app/data/        all database access (typed functions per table)
  app/pages/       one file per screen
  app/components/  layout, form dialogs, shadcn/ui primitives in ui/
  app/format.ts    money and date helpers
server/src/        Hono API: auth middleware, routes
supabase/
  migrations/      database schema, row-level security, views, RPCs
  seed.sql         demo shop and data
```

Pages never talk to Supabase directly. They go through `src/app/data/`, so the data source can change without touching the UI.

## Roadmap

Details are in [CLAUDE.md](CLAUDE.md).

- **AI agent (Groq, server-side):** estimate from a description, then follow-ups, scheduling suggestions, and job-prep materials lists. Every output is saved as a draft for approval.
- **Schema:** invoices and payments, permits and inspections, job photos, agent drafts, and crew invites.
- **Tooling:** Vitest, database tests for row-level security, Biome, GitHub Actions CI, and removing unused Figma Make dependencies.

## Credits

The UI was first generated with Figma Make. It uses [shadcn/ui](https://ui.shadcn.com/) components under the MIT license. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
