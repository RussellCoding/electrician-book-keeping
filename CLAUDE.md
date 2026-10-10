# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server. It needs `.env.local` (copy `.env.example`) and a running backend (`npm run db:start`).
- `npm run build`: production build. Vite doesn't type-check, so this passes even with type errors.
- `npx tsc --noEmit`: type-check the front end (`strict` is on; the root `tsconfig.json` covers `src/` plus the shared DB types). Run this after changes, since nothing else catches type errors.
- `npm --prefix server run typecheck`: type-check the server. Both type-checks fail until `server/src/database.types.ts` exists (`npm run db:types`).
- Backend (needs Docker): `npm run db:start`, `npm run db:reset` (reapplies migrations and the seed), `npm run db:types`, and `npm run server:dev` (`server/` has its own `package.json` and `.env`; see `server/.env.example`). Install server deps from inside `server/` (`npm install`); `npm --prefix server install` adds a bogus `"electrocrm": "file:.."` dependency.
- No linter, formatter, test runner, or CI is set up yet. See "Tooling to add (planned)" for the recommended setup. Ask before adding any of it, including the test framework.

## What this is

A learning project. Its main purpose is to teach the owner how to **train a specialized AI model using a larger AI model as its teacher**: generating synthetic training data, checking its quality, fine-tuning a small open model, measuring it against a baseline, and running it inside a real app. That work lives in `ml/` (see "Job scoper model (`ml/`)" below).

- **Explain as you go.** The owner is learning, so when working on `ml/`, say what each step does and why (what the teacher, checks, split, baseline or training run is for), and point out what to look for in results. Show real numbers from runs; never present a score without saying what it measures.
- **Be honest about results.** Scores on the synthetic test set measure agreement with the teacher, not real-world accuracy. Say so whenever results are reported.

The application the model serves is ElectroCRM: an agentic AI CRM for small, local electrical contractors (owner-operators and shops with roughly 1–15 people).

The users are electricians, not office staff. They work from a truck or a job site, often on a phone, and don't want to do data entry. The product is useful only if it takes paperwork off their plate. That means estimates, scheduling, follow-ups, and invoicing.

"Agentic" means the AI takes actions inside the app: it drafts estimates, proposes schedule changes, and writes customer messages. It doesn't just answer questions in a chat box.

## Product principles

- **The agent drafts and the human approves.** The agent must never send a customer message, change a booked appointment, send an estimate or invoice, or move money without an explicit approval click from the user. Show the user exactly what will happen before they confirm.
- **Use the shop's own data.** Estimates and suggestions should come from this contractor's past jobs, line items, and rates, not made-up market numbers. If there isn't enough data, the agent says so.
- **Never fabricate numbers.** Any figure the agent shows (revenue, percentages, satisfaction, material costs) must be computed from real records. When something is an estimate, label it as one.
- **Mobile first.** Every core flow has to work one-handed on a phone: view today's jobs, start or complete a job, add photos and notes, and send an estimate.
- **Keep it plain.** Use trade language. Avoid enterprise CRM jargon.

## Core domain

- **Customer**: residential or commercial, with contact info, address, and job history.
- **Job**: one type of installation, repair, maintenance, inspection, or upgrade. Status is scheduled, in-progress, completed, or cancelled. Each job has a priority, a scheduled time, estimated and actual hours, an assigned tech, notes, and photos.
- **Estimate**: line items covering materials, labor, and permits, plus tax. Status is draft, sent, approved, or rejected. An approved estimate converts into a Job.
- **Invoice**: generated from a completed job. Status is unpaid, paid, or overdue. *(Not built yet; see "Schema to add".)*
- **Tech / Crew**: the people jobs are assigned to. *(Partly built: `shop_members` roles and `jobs.assigned_to`; see "Schema to add".)*
- **Permit**: tied to a job, with status and inspection date. *(Not built yet; see "Schema to add".)*

Typical flow: lead → estimate → approved → job scheduled → job done → invoice → paid → follow-up or maintenance reminder.

## Agent capabilities (target)

Build these in this order. Each one is a tool the agent calls, and each tool's output goes through the approval step.

1. **Estimate from description.** The user types or speaks something like "200A panel upgrade, old house, kitchen remodel." The agent builds a draft estimate from past line items and the shop's labor rate.
2. **Follow-ups.** The agent flags unsent estimates, stale estimates, customers due for maintenance, and overdue invoices, then drafts the message for each.
3. **Scheduling.** The agent suggests time slots and groups nearby jobs together. It never rebooks anything without approval.
4. **Job prep.** The agent produces a materials list based on similar past jobs.

## Agent plan: Groq (not set up yet)

A plan to tackle later. Nothing is installed or configured in `server/`: no package, no env var, no routes. (Groq is already used in `ml/` as the teacher model for training data; that's separate from the app's agent.)

For "estimate from description", the target is the fine-tuned job scoper from `ml/` plus its pricing engine, not a general Groq model: the scoper produces the scope, and prices come from the shop's own rates and price list. It can be served by Ollama, which has an OpenAI-compatible API, so the `chat()` module below works for it unchanged. A general Groq model stays the plan for the other capabilities (follow-up messages, scheduling suggestions).

- **Provider:** Groq's free tier. Ask before switching providers or adding a second one.
- **Where it runs:** only on the Hono server (`server/`). The key goes in `server/.env` as `GROQ_API_KEY`, with the model id in `GROQ_MODEL`. Add both to `server/.env.example` and `server/src/env.ts` when this is built. Never call Groq from the browser and never put the key in a `VITE_` var.
- **Client:** Groq has an OpenAI-compatible chat completions API with tool (function) calling. Use plain `fetch` and parse the response with zod rather than adding `groq-sdk`: it's one endpoint, it avoids a dependency, and the same code works with other OpenAI-compatible providers. All of it lives in one module (e.g. `server/src/agent/llm.ts`) behind a small interface like `chat({ messages, tools }) → { text, toolCalls }`, so the provider can change without touching tools or routes.
- **Model:** pick a tool-calling model from Groq's current lineup at implementation time and read it from `GROQ_MODEL`. Don't hardcode model ids across files. Check Groq's docs and console for current models and free-tier limits; don't rely on numbers remembered from elsewhere.
- **Free-tier constraints to design for:**
  - Rate limits and daily token caps. Handle 429 (respect `retry-after`, back off, retry a little), then give the user a plain "Assistant is busy, try again in a minute" error instead of a stack trace.
  - Small prompts. Send only the shop's relevant records (matching past line items, labor rate, tax rate, the customer), not whole tables.
  - Data use. Check Groq's terms for the free tier before real customer data goes through it.
- **Architecture:**
  - Agent tools are plain typed functions in `server/src/agent/tools/`, separate from routes and from the LLM module. Each tool's input is a zod schema, and the same schema produces the JSON schema in the tool definition (zod 4 has `z.toJSONSchema`).
  - Tools read data with the user-scoped client (`c.get('db')`), so RLS applies. No service-role key.
  - Tool output is written as an `agent_drafts` row with status `proposed` (see "Agent drafts and approvals"). Nothing is applied directly. A separate approve endpoint or RPC applies the draft after the user clicks.
  - Don't trust model output for numbers. The model picks line items and quantities and writes text. Unit prices come from the shop's past line items and labor rate, and totals come from the `estimate_totals` logic (the server needs its own copy of `computeEstimateTotals` or computes totals after insert through the view). Validate every tool call's arguments with zod and reject anything that references records outside the shop.
  - If there isn't enough history to price something, the draft says so instead of guessing.
- **Build order:** follow "Agent capabilities (target)". Start with estimate from description: `POST /agent/estimate-draft` (body: description, optional customer id) creates a `proposed` estimate draft and returns it. This needs the `agent_drafts` migration first. The front end calls it with the session token and `X-Shop-Id`, shows the exact line items and totals, and only an approve click turns it into a real draft estimate.

## Current state

The project was generated by Figma Make. The front end now reads from and writes to Supabase.

- Stack: React 18, Vite 6, Tailwind 4, shadcn/ui (Radix), react-router 7, recharts, and lucide-react.
- MUI is also installed but unused. See "Tooling to add (planned)" for the full unused list.
- Pages live in `src/app/pages/`, routes in `src/app/routes.tsx`, the shell in `src/app/components/Layout.tsx`, and shadcn primitives in `src/app/components/ui/`.
- Boot path: `src/main.tsx` (shows an error instead of the app if env vars are missing) → `src/app/App.tsx` (`AuthProvider`, `RouterProvider`, the sonner `Toaster`) → `src/app/routes.tsx`. `/sign-in` is public. Every other page is a child route of `<RequireAuth><Layout/></RequireAuth>`: `RequireAuth` redirects to `/sign-in` without a session, and its `ShopProvider` loads the user's shop before rendering. `Layout` renders the sidebar (shop name, sign-out) and an `<Outlet>`. To add a page, add a child route there and a nav entry in `Layout.tsx`.
- The `@/` import alias points to `src/` (set in both `vite.config.ts` and `tsconfig.json`). Keep the `react()` and `tailwindcss()` plugins in `vite.config.ts`.
- Theme colors are CSS variables in `src/styles/theme.css` (shadcn tokens, including `.dark`). `src/styles/index.css` imports the font, Tailwind, and theme CSS files. Use these tokens instead of hardcoded colors.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (the Hono server), read in `src/app/env.ts`. `.env.example` is meant to be committed; local values go in the gitignored `.env.local`.
- Data access lives in `src/app/data/`. `supabase.ts` is the browser client (plus `unwrap` and `isUuid`). `customers.ts`, `jobs.ts`, `estimates.ts` and `shop.ts` are typed functions that take a `shopId`, query Supabase directly, and map rows to the domain types in `types.ts`. Totals and per-customer job counts and revenue come from the `estimate_totals` and `customer_summaries` views. Pages call them through `useAsync` (loading, error, `reload`) and show `components/QueryState.tsx` until data arrives. Pages never import `supabase` or row types directly.
- Writes: `createCustomer`/`updateCustomer`, `createJob`/`updateJob`/`startJob`/`completeJob`, and `createEstimate`/`setEstimateStatus`/`convertEstimateToJob`. Status changes are guarded by the current status and throw if no row changed. `computeEstimateTotals` mirrors the `estimate_totals` rounding for live previews. Shared form dialogs are in `components/` (`CreateEstimateDialog`, `CreateJobDialog`, `CustomerFormDialog`, `ConfirmDialog`). Nothing in the app contacts customers: "Mark as sent" only records that the user sent the estimate themselves.
- `src/app/format.ts` has the money and date helpers (`formatMoney`, `parseLocalDate`, datetime-local input conversion, `mapsUrl`).
- Auth: email and password through supabase-js (`src/app/auth/`). `useAuth()` gives the session, `signIn` and `signOut`. `useShop()` gives the current shop (`taxRate` as a fraction, `laborRate`, `timezone`), the user's role and display name. A user in several shops gets the one they joined first; there's no shop switcher. There's no sign-up or onboarding screen yet (`create_shop` exists in the DB).
- DB types: the front end imports `server/src/database.types.ts` type-only through the `@db-types` path in the root `tsconfig.json`. Don't copy the file.
- `package.json` has many unused Figma Make dependencies besides MUI, such as react-dnd, react-slick, and canvas-confetti. The confirmed-unused list is in "Tooling to add (planned)". Check usage again before relying on one or removing it.
- No model is connected. The AI Assistant page, the estimate generator card and the quick actions say so instead of showing canned answers. The dashboard's "Needs attention" list is computed from records (unsent drafts, estimates sent 7+ days ago, approved estimates not converted, scheduled jobs whose time has passed), not AI.
- Full stack: `npm install`, `npm run db:start` (`npm run db:reset` for fresh seed dates), copy `.env.example` to `.env.local` with the anon key from `npx supabase status`, then `npm run dev` and sign in as the demo user. Run `npm run server:dev` too once the front end calls the API. `index.html`, `src/main.tsx` and `tsconfig.json` were added when the code was moved out of Figma Make.
- Only the shadcn components the pages use are in `components/ui/` (alert-dialog, button, badge, card, dialog, input, label, select, sonner, textarea). Add others with the shadcn CLI as needed (there's no `components.json` yet, so the CLI will run `init` first).
- Backend (in progress): Supabase (Postgres, Auth, Storage) plus a Hono API in `server/`. The LLM provider is Groq (free tier), planned but not set up; see "Agent plan: Groq". Don't switch providers or add a second one without asking.
  - `supabase/migrations/` holds the schema. Every table has `shop_id`, and RLS (`is_shop_member`/`is_shop_owner`) isolates shops. Totals are computed in the `estimate_totals` and `customer_summaries` views, never stored. Estimate → job conversion is the `convert_estimate_to_job` RPC.
  - `supabase/seed.sql` is the mock data with dates relative to reset day. Demo login: `demo@electrocrm.local` / `password`.
  - The server runs queries with the caller's token (`createUserClient`), so RLS applies. Don't use the service-role key for request handling. Plain CRUD can go straight from the front end through supabase-js. The server is for agent tools, LLM calls, and anything that needs secrets.
  - `server/src/database.types.ts` is generated by `npm run db:types` and checked in. Regenerate and commit it with every migration.
  - The server's only routes so far are `/health`, `/me`, `POST /shops`, and `GET`/`PATCH /shop` (shop settings: tax rate, labor rate, timezone). `requireUser` attaches the user-scoped client as `c.get('db')`; `requireShop` resolves the shop from the `X-Shop-Id` header or the user's only membership. New routes follow `server/src/routes/shops.ts` (zod validation, `HTTPException` for errors).
  - Missing schema (invoices, permits, job photos, agent drafts and more) is listed in "Schema to add (planned)" below. The front end doesn't call the Hono server yet; when it does, send the session token and `X-Shop-Id`.

## Job scoper model (`ml/`)

A Python pipeline (separate from the app) that fine-tunes a small open model to turn a job description into a scope (tasks, labor hours, parts and quantities), plus a pricing engine that turns a scope into a job budget and customer price. See `ml/README.md`.

- The model never outputs prices. `ml/src/pricing.py` computes them from shop settings, the supplier price list (`ml/catalog/prices.csv`, gitignored) and BLS wage and price-index data (`python -m src.bls`). Parts without a price are reported missing, never guessed.
- Training data is synthetic, written by a teacher model (Groq free tier, `openai/gpt-oss-120b`) and marked `synthetic: true`. Scores on the synthetic test set measure agreement with the teacher, not real-world accuracy.
- One system prompt (`ml/src/prompt.py`) is shared by generation, training and inference; change it and the training data must be regenerated or rebuilt.
- `consistency_issues` in `ml/src/scope.py` rejects common teacher mistakes; add a check when review finds a repeated one.
- Training runs on Kaggle (`python -m src.kaggle_push data|train|status|output`, all private). Keys live in `ml/.env` and `~/.kaggle`; `ml/data/` and `ml/kaggle_output/` are gitignored.
- Run commands from `ml/`. Windows: pass `encoding="utf-8"` to every file read and write.

## Schema to add (planned)

A to-do list, not a design that's been built. Add each piece as a new migration in `supabase/migrations/` (don't edit the init migration), then `npm run db:reset` and `npm run db:types`. Follow the existing conventions:

- Every table has `shop_id` and a composite FK `(parent_id, shop_id)` to its parent, so children can't point across shops. Parents that get children need `unique (id, shop_id)`.
- RLS on every table: `is_shop_member(shop_id)` for day-to-day records, `is_shop_owner(shop_id)` for money settings and anything destructive where noted.
- Statuses are enums. Money is `numeric(12,2)`. Totals live in `security_invoker` views, never in columns.
- Multi-step writes are `security invoker` RPCs with `set search_path = ''`, with execute revoked from `public`/`anon` and granted to `authenticated`. Only bootstrap and RLS helpers (`create_shop`, `is_shop_member`, `is_shop_owner`) are `security definer`.
- Add seed rows to `supabase/seed.sql` with dates relative to reset day, and add a data module plus domain types in `src/app/data/`.

### Invoices

- Enum `invoice_status`: `draft`, `unpaid`, `paid`, `void`. Don't store "overdue". Derive it in the view as `status = 'unpaid' and due_date < current_date` (in the shop's time zone) so it can't go stale.
- `invoices`: `id`, `shop_id`, `customer_id`, `job_id` (nullable, unique while not void), `number` (per-shop sequence, unique `(shop_id, number)`), `status`, `tax_rate` (copied from the job's estimate or the shop, like estimates), `issued_at`, `due_date`, `sent_at`, `voided_at`, `notes`, `created_at`.
- `invoice_items`: same shape as `estimate_items` (`kind`, `description`, `quantity`, `unit_price`, `position`). Copy them from the estimate at creation, so later estimate edits don't change a sent invoice. Extra work found on the job gets added as new lines.
- `payments`: `id`, `shop_id`, `invoice_id`, `amount` (> 0), `method` enum (`cash`, `check`, `card`, `ach`, `other`), `reference` (check number, etc.), `received_at`, `recorded_by`. Recording a payment is a manual entry by the user; nothing moves money.
- View `invoice_totals`: `subtotal`, `tax`, `total` (same rounding as `estimate_totals`), `amount_paid`, `balance`, `is_overdue`.
- RPC `create_invoice_from_job(p_job_id, p_due_date)`: job must be `completed` and not already invoiced (non-void). Copies the estimate's line items if the job came from one, otherwise one labor line from `jobs.price`. Returns the invoice id.
- RPC `record_payment(p_invoice_id, p_amount, p_method, ...)`: inserts the payment and flips the invoice to `paid` when the balance reaches 0, in one transaction.
- Owner-only: voiding an invoice and deleting payments.
- Once this exists, switch revenue (dashboard and `customer_summaries.completed_revenue`) from completed jobs' agreed `price` to payments received, and drop the "Revenue ... until invoices exist" known issue.

### Permits

- Enum `permit_status`: `not-needed`, `to-apply`, `applied`, `issued`, `closed`. Enum `inspection_result`: `passed`, `failed`, `partial`.
- `permits`: `id`, `shop_id`, `job_id`, `permit_number`, `jurisdiction` (city or county AHJ), `kind` (e.g. electrical, service change), `status`, `applied_at`, `issued_at`, `expires_at`, `fee` (numeric(12,2)), `notes`. A job can have several permits.
- `permit_inspections`: `id`, `shop_id`, `permit_id`, `kind` (rough-in, final, service release), `scheduled_at`, `result` (null until done), `inspector`, `notes`. A failed inspection gets a new row for the re-inspection rather than overwriting.
- Show upcoming inspections on the schedule and today's jobs.

### Job photos

- Storage bucket `job-photos`, private. Path convention: `{shop_id}/{job_id}/{photo_id}.{ext}`.
- Storage RLS on `storage.objects` for that bucket: select/insert/delete allowed when `is_shop_member(((storage.foldername(name))[1])::uuid)`. Serve images through signed URLs.
- `job_photos`: `id`, `shop_id`, `job_id`, `storage_path` (unique), `caption`, `taken_at` (from EXIF or upload time), `uploaded_by` (auth.users), `created_at`. Deleting the row should delete the object (do it in the data module or a server route; there's no cascade from Postgres to Storage).
- Upload has to work from a phone camera, one-handed, and survive a bad signal (retry, don't lose the photo).

### Agent drafts and approvals

Makes "the agent drafts, the human approves" a record, not just a UI rule.

- Enums `agent_draft_kind`: `estimate`, `message`, `schedule-change`, `materials-list`, `invoice`. `agent_draft_status`: `proposed`, `approved`, `rejected`, `applied`, `failed`.
- `agent_drafts`: `id`, `shop_id`, `kind`, `status`, `payload` (jsonb, the exact thing that will happen: estimate lines, message text and recipient, old and new times), `summary` (one plain line for the list), `reason` (why the agent suggests it and which records it used), links to the subject (`customer_id`, `job_id`, `estimate_id`, `invoice_id`, all nullable), `requested_by`, `created_at`, `decided_by`, `decided_at`, `applied_at`, `result` (jsonb: created ids or the error).
- Only the server's agent tools insert `proposed` drafts. A user approves or rejects with an RPC that checks the status is still `proposed`. Applying runs the change and sets `applied` (or `failed` with the error) in the same transaction where possible. Approved drafts are never edited; edit means reject and make a new one, or the user edits the resulting record.
- Check constraint: `decided_by`/`decided_at` are set when status is not `proposed`.
- Per-kind payloads get a zod schema on the server and a TS type in `src/app/data/types.ts`.

### Techs and crew

`shop_members` (role `owner`/`tech`, `display_name`) and `jobs.assigned_to` already cover who works for the shop and who's on a job. Don't add a separate techs table. What's missing:

- Invite flow: `shop_invites` (`shop_id`, `email`, `role`, `token`, `expires_at`, `accepted_at`) plus an `accept_invite` RPC. Owner-only.
- `jobs.assigned_to` references `auth.users`, so it can point at someone who isn't in the shop. Change it to a composite FK `(shop_id, assigned_to)` → `shop_members(shop_id, user_id)`.
- Crew display info on `shop_members`: `phone`, `color` (for the schedule), `active` (so former techs keep their history but drop off pickers).
- Decide whether techs see every job or only their own; today RLS lets any member see and edit all shop data.

### Smaller gaps

- **Follow-ups (agent capability 2):** `customers.next_maintenance_due` (date) or a `maintenance_reminders` table (`customer_id`, `job_id`, `due_on`, `reason`, `dismissed_at`); `estimates.last_followed_up_at`; and a `follow_ups_due` view combining stale sent estimates, unsent drafts, due maintenance, and overdue invoices. Sent messages are logged in `agent_drafts` (kind `message`, status `applied`).
- **Customer messages log:** if the app ever sends messages itself, a `messages` table (`customer_id`, `channel`, `body`, `sent_at`, `sent_by`, `draft_id`).
- **Atomic estimate save:** `save_estimate(p_estimate_id nullable, header fields, p_items jsonb)` that creates or replaces a draft and its line items in one transaction. Replaces the two-request `createEstimate` and gives draft editing a backend. Only `draft` estimates are editable.
- **Cancel job:** `jobs.cancelled_at` and `cancel_reason`, set through `cancel_job(p_job_id, p_reason)` that only works from `scheduled` or `in-progress`. Decide what happens to a linked estimate (likely nothing).
- **Job end time:** `jobs.scheduled_end` or rely on `estimated_hours`; scheduling suggestions need one or the other to find gaps.
- **Shop invoice settings:** `shops.payment_terms_days` (default due date) and `next_invoice_number`.
- **Audit columns:** `updated_at` (with a trigger) on customers, estimates, jobs, and invoices, so "stale" checks have something to compare.

## Tooling to add (planned)

A plan to tackle later, in priority order. Nothing here is installed. Each item is a recommendation for the user to approve first, as with the test framework.

1. *(Done: `server/src/database.types.ts`, `supabase/config.toml`, and `.env.example` are committed, so a fresh clone can type-check.)*
2. **Root `typecheck` and `check` scripts.** Add `"typecheck": "tsc --noEmit && npm --prefix server run typecheck"` so one command covers the front end and the server. Later add `"check"` that runs typecheck, lint, and test, so there's one command to run before committing. (`npm --prefix server run` is fine; only `npm --prefix server install` is broken.)
3. **Remove unused dependencies.** Grep of `src/`, `server/src/`, and the CSS imports found no use of: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@popperjs/core`, `react-popper`, `react-dnd`, `react-dnd-html5-backend`, `react-slick`, `react-responsive-masonry`, `canvas-confetti`, `motion`, `cmdk`, `date-fns`, `react-day-picker`, `embla-carousel-react`, `input-otp`, `react-hook-form`, `react-resizable-panels`, `vaul`, and the Radix packages `accordion`, `aspect-ratio`, `avatar`, `checkbox`, `collapsible`, `context-menu`, `dropdown-menu`, `hover-card`, `menubar`, `navigation-menu`, `popover`, `progress`, `radio-group`, `scroll-area`, `separator`, `slider`, `switch`, `tabs`, `toggle`, `toggle-group`, `tooltip`. Keep `next-themes` (used by `ui/sonner.tsx`) and `tw-animate-css` (imported in `tailwind.css`). Also unused: `components/figma/ImageWithFallback.tsx` and `components/ui/use-mobile.ts`. Why: a smaller install, and fewer packages to audit and update. When shadcn adds a component later, it reinstalls the Radix package it needs.
4. **Vitest for pure functions.** Fits the Vite config and alias with no extra build setup. Start with `format.ts` (especially `parseLocalDate` and the datetime-local conversion; run with a fixed `TZ` such as `America/Chicago` so day-boundary bugs show up), `computeEstimateTotals` and `lineTotal` (must match the `estimate_totals` view's rounding), and every agent tool in `server/src/agent/tools/` as it's written. Use the same runner for `server/`. No DOM or component tests yet.
5. **Database tests with pgTAP (`supabase test db`).** RLS is the security boundary between shops, so test it directly: a user in shop A can't read or write shop B's rows on every table, composite FKs reject cross-shop children, owner-only actions fail for techs, and `convert_estimate_to_job` and the status-guarded writes reject the wrong starting status. Tests go in `supabase/tests/`. Add a test with each new migration in "Schema to add".
6. **Biome for lint and format.** One tool and one config for both `src/` and `server/`, fast, and it covers the hook rules that matter here (`useExhaustiveDependencies`, `useHookAtTopLevel`, for `useAsync` callers). Ignore `components/ui/` (shadcn output) and `database.types.ts`. Do one formatting commit at the start so later diffs stay clean. Choose ESLint (typescript-eslint plus `eslint-plugin-react-hooks`) and Prettier instead only if a needed rule isn't in Biome.
7. **CI on GitHub Actions.** On each push and PR: `npm ci` at the root and in `server/` (run `npm ci` from inside `server/`), then typecheck, lint, test, and `npm run build`. A second job runs `supabase start`, `supabase test db`, and a generated-types drift check (`npm run db:types` then `git diff --exit-code server/src/database.types.ts`) so a migration can't land without updated types. The DB job is slower because it starts Docker; run it on PRs that touch `supabase/` if it gets in the way.
8. **Route-level lazy loading.** `npm run build` warns about the app chunk (about 950 kB, mostly recharts and supabase-js) being over 500 kB. Use `lazy` on the routes in `routes.tsx` (Dashboard with its charts first) so a phone on a weak signal loads the job list without the charting code.
9. **shadcn `components.json`.** Add one matching the existing setup (`@/` alias, `src/styles/theme.css`, `components/ui/`) so `npx shadcn add` works without running `init`, which can overwrite the theme.
10. **Pre-commit hook (optional).** lefthook (or husky plus lint-staged) running Biome on staged files. It catches formatting before CI, but it slows commits and can be skipped with `--no-verify`, so CI stays the real gate. Skip it while it's one developer if it gets annoying.
11. **Playwright mobile smoke test (later).** Once the core flows settle, one test at a phone viewport against a local Supabase: sign in, see today's jobs, start and complete a job, create an estimate. It checks the "works one-handed on a phone" principle. Not worth it while the pages are still changing a lot.

Not recommended yet: error monitoring (Sentry or similar) until there are real users, and an env-validation library, since `src/app/env.ts` and `server/src/env.ts` already fail loudly on missing vars (move the server's to zod when it next changes, since zod is already a server dependency).

## Known issues in the prototype

- Estimates can't be edited after they're saved (no edit dialog for drafts yet).
- `createEstimate` inserts the estimate and its line items in two requests and deletes the estimate if the items fail. Move it to an RPC if that ever isn't enough.
- Schedule and date inputs use the browser's time zone, not the shop's `timezone` setting.
- Revenue (dashboard, customer totals) is the agreed price of completed jobs until invoices exist.
- There's no "cancel job" action.
- `listScheduleEvents` loads every job and filters open, scheduled ones in the browser. Filter in the query (`status in (scheduled, in-progress)`, `scheduled_at is not null`).
- The customer pickers in `CreateEstimateDialog` and `CreateJobDialog` use `listCustomers`, which also hits the `customer_summaries` view. Add a light `listCustomerNames` (id, name).
- Customer cards on the Customers page draw the email, phone and address rows even when they're empty. CustomerDetail already shows placeholders.
- `SignIn`, `QueryState` and the `ShopProvider` cards hardcode Tailwind colors (`bg-blue-600`, `bg-gray-50`) instead of theme tokens, as do most Figma Make pages.
- Job status and priority badge colors are duplicated in `Jobs.tsx`, `JobDetail.tsx`, `CustomerDetail.tsx` and `Dashboard.tsx`. Move them next to `labelFor` in `data/types.ts`.

## Conventions

- TypeScript, functional components, and hooks.
- Reuse the shadcn components in `components/ui/` before writing new UI. This is React 18, so any ui component used as a Radix `asChild` child (e.g. `Button` inside `DialogTrigger`) must use `React.forwardRef`; newer shadcn output assumes React 19 and drops it.
- Keep data access in `src/app/data/` modules. Pages call those functions, not supabase-js.
- Format money with `formatMoney` (`Intl.NumberFormat` USD) from `src/app/format.ts`. Parse date-only columns (`valid_until`) with `parseLocalDate`; `new Date('YYYY-MM-DD')` is UTC and shows a day early in US time zones.
- Don't hardcode the tax rate. Make it a per-shop setting.
- Keep agent tools as plain typed functions with clear inputs and outputs, separate from UI, so they can be tested and reused.
