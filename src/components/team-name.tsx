"use client";

import { useLocale } from "next-intl";
import { teamDisplayName } from "@/lib/tournament/team-display-name";

interface TeamNameProps {
  teamId: string | null | undefined;
  fallback?: string;
}

export function TeamName({ teamId, fallback = "TBD" }: TeamNameProps) {
  const locale = useLocale();
  if (!teamId) return <>{fallback}</>;
  return <>{teamDisplayName(teamId, locale)}</>;
}
