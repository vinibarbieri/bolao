"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamFlag } from "@/components/team-badge";
import { TeamName } from "@/components/team-name";
import { ComputedStandingsCard } from "./scores-table";
import { cn } from "@/lib/utils";
import type {
  ComputedStanding,
  GroupLetter,
} from "@/lib/stores/group-simulator-store";
import { useTranslations } from "next-intl";

export interface RealMatch {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
}

export interface RealGroupResult {
  matches: RealMatch[];
  standings: ComputedStanding[];
}

export function RealResultsView({
  group,
  result,
}: {
  group: GroupLetter;
  result: RealGroupResult;
}) {
  const t = useTranslations("Groups");
  const played = result.matches.some(
    (m) => m.homeScore !== null && m.awayScore !== null,
  );

  return (
    <div className="@container">
      <div className="flex flex-col gap-4 @[900px]:flex-row @[900px]:items-start">
        <Card className="min-w-0 flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {t("matches", { letter: group })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
            ) : (
              <div className="space-y-2">
                {result.matches.map((match) => {
                  const finished =
                    match.homeScore !== null && match.awayScore !== null;
                  return (
                    <div
                      key={match.matchId}
                      className="flex items-center gap-2 rounded-lg border bg-background p-2"
                    >
                      <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-sm font-medium">
                        <span className="hidden truncate text-right @[600px]:block">
                          <TeamName
                            teamId={match.homeTeamId}
                            fallback={match.homeTeamId}
                          />
                        </span>
                        <span className="shrink-0 font-bold @[600px]:hidden">
                          {match.homeTeamId}
                        </span>
                        <TeamFlag teamId={match.homeTeamId} size="md" />
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 font-bold tabular-nums">
                        <span className="w-5 text-center">
                          {finished ? match.homeScore : "–"}
                        </span>
                        <span className="text-muted-foreground">x</span>
                        <span className="w-5 text-center">
                          {finished ? match.awayScore : "–"}
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                        <TeamFlag teamId={match.awayTeamId} size="md" />
                        <span className="hidden truncate @[600px]:block">
                          <TeamName
                            teamId={match.awayTeamId}
                            fallback={match.awayTeamId}
                          />
                        </span>
                        <span className="shrink-0 font-bold @[600px]:hidden">
                          {match.awayTeamId}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {played ? (
          <ComputedStandingsCard
            standings={result.standings}
            className={cn("@[900px]:shrink-0")}
          />
        ) : (
          <Card className="@[900px]:shrink-0">
            <CardContent className="py-6 text-sm text-muted-foreground">
              {t("noResultsYet")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
