@AGENTS.md

# Bolao 2026 - World Cup Prediction App

## Tech Stack
- Next.js 15 (App Router) + TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- Drizzle ORM (schema in `src/db/schema/`)
- shadcn/ui + Tailwind CSS
- @dnd-kit for drag-and-drop
- Zustand for client state
- Sonner for toasts

## Key Directories
- `src/db/schema/` - Drizzle schema with pgEnums
- `src/db/seed/` - Seed data (48 teams, 104 matches)
- `src/lib/supabase/` - Supabase client/server/middleware
- `src/lib/tournament/` - Bracket mapping, 3rd-place lookup, tiebreakers
- `src/lib/scoring/` - Scoring engine (group, knockout, awards, trio)
- `src/lib/stores/` - Zustand stores (group-simulator, bracket)
- `src/app/(app)/` - Protected app routes (dashboard, groups, bracket, etc.)
- `src/app/(auth)/` - Auth routes (login, callback)
- `src/app/api/` - API routes (admin, cron)
- `supabase/migrations/` - SQL migration with RLS policies

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run db:seed` - Seed database
- `npm run db:push` - Push schema to DB
- `npm run db:generate` - Generate migrations

## Architecture Notes
- 48-team format: 12 groups of 4, top 2 + 8 best 3rd advance to R32
- Predictions lock at tournament start (RLS + tournament_config.is_locked)
- Bracket uses slot system: R32 (1-16), R16 (17-24), QF (25-28), SF (29-30), Third (31), Final (32)
- R32 team positions use keys slot*100+1 (home) and slot*100+2 (away)
- knockout_predictions derived server-side from bracket_picks
- Server actions in `src/app/(app)/actions.ts`
