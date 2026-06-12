// Structured score-breakdown detail. Scoring computes this language-neutral
// shape; the UI renders it in the current locale at display time. The compare
// page recomputes details from raw predictions + results, so no re-scoring is
// needed for the text to follow the active locale.

export type ScoreDetail =
  | { kind: "groupExact"; team: string; position: number; group: string }
  | { kind: "groupAdvance"; team: string; group: string }
  | { kind: "groupThird"; team: string; group: string }
  | { kind: "knockoutReach"; team: string; round: string }
  | { kind: "awardCorrect"; award: string }
  | { kind: "trioMotm"; count: number; points: number };

// A scoring row in language-neutral form. `subDetail` holds a machine value
// (group letter, round code, award type, slot number) translated at render.
export interface ScoreRow {
  userId: string;
  category: "group" | "knockout" | "awards" | "golden_trio";
  subDetail: string;
  points: number;
  detail: ScoreDetail;
}

export function serializeDetail(detail: ScoreDetail): string {
  return JSON.stringify(detail);
}

// Parse a stored detail back into structured form. Returns null for legacy
// rows that still hold plain English prose (pre-JSON), so callers can fall back.
export function parseDetail(raw: string | null): ScoreDetail | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && "kind" in v ? (v as ScoreDetail) : null;
  } catch {
    return null;
  }
}

interface Translator {
  (key: string, values?: Record<string, string | number>): string;
  has(key: string): boolean;
}

// Translate a dynamic key, falling back to a raw label if the message is
// missing — a missing message must never crash the whole breakdown render.
function safe(t: Translator, key: string, fallback: string): string {
  return t.has(key) ? t(key) : fallback;
}

function formatOrdinal(n: number, locale: string): string {
  if (locale.startsWith("pt")) return `${n}º`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${n}${suffix}`;
}

// Render the main breakdown line. `t` is scoped to the "Compare" namespace.
export function describeScore(
  detail: ScoreDetail,
  t: Translator,
  locale: string
): string {
  switch (detail.kind) {
    case "groupExact":
      return t("breakdown.groupExact", {
        team: detail.team,
        position: formatOrdinal(detail.position, locale),
        group: detail.group,
      });
    case "groupAdvance":
      return t("breakdown.groupAdvance", {
        team: detail.team,
        group: detail.group,
      });
    case "groupThird":
      return t("breakdown.groupThird", {
        team: detail.team,
        group: detail.group,
      });
    case "knockoutReach":
      return t("breakdown.knockoutReach", {
        team: detail.team,
        round: safe(t, `round_${detail.round}`, detail.round.toUpperCase()),
      });
    case "awardCorrect":
      return t("breakdown.awardCorrect", {
        award: safe(
          t,
          `breakdown.awardTypes.${detail.award}`,
          detail.award.replace(/_/g, " ")
        ),
      });
    case "trioMotm":
      return t("breakdown.trioMotm", {
        count: detail.count,
        points: detail.points,
      });
  }
}

// Render the parenthetical sub-detail from category + machine-readable subDetail.
export function subDetailLabel(
  category: string,
  subDetail: string | null,
  t: Translator
): string {
  if (!subDetail) return "";
  switch (category) {
    case "group":
      return t("breakdown.subGroup", { group: subDetail });
    case "knockout":
      return safe(t, `round_${subDetail}`, subDetail.toUpperCase());
    case "awards":
      return safe(
        t,
        `breakdown.awardTypes.${subDetail}`,
        subDetail.replace(/_/g, " ")
      );
    case "golden_trio":
      return t("breakdown.subSlot", { slot: subDetail });
    default:
      return subDetail;
  }
}
