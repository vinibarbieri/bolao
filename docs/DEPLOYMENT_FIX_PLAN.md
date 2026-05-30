# Deployment Fix Plan

**Date:** 2026-05-30
**Source:** Fixes the 3 blocking bugs + pre-deploy items in [`DEPLOYMENT_READINESS.md`](./DEPLOYMENT_READINESS.md).
**Status:** All 3 bugs re-verified against current source. This doc is the implementation spec; no code changed yet.

---

## Fix 1 — Knockout slot→round mapping inverted + champion never scored

**File:** `src/app/(app)/actions.ts` (`slotToRound` ~320-330, derivation loop ~282-314)

### Problem
`slotToRound` has slots 31 and 32 swapped:

```ts
if (slot === 31) return "final";   // WRONG — slot 31 = third-place match
if (slot === 32) return "third";   // WRONG — slot 32 = Final
```

Truth (`src/lib/tournament/bracket-mapping.ts:106-110`):
- slot **31** = third-place match → `third`
- slot **32** = Final → `final`

The `champion` round is **never produced anywhere**. Downstream, `recalculate.ts:55-67` only sets
`championCorrect = true` when a `knockoutPredictions` row with `round = "champion"` exists, so:
- champion **50 pts** never awarded;
- the `champion_correct DESC` rank tiebreaker (`recalculate.ts:103`) is dead;
- a correct champion pick (slot 32) scores `third` (20) instead of `final` (30) + `champion` (50) = 80;
- a correct third pick (slot 31) scores `final` (30) instead of `third` (20).

### Fix
1. Correct the mapping:

```ts
if (slot === 31) return "third";
if (slot === 32) return "final";
```

2. In the derivation loop, after adding the mapped round, also push a `champion` round for the slot-32
   team:

```ts
for (const pick of picks) {
  const round = slotToRound(pick.bracketSlot);
  if (!round) continue;
  if (!teamRounds.has(pick.teamId)) teamRounds.set(pick.teamId, new Set());
  teamRounds.get(pick.teamId)!.add(round);

  // slot 32 winner is also the predicted champion
  if (pick.bracketSlot === 32) {
    teamRounds.get(pick.teamId)!.add("champion");
  }
}
```

### Why it scores correctly
A predicted champion appears in `picks[29|30]` (SF winner → `sf`), `picks[32]` (Final winner → `final`),
plus the added `champion`. `knockout-scoring.ts` builds actual rounds the same way: when the `final`
match finishes both finalists get `final`, and `getNextRound("final") → "champion"` is added for the
winner (`knockout-scoring.ts:46-55`). So a correct champion matches `sf` (15) + `final` (30) +
`champion` (50) = **95** across knockout rounds (plus earlier r16/qf), and `championCorrect` flips true.

---

## Fix 2 — Cron never updates group standings

**File:** `src/app/api/cron/fetch-results/route.ts`

### Problem
The Vercel cron updates the `matches` table and calls `recalculateAllScores`, but never recomputes
`groupStandings.position` / `isBestThird`. Group scoring reads those columns
(`group-scoring.ts:31-32`, `:57-62`). Only the manual admin route updates them, via
`updateGroupStandings` + `recalculateBestThirds` (`match-result/route.ts:67-182`).

**Consequence:** with real automated API data, group points and best-3rd-qualify points are always 0.

### Fix
1. Extract `updateGroupStandings` and `recalculateBestThirds` verbatim from
   `match-result/route.ts:67-182` into a new shared module `src/lib/scoring/group-standings.ts` and
   export both. (Both already rebuild standings from all finished group matches, so they are safe to
   call once per finished group match.)
2. Refactor `match-result/route.ts` to import from the new module — no behavior change there.
3. In the cron loop, after updating each finished match, when `localMatch[0].stage === "group"` call
   `updateGroupStandings(...)` then `recalculateBestThirds()` before the final `recalculateAllScores()`.

---

## Fix 3 — Level knockout match → no advancement credit

**Files:** `src/app/api/cron/fetch-results/route.ts:76-81`, `src/app/api/admin/match-result/route.ts:32-37`

### Problem
Both routes compute the winner as:

```ts
home > away ? home : away > home ? away : null
```

A knockout match level at full time yields `winnerTeamId = null`, so `getNextRound` never fires
(`knockout-scoring.ts:46-55`) and the advancing team gets no next-round or champion credit.

**No penalty handling is needed** — the result only needs to record *which team advanced*. All
penalty fields are out of scope and any references to `homePenalties` / `awayPenalties` should be
removed from these routes.

### Fix
- **Admin (`match-result/route.ts`):** accept an optional `winnerTeamId` in the request body. When the
  knockout match is level (`homeScore === awayScore` and `stage !== "group"`), use the provided
  `winnerTeamId`, validating it is the match's `homeTeamId` or `awayTeamId` (else return 400). For
  non-level knockout matches and all group matches, keep deriving the winner from the score. Drop any
  penalty reads/writes.
- **Cron (`fetch-results/route.ts`):** use the football-data API `score.winner`
  (`HOME_TEAM` / `AWAY_TEAM` / `DRAW`) to set `winnerTeamId` for level knockout matches; for groups and
  decisive scores derive from the score as before. Stop reading/storing penalty fields.

---

## Pre-deploy verification

- **`externalApiId`** must be seeded with real football-data.org match IDs — cron matches on
  `eq(matches.externalApiId, String(apiMatch.id))`; placeholder/null values match nothing.
- **Competition code `"WC"`** (`fetch-results/route.ts:38`) — confirm the WC 2026 competition exists on
  your football-data.org tier; adjust the code/ID if not.
- **`DEV_BYPASS_AUTH=false`** in the production environment (see `.env.example`).

---

## Unit tests

No test runner exists in the repo today. Add **Vitest** (`vitest` + `npm run test`). Cover:

- `slotToRound`: all 32 slots map to the correct round; slot-32 derivation emits a `champion` row;
  expected point totals for a correct champion / third pick.
- Group standings: ranking by points → GD → GF, position assignment, and best-8 thirds selection
  (FIFA tiebreakers).
- Winner resolution: level knockout uses the explicit / `score.winner` value; a group draw yields no
  winner; decisive scores derive from the score.
- Knockout progression: `getNextRound` chain and `champion` credit for the final winner.

---

## Fix order

1. **Fix 1** — single function + small loop change in `actions.ts`; highest impact (champion + final/third).
2. **Fix 2 + Fix 3** — share the standings refactor and winner change across cron and admin routes.
3. **Tests** — lock in all three fixes.
