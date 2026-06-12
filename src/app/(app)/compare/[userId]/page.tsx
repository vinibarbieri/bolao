import { requireUser } from "@/lib/supabase/auth";
import {
  getUserGroupPredictions,
  getUserBracketPicks,
  getUserAwardPredictions,
  getUserGoldenTrio,
  getAllPlayers,
  getTeamsByGroup,
  getUserScoreBreakdown,
  getPredictionVisibility,
  getTournamentConfig,
} from "../../queries";
import {
  ComparePredictionsTabs,
  type GroupBlock,
  type AwardEntry,
  type TrioEntry,
} from "./compare-predictions-tabs";
import { BracketBuilderClient } from "@/components/bracket/bracket-builder-client";
import {
  getThirdPlaceAssignments,
  type GroupLetter,
} from "@/lib/tournament/third-place-lookup";
import { resolveR32Matchups } from "@/lib/tournament/bracket-mapping";
import { POINTS as KNOCKOUT_POINTS } from "@/lib/scoring/knockout-scoring";
import {
  parseDetail,
  describeScore,
  subDetailLabel,
} from "@/lib/scoring/breakdown";
import { MAX_POINTS } from "@/lib/scoring/max-points";
import {
  ScoreBreakdownPanel,
  type BreakdownRow,
  type BreakdownCategory,
} from "./score-breakdown-panel";
import { db } from "@/db";
import { profiles } from "@/db/schema/profiles";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: compareUserId } = await params;
  const currentUser = await requireUser();
  const t = await getTranslations("Compare");
  const locale = await getLocale();

  const profile = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, compareUserId))
    .limit(1);

  if (profile.length === 0) notFound();

  // Visibility gate: own predictions always visible; others only if the user
  // made them public, or once the tournament has started (predictions locked).
  const isSelf = compareUserId === currentUser.id;
  const [visibility, config] = await Promise.all([
    getPredictionVisibility(compareUserId),
    getTournamentConfig(),
  ]);
  const canView =
    isSelf || (visibility?.isPublic ?? false) || (config?.isLocked ?? false);

  if (!canView) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-border">
            <AvatarImage src={profile[0].avatarUrl ?? undefined} />
            <AvatarFallback className="bg-brand-gradient font-bold text-brand-foreground">
              {profile[0].displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide sm:text-4xl">
            {t("predictions", { name: profile[0].displayName })}
          </h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{t("privateTitle")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("privateDescription", { name: profile[0].displayName })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [
    predictions,
    bracketPicks,
    awards,
    trio,
    players,
    teamsByGroup,
    scoreBreakdown,
  ] = await Promise.all([
    getUserGroupPredictions(compareUserId),
    getUserBracketPicks(compareUserId),
    getUserAwardPredictions(compareUserId),
    getUserGoldenTrio(compareUserId),
    getAllPlayers(),
    getTeamsByGroup(),
    // Single cheap read of precomputed scores. Each row's `description` holds
    // language-neutral structured JSON, translated to the active locale below.
    getUserScoreBreakdown(compareUserId),
  ]);

  const playerMap: Record<string, { name: string; teamId: string }> = {};
  for (const p of players) playerMap[p.id] = { name: p.name, teamId: p.teamId };

  // Group stage predictions, grouped by group letter and sorted by position.
  const groupPredsByGroup: Record<
    string,
    { teamId: string; position: number }[]
  > = {};
  for (const pred of predictions) {
    if (!groupPredsByGroup[pred.groupLetter]) {
      groupPredsByGroup[pred.groupLetter] = [];
    }
    groupPredsByGroup[pred.groupLetter].push({
      teamId: pred.teamId,
      position: pred.predictedPosition,
    });
  }
  const groups: GroupBlock[] = Object.entries(groupPredsByGroup)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, preds]) => ({
      letter,
      preds: preds.sort((a, b) => a.position - b.position),
    }));

  // Knockout bracket, rebuilt from this user's group + bracket picks. Mirrors
  // the live bracket page but rendered read-only.
  const allTeams = Object.values(teamsByGroup).flat();
  const teamNameMap: Record<string, string> = {};
  for (const team of allTeams) teamNameMap[team.id] = team.name;

  const thirdPlaceTeams = predictions.filter(
    (p) => p.predictedPosition === 3 && p.advancesAsThird
  );
  const bracketReady = thirdPlaceTeams.length === 8;

  const resolvedMatchups = bracketReady
    ? resolveR32Matchups(
        getThirdPlaceAssignments(
          thirdPlaceTeams.map((p) => p.groupLetter as GroupLetter)
        ).assignments
      )
    : [];

  const r32Teams: { teamId: string; teamName: string; source: string }[] = [];
  if (bracketReady) {
    for (const pred of predictions) {
      const prefix =
        pred.predictedPosition === 1
          ? "1"
          : pred.predictedPosition === 2
            ? "2"
            : pred.predictedPosition === 3 && pred.advancesAsThird
              ? "3"
              : null;
      if (!prefix) continue;
      r32Teams.push({
        teamId: pred.teamId,
        teamName: teamNameMap[pred.teamId] ?? pred.teamId,
        source: `${prefix}${pred.groupLetter}`,
      });
    }
  }

  const existingPicks: Record<number, { teamId: string; teamName: string }> = {};
  for (const pick of bracketPicks) {
    existingPicks[pick.bracketSlot] = {
      teamId: pick.teamId,
      teamName: teamNameMap[pick.teamId] ?? pick.teamId,
    };
  }

  const awardEntries: AwardEntry[] = awards.map((a) => {
    const player = a.playerId ? playerMap[a.playerId] : undefined;
    return {
      awardType: a.awardType,
      playerName: player?.name ?? null,
      teamId: player?.teamId ?? null,
      description: a.description,
    };
  });

  const trioEntries: TrioEntry[] = trio
    .sort((a, b) => a.slot - b.slot)
    .map((tr) => {
      const player = playerMap[tr.playerId];
      return {
        slot: tr.slot,
        playerName: player?.name ?? null,
        teamId: player?.teamId ?? null,
      };
    });

  const knockoutNode =
    bracketReady && bracketPicks.length > 0 ? (
      <BracketBuilderClient
        r32Teams={r32Teams}
        existingPicks={existingPicks}
        resolvedMatchups={resolvedMatchups}
        knockoutPointsConfig={KNOCKOUT_POINTS}
        readOnly
      />
    ) : (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("noPredictions")}
        </CardContent>
      </Card>
    );

  // Bucket the precomputed scores by category and translate each row server-side
  // (translation needs the request locale). The client panel renders the totals,
  // accuracy bars, and expand/collapse over this plain data.
  const groupRows: BreakdownRow[] = [];
  const knockoutRows: BreakdownRow[] = [];
  const awardRows: BreakdownRow[] = [];
  const trioRows: BreakdownRow[] = [];
  let total = 0;
  let trioMotmCount = 0;
  for (const score of scoreBreakdown) {
    const detail = parseDetail(score.description);
    // Legacy rows (pre-JSON) fall back to their stored prose until the next
    // recalculate rewrites them.
    const main = detail
      ? describeScore(detail, t, locale)
      : (score.description ?? "");
    // The main line already names the group/round/award, so the parenthetical
    // sub-detail is redundant there. Only the Golden Trio slot adds information.
    const sub =
      score.category === "golden_trio"
        ? subDetailLabel(score.category, score.subDetail, t)
        : "";
    const row: BreakdownRow = { main, sub, points: score.points };
    total += score.points;
    switch (score.category) {
      case "group":
        groupRows.push(row);
        break;
      case "knockout":
        knockoutRows.push(row);
        break;
      case "awards":
        awardRows.push(row);
        break;
      case "golden_trio":
        trioRows.push(row);
        if (detail?.kind === "trioMotm") trioMotmCount += detail.count;
        break;
    }
  }
  const sum = (rows: BreakdownRow[]) =>
    rows.reduce((acc, r) => acc + r.points, 0);
  const breakdownCategories: BreakdownCategory[] = [
    {
      key: "group",
      labelKey: "tabGroups",
      earned: sum(groupRows),
      possible: MAX_POINTS.group,
      rows: groupRows,
    },
    {
      key: "knockout",
      labelKey: "tabKnockout",
      earned: sum(knockoutRows),
      possible: MAX_POINTS.knockout,
      rows: knockoutRows,
    },
    {
      key: "awards",
      labelKey: "tabAwards",
      earned: sum(awardRows),
      possible: MAX_POINTS.awards,
      rows: awardRows,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 ring-2 ring-border">
          <AvatarImage src={profile[0].avatarUrl ?? undefined} />
          <AvatarFallback className="bg-brand-gradient font-bold text-brand-foreground">
            {profile[0].displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide sm:text-4xl">
            {t("predictions", { name: profile[0].displayName })}
          </h1>
          <p className="text-muted-foreground">
            {t("viewingPredictions")}
          </p>
        </div>
      </div>

      {scoreBreakdown.length > 0 && (
        <ScoreBreakdownPanel
          total={total}
          categories={breakdownCategories}
          trio={{
            earned: sum(trioRows),
            motmCount: trioMotmCount,
            rows: trioRows,
          }}
        />
      )}

      <ComparePredictionsTabs
        groups={groups}
        knockout={knockoutNode}
        awards={awardEntries}
        trio={trioEntries}
      />
    </div>
  );
}
