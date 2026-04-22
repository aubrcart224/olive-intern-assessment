# Olive Intern Assessment — Text-to-Quiz

This is the scaffold for the Olive technical interview. Read the assessment brief we sent you first. This README only covers how to get the project running locally.

---

## What's in the box

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4**
- **shadcn/ui** initialized with `Button` as a starter
- **Supabase** local dev (Postgres + Studio + Auth) configured with **declarative schemas**
- **LLM SDKs** already installed: `@anthropic-ai/sdk` and `openai`. Pick one.
- **Zod** for runtime validation
- Empty `DECISIONS.md` template you'll fill in as you build

What's *not* in the box: a quiz schema, prompts, routes, components beyond `Button`, or any tables. That's the assessment.

---

## Prerequisites

- **Node 20+** (`.nvmrc` pins to 20)
- **pnpm** (`corepack enable` or install via your package manager)
- **Docker** — required for Supabase local dev
- **Supabase CLI** — `brew install supabase/tap/supabase` on macOS

---

## Setup

```bash
# 1. Install deps
pnpm install

# 2. Copy env template and fill in LLM key(s)
cp .env.example .env.local

# 3. Start Supabase local stack (Postgres + Studio + Auth)
pnpm supabase start

# 4. Paste the printed anon key and service role key into .env.local

# 5. Run the app
pnpm dev
```

Open http://localhost:3000.

Supabase Studio runs at http://127.0.0.1:54323 once `supabase start` finishes.

---

## Database schema — declarative pattern

We use **declarative schemas**, not hand-written migrations. You edit `CREATE TABLE` statements in `supabase/schemas/`, and the CLI generates migrations from the diff.

```
supabase/schemas/
├── 00_cleanup/      # DROPs for objects being removed
├── 10_enums/        # PostgreSQL ENUM types
├── 20_functions/    # Database functions
├── 30_tables/       # Table definitions
├── 35_triggers/     # Triggers
├── 40_views/        # Views
└── 90_rls/          # Row Level Security policies
```

### Adding a table

```bash
# 1. Write your CREATE TABLE in supabase/schemas/30_tables/10_quizzes.sql

# 2. Generate a migration from the diff
pnpm supabase db diff -f add_quizzes

# 3. Apply locally
pnpm supabase db reset
```

> `supabase db reset` drops the local DB and replays all migrations in order. Good for getting to a clean state.

---

## Project layout

```
app/                 # Next.js App Router
components/ui/       # shadcn components (start with button.tsx)
lib/                 # Utilities (cn helper from shadcn)
supabase/
├── config.toml      # Local stack config
├── schemas/         # Declarative DDL (source of truth)
└── migrations/      # Auto-generated from schema diffs
```

---

## What to submit

Per the assessment brief:

1. Working prototype — someone types a description, gets a live quiz, takes it, responses land in the dashboard
2. `DECISIONS.md` filled in
3. Your prompts committed to the repo (put them wherever makes sense — e.g. `prompts/`)
4. 3 example generated quizzes with input prompt + spec + live URL + results screenshot
5. 2-3 min screen recording of the end-to-end flow

---

## A note on AI tooling

Use whatever helps you ship. We use Claude Code at Olive. What matters is the product decisions, not whether you typed every character yourself.

Good luck.
