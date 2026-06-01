/**
 * Shared mapping from a football-data.org team to a local team id.
 *
 * Local team ids are FIFA codes ('BRA', 'ARG', ...). The API exposes a TLA
 * (often the same FIFA code, sometimes an ISO code) plus a display name. We try
 * the TLA (with an explicit alias table), then fall back to a normalized name.
 */

// football-data.org uses ISO-3166 three-letter codes for a few teams where our
// local DB uses the FIFA code instead. Extend as mismatches are discovered.
export const TLA_TO_TEAM_ID: Record<string, string> = {
  URY: "URU", // Uruguay: ISO URY -> FIFA URU
};

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export interface ApiTeamRef {
  tla?: string | null;
  name?: string | null;
}

/**
 * Builds a resolver closure over the local teams. Returns null when an API team
 * cannot be matched (caller should record it as unmatched).
 */
export function buildTeamResolver(
  localTeams: { id: string; name: string }[]
): (t: ApiTeamRef) => string | null {
  const byId = new Set(localTeams.map((t) => t.id));
  const byName = new Map(localTeams.map((t) => [normalizeName(t.name), t.id]));

  return function resolveTeamId(t: ApiTeamRef): string | null {
    const tla = t.tla?.toUpperCase();
    if (tla) {
      const aliased = TLA_TO_TEAM_ID[tla];
      if (aliased && byId.has(aliased)) return aliased;
      if (byId.has(tla)) return tla;
    }
    if (t.name) return byName.get(normalizeName(t.name)) ?? null;
    return null;
  };
}
