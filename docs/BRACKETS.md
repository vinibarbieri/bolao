# How the Knockout Bracket Is Built

This document explains how the 2026 World Cup knockout bracket is assembled in
this codebase — from the 48-team group stage down to the Final — and how the
8 best third-place teams are slotted into the Round of 32 using the **official
FIFA matrix**.

> The relevant code lives in `src/lib/tournament/`:
> - `bracket-mapping.ts` — the bracket tree and the Round-of-32 pairings
> - `third-place-lookup.ts` — assigns the 8 third-place teams to their slots
> - `third-place-matrix.ts` — the official 495-combination matrix (generated)

---

## 1. The format in a nutshell

The 2026 World Cup has **48 teams in 12 groups (A–L) of 4**. After the group
stage, **32 teams** advance to the knockout stage:

- **12 group winners** (1st place of each group)
- **12 group runners-up** (2nd place of each group)
- **8 best third-place teams** (out of the 12 groups)

The knockout stage is a single-elimination tree:

| Round         | Matches | Internal slots |
| ------------- | ------- | -------------- |
| Round of 32   | 16      | 1–16           |
| Round of 16   | 8       | 17–24          |
| Quarter-finals| 4       | 25–28          |
| Semi-finals   | 2       | 29–30          |
| Third place   | 1       | 31             |
| Final         | 1       | 32             |

---

## 2. The slot system

Every position in the bracket is a numbered **slot** (1–32). A slot stores the
**winner** of the match played there. Later rounds reference earlier slots as
their inputs via `sourceSlots`.

```
BRACKET_STRUCTURE (bracket-mapping.ts)

R32:  slots 1..16   (seeded directly — no sourceSlots)
R16:  17=[1,2]  18=[3,4]  19=[5,6]  20=[7,8]
      21=[9,10] 22=[11,12] 23=[13,14] 24=[15,16]
QF:   25=[17,18] 26=[19,20] 27=[21,22] 28=[23,24]
SF:   29=[25,26] 30=[27,28]
3rd:  31=[29,30]  (the two SF losers)
Final:32=[29,30]  (the two SF winners)
```

This is a **standard adjacent-pair tree**: the winners of slots 1 and 2 meet in
slot 17, the winners of 17 and 18 meet in slot 25, and so on up to the Final.

### Round-of-32 team positions

A Round-of-32 slot holds *two* teams (home/away) before its match is decided.
Those two team positions are encoded as separate keys so the slot itself can
hold the winner:

- **home** team of R32 slot `s` → key `s * 100 + 1`
- **away** team of R32 slot `s` → key `s * 100 + 2`

So R32 slot 1 has its home team at key `101`, away team at `102`, and the
**winner** is written to slot `1`. (See `r32HomeKey` / `r32AwayKey` in
`bracket-builder-client.tsx`.)

---

## 3. Mapping to official FIFA match numbers

FIFA numbers the knockout matches **73–104**. Internal slots 1–16 are mapped
onto the official Round-of-32 match numbers (73–88) so that the standard tree
above reproduces the **official** Round-of-16 / QF / SF / Final feed-forward.

| Slot | FIFA match | Matchup            |
| ---- | ---------- | ------------------ |
| 1    | M74        | 1E vs 3rd          |
| 2    | M77        | 1I vs 3rd          |
| 3    | M73        | 2A vs 2B           |
| 4    | M75        | 1F vs 2C           |
| 5    | M83        | 2K vs 2L           |
| 6    | M84        | 1H vs 2J           |
| 7    | M81        | 1D vs 3rd          |
| 8    | M82        | 1G vs 3rd          |
| 9    | M76        | 1C vs 2F           |
| 10   | M78        | 2E vs 2I           |
| 11   | M79        | 1A vs 3rd          |
| 12   | M80        | 1L vs 3rd          |
| 13   | M86        | 1J vs 2H           |
| 14   | M88        | 2D vs 2G           |
| 15   | M85        | 1B vs 3rd          |
| 16   | M87        | 1K vs 3rd          |

Notation: `1X` = winner of group X, `2X` = runner-up of group X, `3rd` = a
qualifying third-place team (resolved at runtime — see §4).

The **8 group winners that face a third-place team** are therefore
**A, B, D, E, G, I, K, L**, occupying slots **11, 15, 7, 1, 8, 2, 16, 12**.
The other 4 winners (C, F, H, J) face a runner-up.

These pairings come straight from the official bracket and match
`matriz_fifa_oficial.csv`. They are encoded in `R32_MATCHUPS` in
`bracket-mapping.ts`, with the group winner as `homeSource` and the
third-place team (or runner-up) as `awaySource`.

### Left half vs right half

- **Left half** = slots 1–8 → feed Semi-final slot **29**
- **Right half** = slots 9–16 → feed Semi-final slot **30**

Two teams in the same half can only meet at the semi-final stage at the
earliest; the two halves only meet in the Final (slot 32). This is why the UI
draws slots 1–8 on the left and 9–16 on the right (mirrored).

---

## 4. Slotting the 8 third-place teams (the official matrix)

Which group winner plays *which* third-place team is **not** fixed — it depends
on **which 8 of the 12 groups** produce a qualifying third-place team. There are
**C(12, 8) = 495** possible combinations, and FIFA publishes a fixed assignment
for each one (Annex C of the tournament regulations).

This project uses that official table directly. The file
`matriz_fifa_oficial.csv` is the source of truth.

### The matrix file

`src/lib/tournament/third-place-matrix.ts` is **auto-generated** from the CSV
by `scripts/gen-third-place-matrix.mjs`. It exports:

```ts
export const THIRD_PLACE_MATRIX: Record<string, string>
```

- **key** = the 8 qualifying groups, sorted (e.g. `"EFGHIJKL"`)
- **value** = the third-place group assigned to each winner match, in the
  official column order `[1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L]`

For example `"EFGHIJKL": "EJIFHGLK"` reads as:

```
1A vs 3E   1B vs 3J   1D vs 3I   1E vs 3F
1G vs 3H   1I vs 3G   1K vs 3L   1L vs 3K
```

To regenerate after editing the CSV:

```bash
node scripts/gen-third-place-matrix.mjs
```

### From matrix to slots

`getThirdPlaceAssignments(qualifyingGroups)` in `third-place-lookup.ts`:

1. Sorts the 8 qualifying groups into the matrix **key**.
2. Looks up the matrix **value** (the 8 assigned third-place groups).
3. Maps each assigned group to its R32 **slot**, using the column→slot map:

   | Column | 1A | 1B | 1D | 1E | 1G | 1I | 1K | 1L |
   | ------ | -- | -- | -- | -- | -- | -- | -- | -- |
   | Slot   | 11 | 15 | 7  | 1  | 8  | 2  | 16 | 12 |

It returns `{ assignments: Record<group, slot> }`, e.g.
`{ F: 1, G: 2, I: 7, H: 8, E: 11, K: 12, J: 15, L: 16 }`.

---

## 5. Putting it together at runtime

When the bracket page renders (`src/app/(app)/bracket/page.tsx`):

1. The user's group predictions yield the 12 winners, 12 runners-up, and the
   8 third-place teams they marked as advancing (`advancesAsThird`).
2. The 8 qualifying group letters are passed to `getThirdPlaceAssignments(...)`
   to get the group→slot mapping.
3. `resolveR32Matchups(assignments)` replaces every `third_place: 'TBD'` entry
   in `R32_MATCHUPS` with the concrete group letter for that slot.
4. The resolved matchups + the team list are handed to
   `BracketBuilderClient`, which:
   - seeds each R32 slot's home/away positions (keys `s*100+1` / `s*100+2`),
   - lets the user click a team to advance it to the next slot
     (`getNextSlot`), all the way to the champion in slot 32.

The third-place match (slot 31) is special: its two participants are the
**losers** of the two semi-finals (slots 29 and 30), computed in the client by
checking which source team is *not* the recorded SF winner.

---

## 6. Validation guarantees

The matrix is validated against the official third-place pools. For all 495
combinations:

- every assigned third-place team belongs to its winner's official allowed pool
  (e.g. `1A` only ever faces a third-place team from groups **C/E/F/H/I**);
- no third-place team is assigned to two slots;
- no team is ever drawn against its own group;
- exactly 8 third-place teams are placed.

The official allowed pools per winner match:

| Match | Allowed 3rd-place groups |
| ----- | ------------------------ |
| 1A    | C, E, F, H, I            |
| 1B    | E, F, G, I, J            |
| 1D    | B, E, F, I, J            |
| 1E    | A, B, C, D, F            |
| 1G    | A, E, H, I, J            |
| 1I    | C, D, F, G, H            |
| 1K    | D, E, I, J, L            |
| 1L    | E, H, I, J, K            |

---

## 7. File reference

| File | Responsibility |
| ---- | -------------- |
| `matriz_fifa_oficial.csv` | Source of truth: the official 495-row FIFA matrix |
| `scripts/gen-third-place-matrix.mjs` | Generates the TS matrix from the CSV |
| `src/lib/tournament/third-place-matrix.ts` | Generated 495-entry lookup table |
| `src/lib/tournament/third-place-lookup.ts` | Resolves qualifying groups → R32 slots |
| `src/lib/tournament/bracket-mapping.ts` | Bracket tree + Round-of-32 pairings |
| `src/components/bracket/bracket-builder-client.tsx` | Renders + drives the interactive bracket |
| `src/app/(app)/bracket/page.tsx` | Wires predictions into the bracket |
