# Deployment Readiness Report

**Date:** 2026-05-29
**Verdict:** ❌ **NOT ready.** Scoring engine has 3 blocking bugs. Auth, workflow gating, and leaderboard plumbing are sound.

---

## 🔴 Critical bugs (break point scoring)

### 1. Knockout slot→round mapping inverted + champion never scored

**File:** `src/app/(app)/actions.ts:320-330` (`slotToRound`)

UI truth (`src/lib/tournament/bracket-mapping.ts`, `src/components/bracket/bracket-builder-client.tsx:168,242,249`):
- slot **31 = third-place match**
- slot **32 = Final winner (= champion)**

But `slotToRound` says:

```ts
if (slot === 31) return "final";   // WRONG — 31 is third
if (slot === 32) return "third";   // WRONG — 32 is final
```

**Consequences:**
- Correct champion pick (slot 32) scored as `third` = **20 pts** instead of `final`(30) + `champion`(50) = **80 pts**.
- Third-place pick (slot 31) scored as `final` = 30 instead of `third` = 20.
- `"champion"` round is **never generated anywhere** → `championCorrect` in `leaderboard_cache` always false → champion 50 pts never awarded **and** rank tiebreaker (`champion_correct DESC` in `recalculate.ts:103`) is dead.

**Fix:** map `31 → "third"`, `32 → "final"`, and additionally push a `champion` knockout row for the slot-32 team.

---

### 2. Cron never updates group standings

**File:** `src/app/api/cron/fetch-results/route.ts`

Vercel cron (`vercel.json`, every 15 min) updates the `matches` table + calls `recalculateAllScores`, but **never recomputes `groupStandings.position` / `isBestThird`**.

Group scoring (`src/lib/scoring/group-scoring.ts:19,32`) reads from `groupStandings`. Only the **manual** admin route (`src/app/api/admin/match-result/route.ts:67-182`) updates standings via `updateGroupStandings` + `recalculateBestThirds`.

**Consequence:** with real automated API data, **group points + best-3rd-qualify points = always 0**. The real-data path is broken.

**Fix:** extract `updateGroupStandings` + `recalculateBestThirds` from the admin route into a shared module; call from cron for finished group matches.

---

### 3. Penalty shootouts ignored → no advancement credit

**Files:** cron `src/app/api/cron/fetch-results/route.ts:76-81` + admin `src/app/api/admin/match-result/route.ts:32-37`

Winner computed as:

```ts
home > away ? home : away > home ? away : null
```

A knockout match decided on penalties has equal full-time score → `winnerTeamId = null`. Then `src/lib/scoring/knockout-scoring.ts:46` `getNextRound` never fires → a team that advanced on penalties gets **no credit for the next round and no champion credit**.

Cron even stores `homePenalties` / `awayPenalties` then ignores them. The admin route doesn't store penalties at all.

**Fix:** on a draw where `stage !== "group"`, use the penalty score to determine `winnerTeamId`.

---

## ⚠️ Verify before deploy

- **`externalApiId` must be seeded with real football-data.org match IDs.** Cron matches local rows by `eq(matches.externalApiId, String(apiMatch.id))`. If seed values are placeholder/null, cron updates nothing.
- **Competition code `"WC"`** (`fetch-results/route.ts:38`) is a guess. Confirm the WC 2026 competition ID exists on your football-data.org API tier.
- **`DEV_BYPASS_AUTH=false`** in production env (documented in `.env.example`).
- **No unit tests** on the scoring engine. All 3 bugs above would have been caught by tests.

---

## ✅ Working

- **Auth:** callback (`src/app/(auth)/callback/route.ts`) → `/dashboard` → `ensureProfile()` bootstraps profile + prediction visibility (also on settings page).
- **Workflow gating:** groups (12) → third-place (needs all 12, exactly 8) → bracket (needs 8). Enforced at `actions.ts:163`, `third-place/page.tsx:46`, `bracket/page.tsx:36`.
- **Leaderboard:** `leaderboard_cache` + rank window SQL, per-league, joined to profiles (`queries.ts:78`, `recalculate.ts:98`).
- **Group standings math + FIFA tiebreakers** correct on the admin path (`match-result/route.ts:128-182`).
- **Leagues:** create / join / invite-link, idempotent join (`actions.ts:392-487`).

---

## Fix priority

1. Bug 1 — single function in `actions.ts`. Highest impact (champion + final/third all wrong).
2. Bugs 2 + 3 — small refactor: shared standings module + penalty-winner helper used by both cron and admin routes.
3. Add scoring engine unit tests.
