# Scoring System

All scoring logic lives in `src/lib/scoring/`. Scores are stored row-by-row in `user_scores` and cached in `leaderboard_cache`.

---

## Categories

### 1. Group Stage (`src/lib/scoring/group-scoring.ts`)

Points are awarded per team prediction, and conditions are independent (a single team can earn points from more than one rule).

| Condition | Points |
|-----------|--------|
| Team finishes in the exact predicted position (1st–4th) | **3** |
| Team predicted top-2 AND actually finishes top-2 | **2** |
| Team predicted 3rd + flagged as advancing AND actually finishes 3rd as a best-third qualifier | **2** |

**Source constants:**
```ts
POINTS = { EXACT_POSITION: 3, CORRECT_ADVANCE: 2, CORRECT_THIRD_QUALIFIES: 2 }
```

**Key tables:** `group_predictions`, `group_standings` (`position`, `is_best_third`)

---

### 2. Knockout Stage (`src/lib/scoring/knockout-scoring.ts`)

A point row is inserted for each team a user correctly predicted to reach a given round.

| Round | Points |
|-------|--------|
| Round of 32 (r32) | 0 |
| Round of 16 (r16) | **5** |
| Quarter-Finals (qf) | **8** |
| Semi-Finals (sf) | **15** |
| 3rd Place Match (third) | **20** |
| Final (final) | **30** |
| Champion (champion) | **50** |

A team "reaches" a round if it played in that round's match. The winner of a match also "reaches" the next round (so correctly predicting a champion earns points for every round they won through).

**Source constants:**
```ts
POINTS = { r16: 5, qf: 8, sf: 15, third: 20, final: 30, champion: 50 }
```

**Key tables:** `knockout_predictions`, `matches` (`stage`, `status`, `winner_team_id`)

---

### 3. Awards (`src/lib/scoring/award-scoring.ts`)

Exact player match required for each award type.

| Award | Points |
|-------|--------|
| Golden Boot (top scorer) | **10** |
| Golden Glove (best keeper) | **5** |
| Top Assist | **5** |
| Goal of the Tournament | **5** |

**Source constants:**
```ts
AWARD_POINTS = { golden_boot: 10, golden_glove: 5, top_assist: 5, goal_of_tournament: 5 }
```

**Key tables:** `award_predictions`, `actual_awards` (admin-entered)

---

### 4. Golden Trio (`src/lib/scoring/award-scoring.ts`)

Users pick 3 players. Each player earns **2 points per MOTM (Man of the Match)** award they win across all finished matches. Points accumulate across the whole tournament.

**Key tables:** `golden_trio`, `matches` (`motm_player_id`, `status`)

---

## Recalculation (`src/lib/scoring/recalculate.ts`)

`recalculateAllScores()` rebuilds everything from scratch inside a single DB transaction:

1. Deletes all rows from `user_scores` and `leaderboard_cache`
2. For each user, runs all four calculators and inserts detailed rows into `user_scores`
3. Sums totals per category and inserts one `leaderboard_cache` row per league the user belongs to
4. Runs a SQL window function to assign `rank` within each league

### Tiebreaker order (within a league)

1. `total_points` DESC
2. `champion_correct` DESC (boolean — did they pick the actual champion?)
3. `knockout_points` DESC
4. `group_points` DESC
5. `trio_points` DESC

---

## Triggers

| Event | How scores are recalculated |
|-------|-----------------------------|
| Admin enters a match result | `POST /api/admin/match-result` → updates match + group standings → calls `recalculateAllScores()` |
| Admin clicks "Recalculate" | `POST /api/admin/recalculate` → calls `recalculateAllScores()` directly |
| Cron fetch (football-data.org) | `GET /api/cron/fetch-results` → updates any newly finished matches → calls `recalculateAllScores()` if anything changed |

---

## How to update point values

All point constants are at the top of their respective files as plain objects — no shared config file.

| What to change | File | Constant |
|----------------|------|----------|
| Group stage points | `src/lib/scoring/group-scoring.ts` | `POINTS` |
| Knockout round points | `src/lib/scoring/knockout-scoring.ts` | `POINTS` |
| Award points | `src/lib/scoring/award-scoring.ts` | `AWARD_POINTS` |
| Trio points-per-MOTM | `src/lib/scoring/award-scoring.ts` | hardcoded `count * 2` (2 pts per MOTM) |

After changing a constant, trigger a full recalculation via the admin panel or `POST /api/admin/recalculate`.

---

## DB schema reference

**`user_scores`** — one row per awarded point event:
- `category`: `group | knockout | awards | golden_trio`
- `sub_detail`: e.g. `"Group A"`, `"QF"`, `"golden_boot"`, `"Slot 2"`
- `points`: integer
- `description`: human-readable explanation

**`leaderboard_cache`** — one row per (user, league):
- `total_points`, `group_points`, `knockout_points`, `award_points`, `trio_points`
- `champion_correct`: boolean
- `rank`: integer (computed by window function on recalculation)
