# League Invite Links & Prediction Visibility

This document explains two related social features:

1. **Invite links** — let a user invite friends to a league with a single
   clickable URL instead of a typed invite code.
2. **Prediction visibility** — let a user decide whether their predictions are
   visible to other league members before the World Cup starts.

> The relevant code lives in:
> - `src/app/(app)/join/[inviteCode]/page.tsx` — invite-link landing route
> - `src/app/(app)/leagues/copy-invite-link.tsx` — "Copy invite link" button
> - `src/app/(app)/actions.ts` — `joinLeagueByCode`, `setPredictionVisibility`
> - `src/lib/supabase/middleware.ts` — preserves intended path through login
> - `src/app/(auth)/login/page.tsx` — honors the `next` redirect target
> - `src/app/(auth)/callback/route.ts` — OAuth callback honors `next` (pre-existing)
> - `src/app/(app)/settings/visibility-toggle.tsx` — public/private toggle
> - `src/app/(app)/compare/[userId]/page.tsx` — visibility gate when viewing others
> - `src/app/(app)/queries.ts` — `getPredictionVisibility`

---

## Part 1 — Invite Links

### Goal

A league owner (or any member) shares a link. Whoever opens it joins the league
directly — no need to copy/paste the 8-character invite code.

- **Logged-in** users join immediately and land on the league page.
- **Logged-out** users are sent to login first, then automatically returned to
  the join flow and added to the league. New users who sign up are joined the
  same way after their account is created.

### The link

```
https://<app>/join/<inviteCode>
```

`inviteCode` is the existing `leagues.invite_code` value (a `nanoid(8)`). No
schema change was needed — the link just wraps the code that already existed.

The **Copy invite link** button (`CopyInviteLink`) builds this URL from
`window.location.origin` and copies it to the clipboard. It appears in two
places:

- the league detail page header (`leagues/[leagueId]/page.tsx`)
- each league card in the list (`leagues/leagues-client.tsx`)

Because the list cards are wrapped in a `<Link>`, the button calls
`preventDefault()` / `stopPropagation()` so copying does not navigate.

### The join flow (`/join/[inviteCode]`)

The route is a server component:

1. `getUser()` — if not authenticated, redirect to
   `/login?next=/join/<inviteCode>` (a defensive fallback; middleware normally
   handles this first — see below).
2. `joinLeagueByCode(inviteCode)` — looks up the league and adds the user as an
   `accepted` member.
3. Redirect to `/leagues/<leagueId>`. Invalid code → redirect to
   `/leagues?error=invalid-invite`.

`joinLeagueByCode` is a separate action from the existing `joinLeague`. It is
**idempotent**: if the user is already a member it returns the league instead of
throwing, so re-opening an invite link is harmless.

### Surviving the login redirect (the `next` param)

When a logged-out user opens `/join/<code>`, the Supabase middleware intercepts
the request before the page renders and redirects to login. To avoid losing the
destination, the middleware now appends the intended path as a `next` query
param:

```ts
// src/lib/supabase/middleware.ts
url.pathname = "/login";
url.searchParams.set("next", request.nextUrl.pathname);
```

The login page reads `next` and carries it through both auth paths:

- **Google OAuth** — passed as `redirectTo: /callback?next=<next>`; the callback
  route (already supported `next`) redirects there after exchanging the code.
- **Dev email/password** — `router.push(next)` after sign-in.

`next` is validated to be an **internal relative path** (must start with `/`,
must not start with `//`) to prevent open-redirect attacks; anything else falls
back to `/dashboard`.

> The login page uses `useSearchParams()`, which in Next.js 15 must sit inside a
> `<Suspense>` boundary or the route fails to prerender. The form was therefore
> split into a `LoginForm` child wrapped in `<Suspense>`.

---

## Part 2 — Prediction Visibility

### Goal

Before the tournament starts, predictions are **private by default**. A user can
opt in to making their predictions public so league members can view them.
**When the tournament starts, all predictions become public automatically.**

### Data model (pre-existing table)

The `prediction_visibility` table (`src/db/schema/predictions.ts`) already
existed and is reused as-is:

| Column        | Type                  | Notes                                  |
| ------------- | --------------------- | -------------------------------------- |
| `user_id`     | `uuid` (PK → profiles)| One row per user                       |
| `is_public`   | `boolean` (default false) | Whether others may view predictions |
| `unlocked_at` | `timestamptz`         | Set when auto-published at WC start    |

A row is created with `is_public = false` in `ensureProfile()`.

### Setting your own visibility

The **Settings** page has a "Prediction visibility" card with a toggle
(`VisibilityToggle`). Flipping it calls the `setPredictionVisibility(isPublic)`
server action, which upserts the user's `prediction_visibility` row.

The action calls `checkNotLocked()` first — once the tournament has started the
toggle is irrelevant (everything is public), so the UI shows a locked notice
instead of the switch and the action would reject the change.

### Auto-publish at tournament start

Unchanged and pre-existing: the admin lock route
(`src/app/api/admin/lock-predictions/route.ts`) sets `tournament_config.is_locked`
and, in the same transaction, sets `is_public = true` + `unlocked_at = now()`
for **every** `prediction_visibility` row.

### Viewing another user's predictions

From a league detail page, each member row links to `/compare/<userId>`. The
compare page enforces the visibility gate server-side:

```
canView = isSelf
       || prediction_visibility.is_public
       || tournament_config.is_locked
```

- **Self** — always visible.
- **Public** — the target opted in.
- **Locked** — tournament started, so everything is public regardless of the
  per-user flag (covers any missing/false rows).

If `canView` is false, the page renders a "Predictions are private" card instead
of the predictions, and the prediction queries are never run.

> The gate is enforced in the page (server component), not via a separate RLS
> policy. The predictions queries themselves are unchanged.

---

## Files changed

| File | Change |
| ---- | ------ |
| `src/app/(app)/join/[inviteCode]/page.tsx` | **New** — invite-link join route |
| `src/app/(app)/leagues/copy-invite-link.tsx` | **New** — copy-link button |
| `src/app/(app)/settings/visibility-toggle.tsx` | **New** — public/private toggle |
| `src/components/ui/switch.tsx` | **New** — base-ui Switch component |
| `src/app/(app)/actions.ts` | Added `joinLeagueByCode`, `setPredictionVisibility` |
| `src/app/(app)/queries.ts` | Added `getPredictionVisibility` |
| `src/lib/supabase/middleware.ts` | Preserve intended path as `?next=` |
| `src/app/(auth)/login/page.tsx` | Honor `next`; `<Suspense>` wrap; open-redirect guard |
| `src/app/(app)/settings/page.tsx` | Visibility card |
| `src/app/(app)/compare/[userId]/page.tsx` | Visibility gate + private card |
| `src/app/(app)/leagues/[leagueId]/page.tsx` | Copy button + members link to compare |
| `src/app/(app)/leagues/leagues-client.tsx` | Copy button on league cards |
| `messages/en.json`, `messages/pt.json` | New i18n keys (Leagues, Settings, Compare) |

No database migration was required — both features reuse existing tables
(`leagues.invite_code`, `prediction_visibility`).
