// ---------------------------------------------------------------------------
// Seed data for the 2026 FIFA World Cup
// 48 teams, 12 groups (A-L), 104 matches
// ---------------------------------------------------------------------------

export const GROUP_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

// ── Team seed type ──────────────────────────────────────────────────────────

export interface TeamSeed {
  id: string; // FIFA 3-letter code
  name: string;
  groupLetter: string;
  flagUrl: string | null;
}

// ── 48 Teams ────────────────────────────────────────────────────────────────

export const TEAMS_DATA: TeamSeed[] = [
  // Group A
  { id: "MEX", name: "Mexico", groupLetter: "A", flagUrl: null },
  { id: "RSA", name: "South Africa", groupLetter: "A", flagUrl: null },
  { id: "KOR", name: "South Korea", groupLetter: "A", flagUrl: null },
  { id: "CZE", name: "Czech Republic", groupLetter: "A", flagUrl: null },

  // Group B
  { id: "CAN", name: "Canada", groupLetter: "B", flagUrl: null },
  { id: "BIH", name: "Bosnia and Herzegovina", groupLetter: "B", flagUrl: null },
  { id: "QAT", name: "Qatar", groupLetter: "B", flagUrl: null },
  { id: "SUI", name: "Switzerland", groupLetter: "B", flagUrl: null },

  // Group C
  { id: "BRA", name: "Brazil", groupLetter: "C", flagUrl: null },
  { id: "MAR", name: "Morocco", groupLetter: "C", flagUrl: null },
  { id: "HAI", name: "Haiti", groupLetter: "C", flagUrl: null },
  { id: "SCO", name: "Scotland", groupLetter: "C", flagUrl: null },

  // Group D
  { id: "USA", name: "United States", groupLetter: "D", flagUrl: null },
  { id: "PAR", name: "Paraguay", groupLetter: "D", flagUrl: null },
  { id: "AUS", name: "Australia", groupLetter: "D", flagUrl: null },
  { id: "TUR", name: "Türkiye", groupLetter: "D", flagUrl: null },

  // Group E
  { id: "GER", name: "Germany", groupLetter: "E", flagUrl: null },
  { id: "CUW", name: "Curaçao", groupLetter: "E", flagUrl: null },
  { id: "CIV", name: "Ivory Coast", groupLetter: "E", flagUrl: null },
  { id: "ECU", name: "Ecuador", groupLetter: "E", flagUrl: null },

  // Group F
  { id: "NED", name: "Netherlands", groupLetter: "F", flagUrl: null },
  { id: "JPN", name: "Japan", groupLetter: "F", flagUrl: null },
  { id: "SWE", name: "Sweden", groupLetter: "F", flagUrl: null },
  { id: "TUN", name: "Tunisia", groupLetter: "F", flagUrl: null },

  // Group G
  { id: "BEL", name: "Belgium", groupLetter: "G", flagUrl: null },
  { id: "EGY", name: "Egypt", groupLetter: "G", flagUrl: null },
  { id: "IRN", name: "Iran", groupLetter: "G", flagUrl: null },
  { id: "NZL", name: "New Zealand", groupLetter: "G", flagUrl: null },

  // Group H
  { id: "ESP", name: "Spain", groupLetter: "H", flagUrl: null },
  { id: "CPV", name: "Cape Verde", groupLetter: "H", flagUrl: null },
  { id: "KSA", name: "Saudi Arabia", groupLetter: "H", flagUrl: null },
  { id: "URU", name: "Uruguay", groupLetter: "H", flagUrl: null },

  // Group I
  { id: "FRA", name: "France", groupLetter: "I", flagUrl: null },
  { id: "SEN", name: "Senegal", groupLetter: "I", flagUrl: null },
  { id: "IRQ", name: "Iraq", groupLetter: "I", flagUrl: null },
  { id: "NOR", name: "Norway", groupLetter: "I", flagUrl: null },

  // Group J
  { id: "ARG", name: "Argentina", groupLetter: "J", flagUrl: null },
  { id: "ALG", name: "Algeria", groupLetter: "J", flagUrl: null },
  { id: "AUT", name: "Austria", groupLetter: "J", flagUrl: null },
  { id: "JOR", name: "Jordan", groupLetter: "J", flagUrl: null },

  // Group K
  { id: "POR", name: "Portugal", groupLetter: "K", flagUrl: null },
  { id: "COD", name: "DR Congo", groupLetter: "K", flagUrl: null },
  { id: "UZB", name: "Uzbekistan", groupLetter: "K", flagUrl: null },
  { id: "COL", name: "Colombia", groupLetter: "K", flagUrl: null },

  // Group L
  { id: "ENG", name: "England", groupLetter: "L", flagUrl: null },
  { id: "CRO", name: "Croatia", groupLetter: "L", flagUrl: null },
  { id: "GHA", name: "Ghana", groupLetter: "L", flagUrl: null },
  { id: "PAN", name: "Panama", groupLetter: "L", flagUrl: null },
];

// ── Match seed type ─────────────────────────────────────────────────────────

export interface MatchSeed {
  matchNumber: number;
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  groupLetter: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffAt: string; // ISO 8601 date-time string
}

// ── Helper: build a team lookup by group ────────────────────────────────────

function teamsByGroup(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of TEAMS_DATA) {
    if (!map[t.groupLetter]) map[t.groupLetter] = [];
    map[t.groupLetter].push(t.id);
  }
  return map;
}

/**
 * Build the round-robin fixtures for a single group of 4 teams.
 * Returns 6 pairings spread across 3 matchdays:
 *   MD1: [0v1, 2v3]  MD2: [0v2, 1v3]  MD3: [0v3, 1v2]
 */
function groupFixtures(ids: string[]): [string, string][] {
  const [a, b, c, d] = ids;
  return [
    // Matchday 1
    [a, b],
    [c, d],
    // Matchday 2
    [a, c],
    [b, d],
    // Matchday 3
    [a, d],
    [b, c],
  ];
}

// ── Build all 104 matches ───────────────────────────────────────────────────

function buildMatches(): MatchSeed[] {
  const matches: MatchSeed[] = [];
  let matchNum = 1;

  const groups = teamsByGroup();

  // ── Base date helpers ───────────────────────────────────────────────────
  // The 2026 World Cup is scheduled June 11 – July 19, 2026.
  // We spread group matchdays across 3 windows:
  //   MD1: June 11-17  |  MD2: June 18-24  |  MD3: June 24-27
  // Modifying the base dates slightly to align with the real-world 104-game span.
  const md1Start = new Date("2026-06-11T15:00:00Z"); // Opening day
  const md2Start = new Date("2026-06-18T12:00:00Z");
  const md3Start = new Date("2026-06-24T12:00:00Z");

  // Assign 2 matches per group per matchday; stagger by 3 hours per game
  // within each day window, and shift the day for each group.
  const matchdayBases = [md1Start, md2Start, md3Start];

  for (const letter of GROUP_LETTERS) {
    const ids = groups[letter];
    const fixtures = groupFixtures(ids);

    // 6 fixtures: indices 0-1 (MD1), 2-3 (MD2), 4-5 (MD3)
    for (let i = 0; i < fixtures.length; i++) {
      const mdIndex = Math.floor(i / 2); // 0, 0, 1, 1, 2, 2
      const slotIndex = i % 2; // 0 or 1

      const groupOffset = GROUP_LETTERS.indexOf(letter as (typeof GROUP_LETTERS)[number]);
      const base = new Date(matchdayBases[mdIndex]);
      // Shift each group by a few hours/days so they follow a realistic progression
      base.setHours(base.getHours() + groupOffset * 12 + slotIndex * 3);

      matches.push({
        matchNumber: matchNum++,
        stage: "group",
        groupLetter: letter,
        homeTeamId: fixtures[i][0],
        awayTeamId: fixtures[i][1],
        kickoffAt: base.toISOString(),
      });
    }
  }

  // ── Knockout rounds ────────────────────────────────────────────────────
  // All knockout matches have TBD teams (null).

  const knockoutStart = new Date("2026-06-28T16:00:00Z");

  // Round of 32 — 16 matches (June 28 - July 3)
  for (let i = 0; i < 16; i++) {
    const date = new Date(knockoutStart);
    date.setDate(date.getDate() + Math.floor(i / 3));
    date.setHours(date.getHours() + (i % 3) * 4);
    matches.push({
      matchNumber: matchNum++,
      stage: "r32",
      groupLetter: null,
      homeTeamId: null,
      awayTeamId: null,
      kickoffAt: date.toISOString(),
    });
  }

  // Round of 16 — 8 matches (July 4 - July 7)
  const r16Start = new Date("2026-07-04T16:00:00Z");
  for (let i = 0; i < 8; i++) {
    const date = new Date(r16Start);
    date.setDate(date.getDate() + Math.floor(i / 2));
    date.setHours(date.getHours() + (i % 2) * 4);
    matches.push({
      matchNumber: matchNum++,
      stage: "r16",
      groupLetter: null,
      homeTeamId: null,
      awayTeamId: null,
      kickoffAt: date.toISOString(),
    });
  }

  // Quarter-finals — 4 matches (July 9 - July 11)
  const qfStart = new Date("2026-07-09T18:00:00Z");
  for (let i = 0; i < 4; i++) {
    const date = new Date(qfStart);
    date.setDate(date.getDate() + Math.floor(i / 2));
    date.setHours(date.getHours() + (i % 2) * 4);
    matches.push({
      matchNumber: matchNum++,
      stage: "qf",
      groupLetter: null,
      homeTeamId: null,
      awayTeamId: null,
      kickoffAt: date.toISOString(),
    });
  }

  // Semi-finals — 2 matches (July 14 - July 15)
  const sfStart = new Date("2026-07-14T20:00:00Z");
  for (let i = 0; i < 2; i++) {
    const date = new Date(sfStart);
    date.setDate(date.getDate() + i);
    matches.push({
      matchNumber: matchNum++,
      stage: "sf",
      groupLetter: null,
      homeTeamId: null,
      awayTeamId: null,
      kickoffAt: date.toISOString(),
    });
  }

  // Third-place match (July 18)
  matches.push({
    matchNumber: matchNum++,
    stage: "third",
    groupLetter: null,
    homeTeamId: null,
    awayTeamId: null,
    kickoffAt: new Date("2026-07-18T20:00:00Z").toISOString(),
  });

  // Final (July 19)
  matches.push({
    matchNumber: matchNum++,
    stage: "final",
    groupLetter: null,
    homeTeamId: null,
    awayTeamId: null,
    kickoffAt: new Date("2026-07-19T20:00:00Z").toISOString(),
  });

  return matches;
}

export const MATCHES_DATA: MatchSeed[] = buildMatches();