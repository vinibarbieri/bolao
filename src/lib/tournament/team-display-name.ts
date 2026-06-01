import { isoForFifa } from "./flags";

// ENG and SCO map to subdivision codes (gb-eng, gb-sct) which Intl.DisplayNames
// doesn't support as region codes — these need manual overrides.
const OVERRIDES: Record<string, Record<string, string>> = {
  ENG: { en: "England", pt: "Inglaterra" },
  SCO: { en: "Scotland", pt: "Escócia" },
  CIV: { en: "Ivory Coast", pt: "Costa do Marfim" },
};

/**
 * Returns the localized display name for a FIFA team code.
 * Uses Intl.DisplayNames for standard countries, with manual overrides for
 * home-nation teams that use subdivision codes (England, Scotland).
 */
export function teamDisplayName(fifaCode: string, locale: string): string {
  const code = fifaCode.toUpperCase();
  const override = OVERRIDES[code];
  if (override) {
    const lang = locale.split("-")[0];
    return override[lang] ?? override.en;
  }

  const iso = isoForFifa(code);
  if (!iso) return fifaCode;

  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(iso.toUpperCase()) ??
      fifaCode
    );
  } catch {
    return fifaCode;
  }
}
