# Match Results Sync (Cron on Vercel Hobby)

How finished match results get pulled from football-data.org and turned into
standings + scores in production, and how the scheduling works on a **free
Vercel Hobby** plan.

> Relevant code:
> - `src/app/api/cron/fetch-results/route.ts` — HTTP endpoint that runs the sync
> - `src/lib/matches/sync.ts` — fetch + reconcile + recalc (`syncWorldCupMatches`)
> - `.github/workflows/fetch-results.yml` — hourly external scheduler
> - `src/db/seed/simulate-results.ts` — end-to-end pipeline check (`npm run db:simulate`)

---

## 1. Why not Vercel Cron

Vercel **Hobby** (free) limits cron jobs to **once per day**. The original config
ran every 15 minutes (`*/15 * * * *`), so deploys failed with:

> Hobby accounts are limited to daily cron jobs. This cron expression
> (`*/15 * * * *`) would run more than once per day. Upgrade to the Pro plan...

Rather than pay for Pro or drop to daily (stale scores on match days), the
schedule was moved **off Vercel** to a free external scheduler. `vercel.json` was
deleted (it held only the cron block).

## 2. How it works now

```
GitHub Actions (hourly cron)
        │  curl + Authorization: Bearer <CRON_SECRET>
        ▼
GET /api/cron/fetch-results   (on Vercel)
        │  syncWorldCupMatches()
        ▼
football-data.org  ->  reconcile  ->  standings + scores in Postgres
```

- **GitHub Actions** (`.github/workflows/fetch-results.yml`) fires hourly
  (`0 * * * *`, UTC, may drift a few min under load — fine at 1h granularity) and
  on manual **"Run workflow"** (`workflow_dispatch`).
- It `curl`s the Vercel endpoint with a bearer token and fails the job on any
  HTTP ≥ 400, so broken syncs show red in the Actions tab.
- The route verifies the token against `CRON_SECRET`, then calls
  `syncWorldCupMatches()`.

**Why hourly:** World Cup matches don't finish faster than ~1h apart and
standings don't need sub-hour freshness. 15-min polling was overkill.

## 3. Configuration

| Secret / env var         | Vercel | GitHub repo secret | Notes                                   |
| ------------------------ | :----: | :----------------: | --------------------------------------- |
| `CRON_SECRET`            |   ✅   |        ✅          | **Must match** on both sides            |
| `FOOTBALL_DATA_API_KEY`  |   ✅   |        —           | football-data.org API key (server-side) |
| `APP_URL`                |   —    |        ✅          | Vercel URL, **no trailing slash**       |

Generate a secret:

```bash
openssl rand -hex 32
```

- **Vercel:** Project → Settings → Environment Variables. Redeploy after adding.
- **GitHub:** Settings → Secrets and variables → Actions → New repository secret.
- The Vercel URL (`https://<project>.vercel.app`) appears in the Vercel dashboard
  after the first successful deploy.

> Auth note: the route skips the check if `CRON_SECRET` is unset
> (`process.env.CRON_SECRET && ...`). Always set it in production, or the
> endpoint is public and anyone can burn the football-data quota.

## 4. What the sync does (`syncWorldCupMatches`)

Returns `SyncMatchesResult`:

```ts
{ linked, resultsApplied, unmatchedStages, unmatchedMatches }
```

- **Group matches** matched by group letter + unordered team pair.
- **Knockout matches** seeded with TBD teams; only linked once both participants
  are known, then filled by stage queue (stage-based scoring makes the exact
  within-stage row irrelevant). Matched by `external_api_id` on later runs.
- **Idempotent:** once a row has `external_api_id`, later runs update in place.
- On finished matches it writes score + winner, then recomputes the changed
  groups' standings → best-thirds → all user scores.

| Field              | Meaning                                  | Healthy value                         |
| ------------------ | ---------------------------------------- | ------------------------------------- |
| `linked`           | rows stamped with `external_api_id`      | 72 group matches once linked          |
| `resultsApplied`   | finished matches whose score was written | 0 before tournament; grows during it  |
| `unmatchedStages`  | API stage strings that didn't map        | **`[]`** — anything here is a bug      |
| `unmatchedMatches` | API matches with no local row            | the 32 TBD knockout rows pre-bracket  |

> `unmatchedMatches` listing the 32 knockout fixtures as `? v ?` before the group
> stage ends is **expected** (16 R32 + 8 R16 + 4 QF + 2 SF + 1 third + 1 final).
> They link automatically as teams populate.

## 5. Verifying it works

Three layers:

**Layer 1 — Actions + auth (manual):** Actions tab → "Fetch Match Results" →
"Run workflow". Expect `HTTP 200` + JSON body. `401` = `CRON_SECRET` mismatch;
`500` = missing `FOOTBALL_DATA_API_KEY` on Vercel.

Or hit it directly:

```bash
curl -sS -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR-APP.vercel.app/api/cron/fetch-results | jq
```

**Layer 2 — mapping:** in the JSON, `unmatchedStages` must be `[]` and
`unmatchedMatches` should contain only TBD knockout rows. Anything else means a
team-name/TLA or stage mapping gap.

**Layer 3 — scoring pipeline:** `npm run db:simulate` runs the full pipeline
against fake results (see below), since real finished matches don't exist until
the tournament starts.

## 6. `npm run db:simulate`

`src/db/seed/simulate-results.ts` proves the standings → best-thirds → scoring →
ranking chain end-to-end before any real results exist.

```bash
npm run db:simulate              # group A, auto-reverts
npm run db:simulate B            # group B
npm run db:simulate A -- --keep  # leave data in to inspect in the UI
```

It snapshots one group's matches, writes plausible final scores, runs the **same**
recalc functions the cron calls (`updateGroupStandings` → `recalculateBestThirds`
→ `recalculateAllScores`), prints the resulting standings + leaderboard, then
reverts (unless `--keep`). Needs `DATABASE_URL` in `.env.local`.

Reading output: a populated standings table proves match-write + standings;
leaderboard rows with points prove scoring + ranking. An empty leaderboard is
fine if no users/leagues/predictions are seeded yet.

## 7. Known limits / open items

- Knockout linking and `resultsApplied > 0` can only be fully observed once the
  real tournament produces teams and finished matches.
- GitHub Actions cron can drift/delay a few minutes under load; acceptable at 1h.
- A manual workflow run against prod stamps `external_api_id` on the 72 group
  rows — harmless and idempotent.
