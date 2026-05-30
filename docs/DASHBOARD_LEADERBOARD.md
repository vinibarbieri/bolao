# Dashboard League Leaderboard

This document explains the **league leaderboard** shown on the dashboard: a card
that lists each league member's name and total points, with a league selector
for users who belong to more than one league.

> The relevant code lives in:
> - `src/app/(app)/dashboard/page.tsx` — fetches initial data, renders the card
> - `src/app/(app)/dashboard/league-leaderboard.tsx` — client card + league selector
> - `src/app/(app)/actions.ts` — `fetchLeagueLeaderboard` (membership-checked)
> - `src/app/(app)/queries.ts` — `getLeaderboard`, `getUserLeagues` (pre-existing)
> - `src/components/ui/select.tsx` — base-ui Select component

---

## Goal

Surface a user's standing without leaving the dashboard. The user sees, for the
selected league: rank, player (avatar + name), and total points. If the user is
in **more than one** league, a `<Select>` switches between them; with a single
league the selector is hidden.

---

## Data flow

### Server (initial render)

`DashboardPage` already loads `getUserLeagues(user.id)`. It then:

1. Picks the first league as the default: `initialLeagueId = leagues[0]?.id`.
2. Loads that league's leaderboard server-side: `getLeaderboard(initialLeagueId)`.
3. Renders `<LeagueLeaderboard>` only when the user is in ≥1 league.

```tsx
const initialLeagueId = leagues[0]?.id ?? null;
const initialLeaderboard = initialLeagueId
  ? await getLeaderboard(initialLeagueId)
  : [];
```

`getLeaderboard(leagueId)` (pre-existing) reads the precomputed
`leaderboard_cache` table joined to `profiles`, ordered by `rank`. It returns
per-entry: `userId`, `displayName`, `avatarUrl`, `totalPoints`, the category
breakdowns, `championCorrect`, and `rank`. The dashboard card only displays
rank / name / `totalPoints`; the full breakdown stays on the league detail page.

### Client (switching leagues)

`LeagueLeaderboard` is a client component. It holds the selected `leagueId` and
the current `leaderboard` in state, seeded from the server props. Changing the
selector calls the server action and swaps the rows in, wrapped in
`useTransition` so the table dims while loading:

```tsx
function handleChange(value: string | null) {
  if (!value || value === leagueId) return;
  setLeagueId(value);
  startTransition(async () => {
    setLeaderboard(await fetchLeagueLeaderboard(value));
  });
}
```

### The action (`fetchLeagueLeaderboard`)

Switching leagues hits a server action rather than shipping every league's
leaderboard to the client up front. The action **verifies membership** before
returning data, so a user cannot read the standings of a league they have not
joined by passing an arbitrary `leagueId`:

```ts
export async function fetchLeagueLeaderboard(leagueId: string) {
  const userId = await getAuthUserId();
  const membership = await db
    .select({ id: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(
      eq(leagueMembers.leagueId, leagueId),
      eq(leagueMembers.userId, userId),
      eq(leagueMembers.status, "accepted"),
    ))
    .limit(1);
  if (membership.length === 0) throw new Error("Not a member of this league");
  return getLeaderboard(leagueId);
}
```

---

## The Select component

`src/components/ui/select.tsx` is a new shadcn-style wrapper over
`@base-ui/react/select` (the same primitive family as the existing
`switch.tsx`). It exports `Select`, `SelectTrigger`, `SelectValue`,
`SelectContent`, `SelectItem`, `SelectGroup`. The base-ui API uses
`value` / `onValueChange` on the root.

---

## Empty / edge states

- **No leagues** — card is not rendered at all (`initialLeagueId` is null).
- **One league** — card renders, selector hidden.
- **League with no scores yet** — `leaderboard_cache` empty for that league →
  the card shows the `noScores` message ("No scores yet.").
- The default league is simply the first in `getUserLeagues` order.

---

## Files changed

| File | Change |
| ---- | ------ |
| `src/components/ui/select.tsx` | **New** — base-ui Select component |
| `src/app/(app)/dashboard/league-leaderboard.tsx` | **New** — client leaderboard card + selector |
| `src/app/(app)/dashboard/page.tsx` | Fetch initial leaderboard; render card |
| `src/app/(app)/actions.ts` | Added `fetchLeagueLeaderboard` (membership-checked) |
| `messages/en.json`, `messages/pt.json` | New Dashboard i18n keys (`leaderboardTitle`, `leaderboardSubtitle`, `noScores`, `rank`, `player`, `points`) |

No database migration was required — reuses the existing `leaderboard_cache`,
`league_members`, and `profiles` tables.
