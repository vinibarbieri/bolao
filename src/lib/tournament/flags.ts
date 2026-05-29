// ---------------------------------------------------------------------------
// FIFA 3-letter code → ISO 3166-1 alpha-2 code (lowercase) mapping.
//
// `flag-icons` renders flags from ISO 2-letter codes via the CSS class
// `fi fi-<iso>`. Our teams are keyed by FIFA codes (e.g. "BRA"), so we map
// them here. Home-nation teams use flag-icons subdivision codes (gb-eng etc.).
// ---------------------------------------------------------------------------

export const FIFA_TO_ISO: Record<string, string> = {
  // Group A
  MEX: "mx",
  RSA: "za",
  KOR: "kr",
  CZE: "cz",
  // Group B
  CAN: "ca",
  BIH: "ba",
  QAT: "qa",
  SUI: "ch",
  // Group C
  BRA: "br",
  MAR: "ma",
  HAI: "ht",
  SCO: "gb-sct",
  // Group D
  USA: "us",
  PAR: "py",
  AUS: "au",
  TUR: "tr",
  // Group E
  GER: "de",
  CUW: "cw",
  CIV: "ci",
  ECU: "ec",
  // Group F
  NED: "nl",
  JPN: "jp",
  SWE: "se",
  TUN: "tn",
  // Group G
  BEL: "be",
  EGY: "eg",
  IRN: "ir",
  NZL: "nz",
  // Group H
  ESP: "es",
  CPV: "cv",
  KSA: "sa",
  URU: "uy",
  // Group I
  FRA: "fr",
  SEN: "sn",
  IRQ: "iq",
  NOR: "no",
  // Group J
  ARG: "ar",
  ALG: "dz",
  AUT: "at",
  JOR: "jo",
  // Group K
  POR: "pt",
  COD: "cd",
  UZB: "uz",
  COL: "co",
  // Group L
  ENG: "gb-eng",
  CRO: "hr",
  GHA: "gh",
  PAN: "pa",
};

/**
 * Returns the ISO/flag-icons code for a FIFA team code, or null if unknown
 * (e.g. placeholder/TBD slots in the bracket).
 */
export function isoForFifa(fifaCode: string | null | undefined): string | null {
  if (!fifaCode) return null;
  return FIFA_TO_ISO[fifaCode.toUpperCase()] ?? null;
}
