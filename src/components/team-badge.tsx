"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { isoForFifa } from "@/lib/tournament/flags";
import { teamDisplayName } from "@/lib/tournament/team-display-name";

const SIZE = {
  sm: { flag: "h-3 w-4 text-[0.6rem]", text: "text-xs" },
  md: { flag: "h-4 w-6 text-xs", text: "text-sm" },
  lg: { flag: "h-5 w-7 text-sm", text: "text-base" },
} as const;

interface TeamFlagProps {
  /** FIFA 3-letter code, e.g. "BRA". */
  teamId: string | null | undefined;
  size?: keyof typeof SIZE;
  className?: string;
}

/**
 * Renders a country flag for a FIFA team code via `flag-icons`. Falls back to
 * a neutral placeholder with the team code when the flag is unknown (e.g. TBD).
 */
export function TeamFlag({ teamId, size = "md", className }: TeamFlagProps) {
  const iso = isoForFifa(teamId);
  const sz = SIZE[size];

  if (!iso) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-[2px] bg-muted font-mono font-medium text-muted-foreground ring-1 ring-border",
          sz.flag,
          className,
        )}
        aria-hidden
      >
        {teamId?.slice(0, 2) ?? "?"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "fi inline-block flex-none rounded-[2px] bg-cover bg-center ring-1 ring-black/10",
        `fi-${iso}`,
        sz.flag,
        className,
      )}
      role="img"
      aria-label={teamId ?? undefined}
    />
  );
}

interface TeamBadgeProps {
  teamId: string | null | undefined;
  /** Full display name, e.g. "Brazil". Falls back to the code. */
  name?: string | null;
  size?: keyof typeof SIZE;
  /** Show the FIFA code in muted mono after the name. */
  showCode?: boolean;
  className?: string;
}

/**
 * Flag + team name, used wherever a team appears. Keeps flag/name/code styling
 * consistent across groups, bracket, third-place, awards and leagues.
 */
export function TeamBadge({
  teamId,
  name,
  size = "md",
  showCode = false,
  className,
}: TeamBadgeProps) {
  const locale = useLocale();
  const sz = SIZE[size];
  const label = name ?? (teamId ? teamDisplayName(teamId, locale) : "TBD");

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <TeamFlag teamId={teamId} size={size} />
      <span className={cn("truncate font-medium", sz.text)}>{label}</span>
      {showCode && teamId && (
        <span className="font-mono text-xs uppercase text-muted-foreground">
          {teamId}
        </span>
      )}
    </span>
  );
}
