# ElectroCRM

> **Copyright © 2026 Russell Habib. All rights reserved.**
> This code is public for viewing only. No permission is granted to copy, modify, distribute, or use it, in whole or in part, without written permission from the author. Third-party components keep their own licenses (see [ATTRIBUTIONS.md](ATTRIBUTIONS.md)).

## What this project is for

This is a learning project. Its purpose is to teach me how to **train a specialized AI model using a larger AI model as its teacher**, from start to finish:

- generating training data with a teacher model, and making that data good enough to learn from
- checking quality automatically, so the teacher's mistakes don't become the student's habits
- fine-tuning a small open model on a free cloud GPU
- measuring whether training actually helped, against a baseline
- running the trained model locally and plugging it into a real application

The subject is electrical contracting: the model learns to read a job request like *"200A panel upgrade, 1960s house, panel's in the garage"* and plan the job the way an experienced electrician would. The application around it is ElectroCRM, a CRM for small electrical contractors.

## How the model works

```
 job request ──► fine-tuned small model ──► scope: tasks + labor hours,
 (plain words)   (Qwen 2.5 3B + LoRA)               parts + quantities,
                                                    permit needed?
                                                         │
                         pricing engine (real data) ◄────┘
                                  │
                                  ├─► job budget: what the job costs the shop
                                  └─► customer price: what the shop charges
```

The model decides **what** a job needs. It never produces dollar amounts. Prices change monthly and differ by city, so a model that memorized them would go stale and be confidently wrong. Instead, the pricing engine computes every number from data you can check:

| Number | Where it comes from |
| --- | --- |
| Labor hours, parts, quantities | The model (an estimate, labeled as one) |
| Electrician wage cost | U.S. Bureau of Labor Statistics wages for the shop's metro area (national if unavailable), or the shop's own figure |
| Part prices | The shop's supplier prices, adjusted for inflation with BLS price indexes for wire, devices, conduit, panels and more |
| Labor rate, markup, overhead, tax, permit fee | The shop's settings |

If a part has no price or the wage data is missing, the quote says so instead of guessing.

## How it's trained: teacher and student

1. **The teacher writes examples.** A large model (`gpt-oss-120b` on Groq's free tier) is given a random job type, building, writing style and complication, and writes a realistic job request plus the scope an experienced electrician would plan. Every example is marked as synthetic.
2. **Checks catch the teacher's mistakes.** The rules are in the prompt, and code checks every example: if a task installs a breaker, a breaker is in the parts list; conduit and fittings match in size; THHN footage is long enough for at least two conductors through the conduit; interconnected smoke alarms and 3-way switches get 3-conductor cable; and more. Failures go back to the teacher to fix. Reading batches by hand finds new kinds of mistakes, and those become new checks.
3. **The student learns on a free GPU.** A small open model (Qwen 2.5 3B) is fine-tuned with QLoRA on Kaggle. The same notebook runs the untrained model on the test set first, so every run can be scored before and after (full scoring runs locally with `src.evaluate`).
4. **The result runs locally.** Training exports an about 2 GB model file (Q4_K_M GGUF) that runs with Ollama on an ordinary laptop or a 6 GB graphics card.

**Where it stands:** the whole pipeline works end to end. A dry run trained on Kaggle, scored the baseline, and exported a model. The dataset is growing by about 50 examples a day within the free tier, toward about 500 for the first real training run. The baseline model already writes valid output, but it misses most of the parts a job needs and gets permits wrong, and closing that gap is what training is for.

**What the scores mean:** the test set is synthetic too, so its scores measure how closely the student matches the teacher, not how close it gets to real jobs. Real, hand-checked jobs are needed before any accuracy claim.

The full pipeline, commands and file guide are in [ml/README.md](ml/README.md).

## The application: ElectroCRM

A CRM for small electrical contractors (owner-operators and shops of about 1–15 people), built for electricians working from a truck or a job site on a phone. Its job is to take paperwork off their plate: estimates, scheduling, follow-ups and invoicing.

The trained model is meant to power the AI assistant here, turning a short description into a draft estimate built from the shop's own rates. The rule is that **the AI drafts and the human approves**: nothing goes to a customer, gets rebooked or moves money without an explicit click.

**Status:** working prototype. Customers, jobs, estimates, the schedule and the dashboard run against a real database. The AI assistant isn't connected to the model yet. Invoices, permits and job photos aren't built yet.

### What works today

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
| Model training (`ml/`) | Python, Groq (teacher), Unsloth QLoRA on Kaggle, Qwen 2.5 3B, Ollama/GGUF, BLS public data |
| Front end | React 18, Vite 6, TypeScript, Tailwind 4, shadcn/ui (Radix), react-router 7, recharts |
| Database and auth | Supabase (Postgres, Auth, Storage), run locally with the Supabase CLI and Docker |
| API | Hono on Node (`server/`), for agent tools and anything that needs secrets |

## Getting started

### The model pipeline

You need Python 3.10+, a free [Groq](https://console.groq.com) API key, and a free [Kaggle](https://www.kaggle.com) account with phone verification (for GPU access).

```bash
cd ml && pip install -r requirements.txt
```

Copy `ml/.env.example` to `ml/.env` and add your Groq key, then follow [ml/README.md](ml/README.md): fetch BLS data, generate examples, build the split, train on Kaggle, and score.

### The app

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

The model pipeline's commands (run from `ml/`) are listed in [ml/README.md](ml/README.md).

There's no linter, formatter, test runner, or CI yet. The recommended setup is in [CLAUDE.md](CLAUDE.md#tooling-to-add-planned).

## Project layout

```
ml/                model training pipeline
  src/             teacher data generation, quality checks, pricing engine, evaluation, Kaggle tooling
  catalog/         parts list (no prices), price-index mapping, example shop settings
  notebooks/       Kaggle QLoRA training notebook
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

- **Model:** grow the dataset to about 500 examples, run the first real training, compare against the baseline, then add hand-checked real jobs to the test set.
- **Connect the model to the app:** serve it from the Hono server and have it draft estimates for approval, priced by the pricing engine with the shop's own rates.
- **App schema:** invoices and payments, permits and inspections, job photos, agent drafts, and crew invites.
- **Tooling:** Vitest, database tests for row-level security, Biome, GitHub Actions CI, and removing unused Figma Make dependencies.

## Credits

The UI was first generated with Figma Make. It uses [shadcn/ui](https://ui.shadcn.com/) components under the MIT license. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md). Wage and price-index data comes from the U.S. Bureau of Labor Statistics (public domain).
