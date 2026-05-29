# UI Redesign — Vibrant World Cup 2026

A pass to make the app more beautiful and intuitive: real country **flags**, **lucide icons** in place of emojis, a vibrant **World Cup 2026 theme**, and a **dark/light toggle**.

## Decisions

| Topic | Choice |
| --- | --- |
| Flags | `flag-icons` (bundled SVG/CSS, works offline) |
| Visual direction | Vibrant World Cup 2026 — yellow→green brand + multi-hue accents |
| Typography | Oswald (display/headings) + Inter (body) + Geist Mono (codes) |
| Dark mode | Yes — `next-themes` toggle in the sidebar |
| Scope | Everything, incrementally (core prediction flow done first) |

## New dependency

- **`flag-icons`** — renders flags via `fi fi-<iso>` CSS classes. Imported in `src/app/globals.css`.

---

## Foundations

### Theme — `src/app/globals.css`
Replaced the fully-monochrome palette with a vibrant one and added reusable semantic tokens:

- **Brand**: magenta/rose primary with a violet→blue gradient (`--brand`, `--brand-2`, `--brand-3`).
- **Status tokens**: `qualified` (green), `third` (amber), `eliminated` (red), `gold` (trophy/awards).
- **Utilities**: `.bg-brand-gradient` and `.text-brand-gradient`.
- Full **light + dark** values for every token.

These are exposed as Tailwind colors, so you can use `bg-qualified`, `text-third-foreground`, `border-eliminated/50`, etc.

### Typography — `src/app/layout.tsx` + `src/app/globals.css`
- **Oswald** (`--font-oswald`) — condensed, athletic display font for page headings; scoreboard/jersey energy.
- **Inter** (`--font-inter`) — readable UI/body font, mapped to `--font-sans`.
- **Geist Mono** (`--font-geist-mono`) — team codes and numeric mono.
- Tailwind tokens: `font-sans` → Inter, `font-heading` → Oswald, `font-mono` → Geist Mono.
- A base rule applies Oswald to `h1, h2, h3` and `.font-heading` (so pages not yet redesigned still get display headings). Major titles use `uppercase tracking-wide` for the sporty look; `CardTitle` is a `<div>`, so card titles intentionally stay in Inter.

### Flag mapping — `src/lib/tournament/flags.ts`
- `FIFA_TO_ISO`: maps all 48 FIFA 3-letter codes (e.g. `BRA`) to ISO/flag-icons codes (e.g. `br`), including home nations (`gb-eng`, `gb-sct`).
- `isoForFifa(code)`: safe lookup, returns `null` for unknown/TBD slots.

### Dark mode
- `src/components/theme-provider.tsx` — wraps `next-themes`.
- `src/components/theme-toggle.tsx` — sun/moon toggle button.
- Wired into `src/app/layout.tsx` (`attribute="class"`, `defaultTheme="system"`, `suppressHydrationWarning`).

---

## Reusable components

### `src/components/team-badge.tsx`
- **`<TeamFlag teamId size />`** — a flag with a neutral placeholder fallback for TBD slots. Sizes: `sm | md | lg`.
- **`<TeamBadge teamId name showCode size />`** — flag + team name + optional FIFA code. Used wherever a team appears.

### `src/components/page-header.tsx`
- **`<PageHeader icon title description>`** — consistent page heading with a gradient icon chip and optional action slot.

---

## Pages redesigned

Every emoji was replaced with a `lucide-react` icon; teams now show flags; tournament status uses the new color tokens.

### Sidebar — `src/components/app-sidebar.tsx`
- Gradient trophy logo mark + "Bolão / World Cup 2026" wordmark.
- lucide nav icons (`LayoutDashboard`, `Volleyball`, `Medal`, `Trophy`, `Award`, `Star`, `Users`, `Settings`).
- Clear active state, hover scale, theme toggle, richer user area with `LogOut` icon.

### Dashboard — `src/app/(app)/dashboard/page.tsx`
- Gradient **hero** with a personalized greeting and a live **progress bar** (steps completed / total).
- Icon-driven **stat cards** (`StatCard`) with hover affordance.
- **Checklist** using `Check` / dashed-circle icons, strike-through when done.
- Locked-state banner uses the `third` (amber) token + `Lock` icon.

### Groups — `src/app/(app)/groups/`
- `PageHeader` with a `Volleyball` icon.
- **Placements table**: flag per team, colored left accent bar + position pill (qualified / 3rd / eliminated), `GripVertical` drag handle, group letter chip.
- **Scores table**: flags beside both teams; computed standings highlight qualifying rows + show flags.
- Sticky **save bar** with a `Save` icon and a pulse "unsaved changes" indicator.

### 3rd Place — `src/components/third-place/third-place-selector-client.tsx`
- Sticky header with `Medal` icon + progress bar; turns green when 8/8.
- Flag cards with a green check "selected" state; disabled when 8 reached.
- Themed "complete groups first" warning (`AlertTriangle` + amber).

### Bracket — `src/components/bracket/bracket-builder-client.tsx`
- **Classic two-sided layout**: the left half (R32 slots 1–8 → R16 → QF → SF 29) flows inward to a centered **Final**, and the right half (R32 9–16 → R16 → QF → SF 30) mirrors it. Each side holds exactly the teams that can only meet by the semi-final.
- Right-half matchup cards are **mirrored** (flags face inward) via a `mirror` prop; columns use `justify-around` so matches line up toward their merge point.
- A single `renderSlotCard(slot, mirror)` helper drives every round (R32 from resolved matchups, later rounds + 3rd-place losers from `BRACKET_STRUCTURE`).
- Center column: gradient trophy chip, the Final card, and a compact gold champion chip with flag.
- Sticky toolbar (`Save` / `Reset` + unsaved indicator); winners marked with a gold **`Crown`**; the whole board scrolls horizontally on small screens; themed "select 8 third-place teams first" warning.

---

### Awards — `src/app/(app)/predictions/awards/`
- `PageHeader` with an `Award` icon; two-column card grid.
- Each award has its own icon (`Goal`, `Shield`, `Handshake`, `Sparkles`); the chip turns gold when filled, with a green check.
- Player search shows a flag per result; the chosen player is pinned with their flag. Sticky save bar.

### Golden Trio — `src/app/(app)/predictions/trio/`
- `PageHeader` with a `Star` icon.
- Pick slots show flags; filled slots get a gold ring + filled star; remove via an `X` icon. Search has a leading search icon + flags. Sticky save bar with live count.

### Leagues — `src/app/(app)/leagues/`
- `PageHeader` with a `Users` icon; create/join buttons get `Plus` / `LogIn` icons.
- League cards: gradient trophy chip, chevron affordance, hover lift.
- **League detail**: gradient trophy header, `Trophy` leaderboard heading, podium rank pills (gold/silver/bronze), `Crown` for correct champion, `Users` members heading.

### Compare — `src/app/(app)/compare/[userId]/`
- Gradient avatar fallback + display heading; `ListChecks` score-breakdown heading; `Volleyball` group-predictions heading with flags on each predicted team.

### Admin — `src/app/(app)/admin/`
- `PageHeader` with a `Settings` icon; `Activity` status heading; themed lock/open status badges (`Lock` icon, live pulse).
- Action cards get titled icons (`ListChecks`, `Lock`, `RefreshCw`) and icon buttons.
- **Matches**: `ListChecks` header; flags in every team cell via a `TeamCell` helper; themed `StatusBadge` (live = pulsing red, finished = green); `Pencil` / `Check` / `X` action icons.

### Login — `src/app/(auth)/login/page.tsx`
- Gradient trophy logo mark, big display title, soft gradient glow behind the card.

## Responsive layout & collapsible sidebar

`src/components/app-shell.tsx` is a client wrapper (used by `src/app/(app)/layout.tsx`) that owns the sidebar state and a sticky top bar.

- **Mobile (`< lg`)**: the sidebar is a slide-over **drawer** (`fixed`, off-screen by default) with a dimmed backdrop; the top-bar hamburger opens it, and tapping a nav link or the backdrop closes it.
- **Desktop (`lg+`)**: the sidebar is static and can be **collapsed/expanded** — a `PanelLeftClose` button in the sidebar header hides it, the hamburger brings it back.
- One hamburger, correct behavior per breakpoint (decided at click time via `matchMedia`).
- The **theme toggle moved into the top bar** so it's reachable whether or not the sidebar is open (and there's no longer a duplicate).
- Content uses a responsive container (`max-w-7xl`, `p-4 sm:p-6`); page headers already stack (`flex-col sm:flex-row`); data tables scroll horizontally (shadcn `Table` wraps in `overflow-x-auto`); the bracket scrolls horizontally on small screens.
- In-page sticky toolbars (3rd place, bracket) were offset to `top-16` so they sit just below the sticky top bar.

## Contrast & dark-mode safety

The whole UI runs through semantic tokens, never raw `text-white` / `bg-gray-*`, so both themes stay legible. Specifics:

- Surfaces on the (now light yellow-green) brand gradient use **`text-brand-foreground`** (dark), not white.
- Status `*-foreground` tokens (`qualified` / `third` / `eliminated` / `gold`) are **dark in light mode and light in dark mode**, because they're used as text on subtle low-opacity tints that follow the card color in each theme — this prevents dark-on-dark in dark mode.
- Solid-fill uses of those colors were switched to tints so the same theme-aware foreground stays readable.
- The sidebar subtitle dropped gradient text (too faint on a light sidebar) for `text-muted-foreground`.
- Audited the codebase: no theme-unsafe hardcoded text/background pairs remain (only a translucent dialog scrim).

## Verification

- `npx tsc --noEmit` — clean.
- `npm run build` — succeeds; CSS (flag-icons + gradient utilities) and all 19 routes compile.
- `npm run lint` — only pre-existing warnings/one pre-existing error; nothing new introduced.

## How to run

```bash
npm run dev
```
Toggle light/dark with the button next to the logo. Local Supabase (Docker) + `.env.local` are already configured; the login page supports dev email/password.

---

## Status

All app pages have been redesigned: dashboard, groups, 3rd place, bracket, awards, golden trio, leagues (+ detail), compare, admin (+ matches), and login. 🎉

## Files added

- `src/lib/tournament/flags.ts`
- `src/components/team-badge.tsx`
- `src/components/page-header.tsx`
- `src/components/theme-provider.tsx`
- `src/components/theme-toggle.tsx`
- `src/components/app-shell.tsx`
- `docs/UI_REDESIGN.md`

## Files changed

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/app-sidebar.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/groups/page.tsx`
- `src/components/group-simulator/placements-table.tsx`
- `src/components/group-simulator/scores-table.tsx`
- `src/components/group-simulator/group-simulator-client.tsx`
- `src/app/(app)/third-place/page.tsx`
- `src/components/third-place/third-place-selector-client.tsx`
- `src/app/(app)/bracket/page.tsx`
- `src/components/bracket/bracket-builder-client.tsx`
- `src/app/(app)/predictions/awards/page.tsx` + `awards-client.tsx`
- `src/app/(app)/predictions/trio/page.tsx` + `trio-client.tsx`
- `src/app/(app)/leagues/page.tsx` + `leagues-client.tsx` + `[leagueId]/page.tsx`
- `src/app/(app)/compare/[userId]/page.tsx`
- `src/app/(app)/admin/page.tsx` + `admin-client.tsx`
- `src/app/(app)/admin/matches/page.tsx` + `matches-client.tsx`
- `src/app/(auth)/login/page.tsx`
