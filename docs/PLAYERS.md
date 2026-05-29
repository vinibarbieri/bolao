# How Player Rosters Are Synced

This document explains how the World Cup player rosters used by the **Award
Predictions** and **Golden Trio** screens are imported into the database from
football-data.org.

> The relevant code lives in:
> - `src/lib/players/sync.ts` — the sync logic (fetch + map + upsert)
> - `src/app/api/admin/sync-players/route.ts` — admin API route that triggers it
> - `src/db/seed/players.ts` — standalone CLI script (`npm run db:seed:players`)
> - The "Sync Players" button in `src/app/(app)/admin/admin-client.tsx`

---

## 1. Why players need to be in the database

Both prediction screens reference players by their database UUID:

- `award_predictions.player_id → players.id` (Golden Boot, Golden Glove, Top Assists, Goal of the Tournament)
- `golden_trio.player_id → players.id` (the three picked players)

Both pages already read from `getAllPlayers()` (`src/app/(app)/queries.ts`),
which selects every row from the `players` table. So "fetch players" means
**populating the `players` table** — the prediction UIs read exclusively from
the DB, never from the external API at request time.

The `players` table (`src/db/schema/matches.ts`):

| Column            | Type                      | Notes                                  |
| ----------------- | ------------------------- | -------------------------------------- |
| `id`              | `uuid` (default random)   | Referenced by predictions              |
| `name`            | `text`                    | Player full name                       |
| `team_id`         | `text → teams.id`         | FIFA 3-letter code (e.g. `BRA`)        |
| `position`        | `player_position` enum    | `GK` / `DF` / `MF` / `FW`              |
| `external_api_id` | `text`                    | football-data.org player id (for sync) |

---

## 2. The data source

We use **football-data.org** — the same API already wired up for match results
(`src/app/api/cron/fetch-results/route.ts`).

The free tier **does include full World Cup squads** (this was verified against
the live API: 48 teams, all with non-empty squads, ~1219 players total). Squads
come from a single endpoint:

```
GET https://api.football-data.org/v4/competitions/WC/teams
Header: X-Auth-Token: <FOOTBALL_DATA_API_KEY>
```

Each team in the response carries a `squad` array of players:

```jsonc
{
  "teams": [
    {
      "tla": "URY",                 // three-letter abbreviation
      "name": "Uruguay",
      "squad": [
        {
          "id": 3160,               // -> external_api_id
          "name": "Fernando Muslera",
          "position": "Goalkeeper", // -> GK
          "dateOfBirth": "1986-06-16",
          "nationality": "Uruguay"
        }
        // ...
      ]
    }
    // ...
  ]
}
```

The API key lives in `.env.local` as `FOOTBALL_DATA_API_KEY`.

---

## 3. The two mapping problems

The API data doesn't line up 1:1 with our schema, so the sync resolves two
mismatches.

### 3.1 Team identity: API TLA → local FIFA code

Our `teams` table is keyed by **FIFA 3-letter codes** (`BRA`, `ARG`, …). The
API's `tla` field is *almost* identical — **47 of 48 match exactly**. The only
difference today is Uruguay, where the API uses the ISO-3166 code `URY` while
our DB uses the FIFA code `URU`.

This is handled by an explicit alias table plus a name-based fallback:

```ts
const TLA_TO_TEAM_ID: Record<string, string> = {
  URY: "URU", // Uruguay: ISO URY -> FIFA URU
};
```

Resolution order for each API team:

1. If the (aliased) TLA matches a local team id → use it.
2. Otherwise, fall back to matching on a **normalized team name** (lower-cased,
   accents stripped, non-letters removed) — a safety net in case the API's
   roster or codes shift before the tournament.
3. If neither matches, the team is skipped and reported in `unmatchedTeams`.

### 3.2 Position: granular label → enum

The API uses fine-grained position labels; our `player_position` enum has just
four values. `mapPosition()` collapses them:

| API label(s)                                                              | Enum |
| ------------------------------------------------------------------------- | ---- |
| `Goalkeeper`                                                              | `GK` |
| `Centre-Back`, `Left-Back`, `Right-Back`, `Defence`                       | `DF` |
| `Defensive/Central/Attacking/Right/Left Midfield`, `Midfield`             | `MF` |
| `Centre-Forward`, `Left Winger`, `Right Winger`, `Offence`, `Striker`     | `FW` |
| `null` / `None` / anything unrecognized                                   | `MF` |

The match is substring-based (e.g. anything containing `keeper` → `GK`,
`back`/`defence` → `DF`), so new variants degrade gracefully rather than
crashing.

---

## 4. Idempotent upsert

The sync is safe to run repeatedly. Players are matched on **`external_api_id`**
(the football-data player id), not on name:

- **Existing player** → its row is updated in place (name / team / position)
  **only if something changed**. Its `id` (UUID) is preserved.
- **New player** → inserted with a fresh UUID.

Preserving UUIDs matters: award and golden-trio predictions reference
`players.id`, so re-syncing **never breaks existing predictions** and never
creates duplicates.

`syncWorldCupPlayers()` returns a summary:

```ts
interface SyncPlayersResult {
  inserted: number;
  updated: number;
  unchanged: number;
  unmatchedTeams: string[]; // API teams that couldn't map to a local team
  totalApiPlayers: number;
}
```

---

## 5. How to run it

There are three entry points, all calling the same `syncWorldCupPlayers()`.

### CLI (local / one-off)

```bash
npm run db:seed:players
```

Loads `.env.local`, requires `DATABASE_URL` and `FOOTBALL_DATA_API_KEY`, and
prints the sync summary. Use this for initial population during development.

### Admin API route

```
POST /api/admin/sync-players
```

Requires a logged-in user (same auth pattern as the other `/api/admin/*`
routes). Returns `{ success: true, inserted, updated, unchanged, unmatchedTeams, totalApiPlayers }`.

### Admin UI

The **admin panel** (`/admin`) has a **"Sync Players"** card. Clicking it calls
the route above and shows a toast: `Players synced: <n> new, <n> updated`
(plus a warning toast if any teams were unmatched).

---

## 6. When to run it

Squads change rarely, so this is **not** on a cron — it's run manually:

- Once to seed the players table initially.
- Again whenever federations finalize/adjust their World Cup squads (typically
  in the weeks before kickoff).

Because the sync is idempotent, running it again after the predictions lock is
harmless to existing data, but note that prediction *writes* are blocked once
`tournament_config.is_locked = true`.

---

## 7. Verification

The implementation was run end-to-end against the live API and database:

- **First run:** 1219 inserted, 0 unmatched teams.
- **Re-run:** 0 inserted, 0 updated, 1219 unchanged (idempotency confirmed).
- **Position spread:** GK 143 / DF 396 / MF 392 / FW 288.
- **Uruguay alias:** `URY → URU` resolved correctly (e.g. Fernando Muslera → `URU`).

> Note: the seed teams in `src/db/seed/data.ts` are placeholder groupings, but
> their **IDs are real FIFA codes**, so real squads attach to the correct
> nations regardless of how the groups are arranged.
