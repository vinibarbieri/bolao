# How Bolão 2026 Works

A full overview of the **Bolão 2026** World Cup prediction app: what it does, how
the pieces fit together, and where to look in the code. For deep dives on any
single subsystem, see the focused docs linked throughout.

---

## 1. What the app is

A web app where friends predict the **2026 FIFA World Cup** and compete in private
leagues. Each user fills in predictions across four categories, the app scores
them automatically as real results come in, and ranks everyone on per-league
leaderboards.

The 2026 tournament uses the new **48-team format**: 12 groups (A–L) of 4 teams.
After the group stage, 32 teams advance to a single-elimination knockout bracket
(12 group winners + 12 runners-up + the **8 best third-place teams**).

---

## 2. Tech stack

| Layer        | Choice |
| ------------ | ------ |
| Framework    | Next.js 16 (App Router) + TypeScript |
| Database     | Supabase (PostgreSQL) with Row-Level Security |
| Auth         | Supabase Auth — Google OAuth (+ dev email/password) |
| ORM          | Drizzle (schema in `src/db/schema/`) |
| UI           | shadcn/ui + base-ui + Tailwind CSS |
| Drag & drop  | @dnd-kit (group ordering, bracket) |
| Client state | Zustand (`src/lib/stores/`) |
| Toasts       | Sonner |
| i18n         | `messages/en.json`, `messages/pt.json` |
| Data source  | football-data.org (match results + player squads) |

---

## 3. The big picture

```
                   ┌──────────────────────────────────────────┐
                   │  User predictions (group / bracket /      │
                   │  awards / golden trio)                    │
                   └───────────────┬──────────────────────────┘
                                   │ server actions (actions.ts)
                                   ▼
                          PostgreSQL (Supabase)
                                   ▲
   football-data.org ──► sync ─────┤  results + standings + best-thirds
   (GitHub Actions hourly)         │
                                   ▼
                       recalculateAllScores()
                                   │
                                   ▼
                   user_scores + leaderboard_cache ──► dashboard / league pages
```

Predictions are **locked** at tournament kickoff. Before that, users edit freely;
after, everything is read-only and all predictions become public.

---

## 4. The four prediction categories

| Category        | Page route        | What the user does |
| --------------- | ----------------- | ------------------ |
| **Group stage** | `/groups`         | Drag-rank the 4 teams in each group (1st–4th); flag which 3rd-place teams they think advance |
| **Knockout**    | `/bracket`        | Click teams forward through the R32 → Final tree, picking a champion |
| **Awards**      | `/predictions` (awards) | Pick players for Golden Boot, Golden Glove, Top Assist, Goal of the Tournament |
| **Golden Trio** | `/predictions` (trio)   | Pick 3 players who earn points per Man-of-the-Match award |

Knockout predictions are **derived server-side** from the bracket picks — the user
interacts with the visual bracket, and `knockout_predictions` rows are computed
from `bracket_picks`.

See **[BRACKETS.md](BRACKETS.md)** for the slot system and the FIFA third-place matrix.

---

## 5. Scoring

All scoring lives in `src/lib/scoring/`. Points are stored row-by-row in
`user_scores` and summed into `leaderboard_cache` (one row per user per league).

Quick summary (full table in **[SCORING.md](SCORING.md)**):

- **Group:** exact position = 3, correct top-2 = 2, correct advancing 3rd = 2 (rules stack).
- **Knockout:** points per round a correctly-predicted team reaches — R16 5, QF 8, SF 15, 3rd 20, Final 30, Champion 50.
- **Awards:** Golden Boot 10; Golden Glove / Top Assist / Goal 5 each.
- **Golden Trio:** 2 points per MOTM each picked player wins.

`recalculateAllScores()` rebuilds everything from scratch in one transaction, then
a SQL window function assigns `rank` per league. **Tiebreakers:** total → champion
correct → knockout → group → trio.

Recalculation triggers: admin enters a result, admin clicks "Recalculate", or the
cron sync finds newly finished matches.

---

## 6. Getting real results in (the cron)

Match results come from **football-data.org**. Because Vercel Hobby caps cron at
once-per-day, scheduling lives **off Vercel** in GitHub Actions (hourly), which
`curl`s the Vercel endpoint with a bearer token:

```
GitHub Actions (hourly) ──► GET /api/cron/fetch-results ──► syncWorldCupMatches()
                                                              └─► reconcile + standings + recalc
```

The sync is **idempotent** (rows stamped with `external_api_id`), matches group
games by group + team pair and knockout games by stage queue, and recomputes
standings → best-thirds → scores for any changed groups.

See **[RESULTS_CRON.md](RESULTS_CRON.md)**. Verify the full pipeline locally with
`npm run db:simulate`.

Player squads come from the same API but are synced **manually** (squads change
rarely) via the admin "Sync Players" button or `npm run db:seed:players`. See
**[PLAYERS.md](PLAYERS.md)**.

---

## 7. Leagues & social features

- **Leagues** — private competitions; each has an 8-char `invite_code` (`nanoid`).
- **Invite links** — `/join/<inviteCode>` joins directly; logged-out users go
  through login and are returned via a validated `?next=` param. Idempotent.
- **Prediction visibility** — private by default; a user can opt in to public, and
  everything auto-publishes at tournament lock. `/compare/<userId>` enforces the
  gate server-side (`isSelf || is_public || is_locked`).
- **Dashboard leaderboard** — shows the user's standing for a selected league,
  reading the precomputed `leaderboard_cache`.

See **[LEAGUE_SHARING.md](LEAGUE_SHARING.md)** and **[DASHBOARD_LEADERBOARD.md](DASHBOARD_LEADERBOARD.md)**.

---

## 8. Code map

```
src/
├── app/
│   ├── (app)/                 Protected routes (auth required)
│   │   ├── dashboard/         Home + league leaderboard
│   │   ├── groups/            Group-stage drag-rank predictions
│   │   ├── third-place/       Best-third advancement selector
│   │   ├── bracket/           Interactive knockout bracket
│   │   ├── predictions/       Awards + golden trio
│   │   ├── leagues/           League list, detail, invites
│   │   ├── compare/           View another member's predictions
│   │   ├── settings/          Visibility toggle, etc.
│   │   ├── admin/             Lock, enter results, recalc, sync
│   │   ├── actions.ts         Server actions (all prediction CRUD)
│   │   └── queries.ts         Read queries
│   ├── (auth)/                login, OAuth callback
│   └── api/
│       ├── admin/             lock-predictions, match-result, recalculate, sync-matches, sync-players
│       └── cron/fetch-results Results sync endpoint
├── db/
│   ├── schema/                Drizzle tables (teams, matches, predictions, scores, leagues, profiles, enums)
│   └── seed/                  48 teams, 104 matches, players, simulate-results
├── lib/
│   ├── supabase/              client / server / middleware
│   ├── tournament/            bracket mapping, 3rd-place matrix + lookup, tiebreakers
│   ├── scoring/               group / knockout / award scoring + recalculate
│   ├── matches/               results sync
│   ├── players/               player roster sync
│   └── stores/                Zustand (group-simulator, bracket)
└── components/                shadcn/ui + feature components
supabase/migrations/           SQL schema + RLS policies
```

---

## 9. Key architecture decisions

- **Slot system for the bracket** — every bracket position is a numbered slot
  (R32 1–16, R16 17–24, QF 25–28, SF 29–30, Third 31, Final 32) storing the match
  winner. R32 home/away team positions use keys `slot*100+1` / `slot*100+2`.
- **Official FIFA third-place matrix** — which group winner faces which 3rd-place
  team depends on which 8 of 12 groups produce a qualifier (C(12,8) = 495 cases).
  The official table is stored in `third-place-matrix.ts` (generated from
  `matriz_fifa_oficial.csv`).
- **Derived knockout predictions** — computed from `bracket_picks`, not entered
  directly.
- **Precomputed leaderboard** — pages read `leaderboard_cache`, never recompute on
  request.
- **Locking** — enforced three ways: RLS policies + `tournament_config.is_locked`
  + server-action checks (`checkNotLocked()`).

---

## 10. Running it

Fastest path (Docker — app + Postgres + Supabase auth/REST/gateway):

```bash
docker compose up --build
docker compose exec app npm run db:seed     # first time only
```

Without Docker (needs Node 20+ and a Supabase project):

```bash
npm install
cp .env.local.example .env.local            # fill in credentials
npm run db:push && npm run db:seed
npm run dev
```

App runs at http://localhost:3000.

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push Drizzle schema to DB |
| `npm run db:generate` | Generate migrations |
| `npm run db:seed` | Seed teams + matches |
| `npm run db:seed:players` | Sync player squads |
| `npm run db:simulate` | End-to-end scoring pipeline check |
| `npm run db:studio` | Drizzle Studio (DB browser) |

Required env: `DATABASE_URL`, Supabase keys, `FOOTBALL_DATA_API_KEY`, `CRON_SECRET`.

---

## 11. Doc index

| Doc | Topic |
| --- | ----- |
| [BRACKETS.md](BRACKETS.md) | Slot system + FIFA third-place matrix |
| [SCORING.md](SCORING.md) | Point values, recalculation, tiebreakers |
| [RESULTS_CRON.md](RESULTS_CRON.md) | football-data.org results sync |
| [PLAYERS.md](PLAYERS.md) | Player roster sync |
| [LEAGUE_SHARING.md](LEAGUE_SHARING.md) | Invite links + prediction visibility |
| [DASHBOARD_LEADERBOARD.md](DASHBOARD_LEADERBOARD.md) | Dashboard leaderboard card |
| [UI_REDESIGN.md](UI_REDESIGN.md) | UI redesign notes |
| [DEPLOYMENT_READINESS.md](DEPLOYMENT_READINESS.md) / [DEPLOYMENT_FIX_PLAN.md](DEPLOYMENT_FIX_PLAN.md) | Deployment |
</content>
</invoke>
