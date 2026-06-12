# Score Breakdown Redesign

## Problem

The compare page (`src/app/(app)/compare/[userId]/page.tsx:249-287`) renders a user's
score breakdown as a flat list — one bordered box per scoring row. As a user accumulates
correct predictions, this list grows to 50-80 rows, producing an unusably long scroll with
no summary or sense of where points concentrated.

## Goal

Replace the flat list with an **at-a-glance summary**: category totals with accuracy bars,
detail rows hidden behind expand. Optimized for "how is this person doing" skim, while still
allowing a full audit on demand.

## Design

### Layout

```
TOTAL  187 pts

Group     ██████░░░░  92 of 208   44%   ▸
Knockout  ██░░░░░░░░  58 of 354   16%   ▸
Awards    ██████████  24 of 25    96%   ▸
Trio      13 pts · 7 MOTM hits           ▸
```

- **Total header**: sum of all score rows, prominent.
- **3 bar categories** (Group / Knockout / Awards): label, accuracy bar, `{earned} of {possible}`, `%`.
- **Trio**: no accuracy bar (its theoretical max of 104×2=208 makes any bar look broken).
  Shows raw earned points + MOTM hit count instead.
- **Tap a category** → inline accordion expands that category's detail rows.
  Default: all collapsed. Categories with 0 points show an empty bar and are not expandable.
- Detail rows are the existing content unchanged: `describeScore` main line + sub-detail
  parenthetical + `+pts` badge, just bucketed by category.

### Accuracy denominators (fixed constants)

Denominator = full-tournament maximum (the score a perfect predictor earns). Fixed, so early
in the tournament bars read low — accepted as "progress toward a perfect bolão". Derived from
the existing `POINTS` / `AWARD_POINTS` exports so they cannot drift.

| Category | Formula | Value |
|---|---|---|
| Group | 48×3 exact + 24×2 advance + 8×2 third | **208** |
| Knockout | 16×5 r16 + 8×8 qf + 4×15 sf + 2×30 final + 1×50 champion + 2×20 third | **354** |
| Awards | 10 boot + 5 glove + 5 assist + 5 goal | **25** |
| Trio | n/a — no bar | — |

### Architecture / data flow

- **Translation stays server-side.** The page keeps using `describeScore` / `subDetailLabel`
  with the active locale, pre-renders each row to plain strings `{ main, sub, points }`, buckets
  rows by category, computes per-category `earned` + grand `total`, and passes plain data down.
- **New client component** `ScoreBreakdownPanel` owns only the expand/collapse UI state.
- **New constants module** `src/lib/scoring/max-points.ts` exports `MAX_POINTS` (group/knockout/awards),
  computed from the existing scoring `POINTS` / `AWARD_POINTS` so the values stay in sync.

### Visual direction

Match existing app language — shadcn `Card`, `font-heading` uppercase headings, `bg-brand-gradient`.
Bars: muted track + `bg-brand-gradient` fill, rounded, width animates on mount. Category rows are
buttons with a chevron that rotates on expand.

### i18n (new keys in `Compare` namespace, en + pt)

- `breakdown.total` — "Total"
- `breakdown.totalPoints` — "{points} pts"
- `breakdown.ofPossible` — "{earned} of {possible}"
- `breakdown.trioSummary` — "{points} pts · {count, plural, one {# MOTM hit} other {# MOTM hits}}"
- Bar category labels reuse existing `tabGroups` / `tabKnockout` / `tabAwards` / `tabTrio`.

## Files

- **New** `src/lib/scoring/max-points.ts` — `MAX_POINTS` constants derived from scoring POINTS.
- **New** `src/app/(app)/compare/[userId]/score-breakdown-panel.tsx` — client summary panel.
- **Edit** `src/app/(app)/compare/[userId]/page.tsx` — replace lines 249-287 with bucket prep + `<ScoreBreakdownPanel>`.
- **Edit** `messages/en.json`, `messages/pt.json` — add the new `breakdown.*` keys.

## Out of scope (YAGNI)

Cross-user comparison, donut/pie charts, dynamic "perfect-so-far" denominators, animations beyond
bar-fill, any leaderboard changes.
