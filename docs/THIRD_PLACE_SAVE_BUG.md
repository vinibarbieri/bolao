# Third-Place Save — Intermittent "saved but blank" Bug

## Symptom

When saving the 8 best third-place picks, the success toast appears and the user
is redirected to the bracket page — but the bracket shows "select 8 best third
places", and navigating back to the third-place page shows a blank selection, as
if nothing was ever saved. Happened intermittently, not on every save.

## Root cause

The DB write **did** land (hence the success toast). The page just showed stale
data from Next.js's **client Router Cache**.

`handleSave` in `third-place-selector-client.tsx` ran:

```ts
await commit();            // server action saves DB, toasts success
router.push("/bracket");   // serves PREFETCHED /bracket RSC from before the save
```

The `/bracket` route is prefetched by the sidebar link, so its RSC payload was
captured **before** the save (with 0 qualifying third-places) and stored in the
Router Cache. `router.push` served that stale payload instead of re-rendering
against the freshly-saved data, so the bracket's "need 8 third-places" gate
showed. Returning to `/third-place` served its own stale cached payload → blank.

Intermittent because it depended on whether the prefetched/cached entry was warm
and still within its stale window. `revalidatePath` in the server action marks
the cache stale, but the immediate `router.push` in the same tick raced it.

## Secondary issue found (different symptom)

`src/db/index.ts` connected to Supabase's **transaction-mode pooler** (port
`6543`, pgBouncer — see `DATABASE_URL` in `.env.local`) using postgres-js with
its default `prepare: true`. The transaction pooler does not support prepared
statements, which causes intermittent `prepared statement "sX" does not exist`
errors (those surface as the *error* toast / hard failures, not the silent case
above). Supabase requires `prepare: false` for postgres-js on that pooler.

## Fixes applied

1. **`src/components/next-step-dialog.tsx`** — call `router.refresh()` before
   `router.push(href)`. This is the shared post-save "continue to next step"
   dialog used by the group-stage, bracket, and awards flows, so it fixes the
   stale-cache navigation for all of them (including groups → third-place).

2. **`src/components/third-place/third-place-selector-client.tsx`**
   - `handleSave` now calls `router.refresh()` before `router.push("/bracket")`.
   - Added a `savedKey` state baseline for the dirty check. Previously `isDirty`
     compared against `initialKey` (the original server state) and stayed `true`
     even after a successful save, leaving the unsaved-changes guard armed.
     `savedKey` advances to the saved selection on each successful save, so the
     page is clean post-save.

3. **`src/db/index.ts`** — create the postgres-js client with `{ prepare: false }`
   to be compatible with the transaction-mode pooler.

## How to verify

- Save 8 third-place picks → redirect to bracket should show the bracket
  builder (not the "select 8" gate), and going back to `/third-place` should
  show the 8 picks still selected.
- A hard page reload of `/bracket` and `/third-place` should match the
  in-app-navigation state (they always read the DB on a fresh server render).
