"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamFlag } from "@/components/team-badge";
import { Volleyball, Trophy, Award, Star } from "lucide-react";
import { useTranslations } from "next-intl";

export interface GroupBlock {
  letter: string;
  preds: { teamId: string; position: number }[];
}

export interface AwardEntry {
  awardType: "golden_boot" | "golden_glove" | "top_assist" | "goal_of_tournament";
  playerName: string | null;
  teamId: string | null;
  description: string | null;
}

export interface TrioEntry {
  slot: number;
  playerName: string | null;
  teamId: string | null;
}

const AWARD_LABEL_KEY: Record<AwardEntry["awardType"], string> = {
  golden_boot: "goldenBoot",
  golden_glove: "goldenGlove",
  top_assist: "topAssists",
  goal_of_tournament: "goalOfTournament",
};

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>
  );
}

export function ComparePredictionsTabs({
  groups,
  knockout,
  awards,
  trio,
}: {
  groups: GroupBlock[];
  knockout: ReactNode;
  awards: AwardEntry[];
  trio: TrioEntry[];
}) {
  const t = useTranslations("Compare");
  const tAwards = useTranslations("Awards");

  const hasAwards = awards.some((a) => a.playerName);
  const hasTrio = trio.some((tr) => tr.playerName);

  return (
    <Tabs defaultValue="groups">
      <TabsList>
        <TabsTrigger value="groups">
          <Volleyball className="h-4 w-4" />
          {t("tabGroups")}
        </TabsTrigger>
        <TabsTrigger value="knockout">
          <Trophy className="h-4 w-4" />
          {t("tabKnockout")}
        </TabsTrigger>
        <TabsTrigger value="awards">
          <Award className="h-4 w-4" />
          {t("tabAwards")}
        </TabsTrigger>
        <TabsTrigger value="trio">
          <Star className="h-4 w-4" />
          {t("tabTrio")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="groups">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volleyball className="h-5 w-5 text-chart-3" />
              {t("groupPredictions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <EmptyState message={t("noPredictions")} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((g) => (
                  <div key={g.letter} className="rounded-lg border p-3">
                    <h4 className="mb-2 font-semibold">
                      {t("group", { letter: g.letter })}
                    </h4>
                    {g.preds.map((pred) => (
                      <div
                        key={pred.teamId}
                        className="flex items-center gap-2 py-1"
                      >
                        <Badge
                          variant="outline"
                          className="w-6 justify-center"
                        >
                          {pred.position}
                        </Badge>
                        <TeamFlag teamId={pred.teamId} size="sm" />
                        <span className="text-sm font-medium">
                          {pred.teamId}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="knockout">{knockout}</TabsContent>

      <TabsContent value="awards">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-chart-2" />
              {t("awardPredictions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasAwards ? (
              <EmptyState message={t("noPredictions")} />
            ) : (
              <div className="space-y-2">
                {awards.map((a) => (
                  <div
                    key={a.awardType}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="font-medium">
                      {tAwards(AWARD_LABEL_KEY[a.awardType])}
                    </span>
                    {a.playerName ? (
                      <span className="flex items-center gap-2 text-sm">
                        <TeamFlag teamId={a.teamId} size="sm" />
                        {a.playerName}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trio">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-chart-4" />
              {t("trioPredictions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTrio ? (
              <EmptyState message={t("noPredictions")} />
            ) : (
              <div className="space-y-2">
                {trio
                  .filter((tr) => tr.playerName)
                  .map((tr) => (
                    <div
                      key={tr.slot}
                      className="flex items-center gap-2 rounded-md border px-3 py-2"
                    >
                      <Badge variant="outline" className="w-6 justify-center">
                        {tr.slot}
                      </Badge>
                      <TeamFlag teamId={tr.teamId} size="sm" />
                      <span className="text-sm font-medium">
                        {tr.playerName}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
