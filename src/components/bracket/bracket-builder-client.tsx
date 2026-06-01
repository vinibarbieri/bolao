"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useBracketStore, type BracketTeam } from "@/lib/stores/bracket-store";
import { type R32Matchup } from "@/lib/tournament/bracket-mapping";
import {
  reconcileBracketPicks,
  feederSlots,
  r32HomeKey,
  r32AwayKey,
} from "@/lib/tournament/reconcile-bracket";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveBracketPredictions } from "@/app/(app)/actions";
import { TeamFlag } from "@/components/team-badge";
import { TeamName } from "@/components/team-name";
import { cn } from "@/lib/utils";
import { Trophy, Crown, Save, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

interface Props {
  r32Teams: { teamId: string; teamName: string; source: string }[];
  existingPicks: Record<number, BracketTeam>;
  resolvedMatchups: R32Matchup[];
  knockoutRoundPoints?: Record<string, number>;
  knockoutPointsConfig?: Record<string, number>;
  /** Render the bracket without editing controls (e.g. viewing another user). */
  readOnly?: boolean;
}

function sourceString(source: { type: string; group: string }): string {
  const positionMap: Record<string, string> = {
    group_winner: "1",
    group_runner_up: "2",
    third_place: "3",
  };
  return `${positionMap[source.type] ?? "?"}${source.group}`;
}

export function BracketBuilderClient({ r32Teams, existingPicks, resolvedMatchups, knockoutRoundPoints = {}, knockoutPointsConfig = {}, readOnly = false }: Props) {
  const t = useTranslations("Bracket");
  const store = useBracketStore();
  const [saving, setSaving] = useState(false);
  const hasInitialized = useRef(false);

  const ROUND_LABELS: Record<string, string> = {
    r32: t("roundOf32"),
    r16: t("roundOf16"),
    qf: t("quarterFinals"),
    sf: t("semiFinals"),
    final: t("final"),
    third: t("thirdPlace"),
  };

  const ROUND_POINT_TOOLTIPS: Record<string, string> = {
    r16: t("r16Tooltip"),
    qf: t("qfTooltip"),
    sf: t("sfTooltip"),
    final: t("finalTooltip"),
    third: t("thirdTooltip"),
    champion: t("championTooltip"),
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const picks: Record<number, BracketTeam | null> = {};

    if (Object.keys(existingPicks).length > 0) {
      for (const [slot, team] of Object.entries(existingPicks)) {
        picks[parseInt(slot)] = team;
      }
    }

    for (const matchup of resolvedMatchups) {
      const homeTeam = r32Teams.find(
        (t) => t.source === sourceString(matchup.homeSource)
      );
      const awayTeam = r32Teams.find(
        (t) => t.source === sourceString(matchup.awaySource)
      );

      const hk = r32HomeKey(matchup.slot);
      const ak = r32AwayKey(matchup.slot);

      if (homeTeam && !picks[hk]) {
        picks[hk] = { teamId: homeTeam.teamId, teamName: homeTeam.teamName };
      }
      if (awayTeam && !picks[ak]) {
        picks[ak] = { teamId: awayTeam.teamId, teamName: awayTeam.teamName };
      }
    }

    // Prune saved winner picks that no longer match the current R32 base (the
    // group predictions changed since the bracket was last saved).
    const r32Base: Record<number, string> = {};
    const savedSlots: Record<number, string> = {};
    for (const [key, team] of Object.entries(picks)) {
      if (!team) continue;
      const n = parseInt(key);
      if (n > 32) r32Base[n] = team.teamId;
      else savedSlots[n] = team.teamId;
    }
    const { prunedSlots } = reconcileBracketPicks(r32Base, savedSlots);
    for (const slot of prunedSlots) {
      picks[slot] = null;
    }

    store.initialize(picks);
    if (prunedSlots.length > 0) {
      store.markDirty();
      toast.info(t("bracketReconciled"));
    }
  }, [r32Teams, existingPicks, resolvedMatchups, store, t]);

  const handleAdvance = useCallback(
    (fromSlot: number, toSlot: number) => {
      if (readOnly) return;
      store.advanceTeam(fromSlot, toSlot);
    },
    [store, readOnly]
  );

  // Persist + toast + rethrow on failure (no navigation). Reused by the Save
  // button and the unsaved-changes guard.
  const commit = useCallback(async () => {
    setSaving(true);
    try {
      const picks = Object.entries(store.picks)
        .filter(([slot, team]) => team !== null && parseInt(slot) <= 32)
        .map(([slot, team]) => ({
          bracketSlot: parseInt(slot),
          teamId: team!.teamId,
        }));

      await saveBracketPredictions(picks);
      store.markClean();
      toast.success(t("bracketSaved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedSave")
      );
      throw error;
    } finally {
      setSaving(false);
    }
  }, [store, t]);

  const handleSave = useCallback(() => {
    commit().catch(() => {});
  }, [commit]);

  useUnsavedChanges({ isDirty: !readOnly && store.isDirty, onSave: commit });

  if (!store.isInitialized) {
    return <div className="text-muted-foreground">{t("loadingBracket")}</div>;
  }

  // teamId view of the current picks, for feeder resolution (third-place match).
  const teamIdPicks: Record<number, string> = {};
  for (const [key, team] of Object.entries(store.picks)) {
    if (team) teamIdPicks[parseInt(key)] = team.teamId;
  }

  const renderSlotCard = (slotNumber: number, mirror = false) => {
    const [s1, s2] = feederSlots(slotNumber, teamIdPicks);

    return (
      <MatchupCard
        key={slotNumber}
        targetSlot={slotNumber}
        team1={store.picks[s1] ?? null}
        team1Slot={s1}
        team2={store.picks[s2] ?? null}
        team2Slot={s2}
        winner={store.picks[slotNumber] ?? null}
        onAdvance={handleAdvance}
        mirror={mirror}
        readOnly={readOnly}
      />
    );
  };

  const champion = store.picks[32];
  const totalKnockoutPoints = Object.values(knockoutRoundPoints).reduce((a, b) => a + b, 0);

  const LEFT = { r32: [1, 2, 3, 4, 5, 6, 7, 8], r16: [17, 18, 19, 20], qf: [25, 26], sf: [29] };
  const RIGHT = { sf: [30], qf: [27, 28], r16: [21, 22, 23, 24], r32: [9, 10, 11, 12, 13, 14, 15, 16] };

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-3 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
          <Button
            onClick={handleSave}
            disabled={!store.isDirty || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? t("saving") : store.isDirty ? t("saveBracket") : t("saved")}
          </Button>
          <Button
            variant="outline"
            onClick={() => store.clearBracket()}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t("reset")}
          </Button>
          {totalKnockoutPoints > 0 && (
            <span className="ml-auto rounded-full bg-qualified/15 px-3 py-1 font-mono text-sm font-bold text-qualified-foreground">
              {t("ptsEarned", { points: totalKnockoutPoints })}
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="mx-auto flex w-max items-stretch gap-3 sm:gap-4">
          <BracketColumn label={ROUND_LABELS.r32}>
            {LEFT.r32.map((s) => renderSlotCard(s))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.r16} scoringPoints={knockoutPointsConfig.r16} tooltipText={ROUND_POINT_TOOLTIPS.r16}>
            {LEFT.r16.map((s) => renderSlotCard(s))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.qf} scoringPoints={knockoutPointsConfig.qf} tooltipText={ROUND_POINT_TOOLTIPS.qf}>
            {LEFT.qf.map((s) => renderSlotCard(s))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.sf} scoringPoints={knockoutPointsConfig.sf} tooltipText={ROUND_POINT_TOOLTIPS.sf}>
            {LEFT.sf.map((s) => renderSlotCard(s))}
          </BracketColumn>

          <div className="flex min-w-[220px] flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <RoundHeading className="mb-0 text-gold-foreground" scoringPoints={knockoutPointsConfig.champion} tooltipText={ROUND_POINT_TOOLTIPS.champion}>
                {t("champion")}
              </RoundHeading>
              <span className="bg-brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-brand-foreground shadow-md">
                <Trophy className="h-7 w-7" />
              </span>
              {champion ? (
                <div className="flex max-w-full items-center gap-2 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2">
                  <Crown className="h-4 w-4 shrink-0 text-gold" />
                  <TeamFlag teamId={champion.teamId} size="md" />
                  <span className="truncate text-sm font-bold">
                    <TeamName teamId={champion.teamId} />
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("pickWinner")}
                </span>
              )}
            </div>

            <div className="w-full">
              <RoundHeading className="text-center" scoringPoints={knockoutPointsConfig.final} tooltipText={ROUND_POINT_TOOLTIPS.final}>
                {ROUND_LABELS.final}
              </RoundHeading>
              {renderSlotCard(32)}
            </div>

            <div className="w-full">
              <RoundHeading className="text-center" scoringPoints={knockoutPointsConfig.third} tooltipText={ROUND_POINT_TOOLTIPS.third}>
                {ROUND_LABELS.third}
              </RoundHeading>
              {renderSlotCard(31)}
            </div>
          </div>

          <BracketColumn label={ROUND_LABELS.sf} align="right" scoringPoints={knockoutPointsConfig.sf} tooltipText={ROUND_POINT_TOOLTIPS.sf}>
            {RIGHT.sf.map((s) => renderSlotCard(s, true))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.qf} align="right" scoringPoints={knockoutPointsConfig.qf} tooltipText={ROUND_POINT_TOOLTIPS.qf}>
            {RIGHT.qf.map((s) => renderSlotCard(s, true))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.r16} align="right" scoringPoints={knockoutPointsConfig.r16} tooltipText={ROUND_POINT_TOOLTIPS.r16}>
            {RIGHT.r16.map((s) => renderSlotCard(s, true))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.r32} align="right">
            {RIGHT.r32.map((s) => renderSlotCard(s, true))}
          </BracketColumn>
        </div>
      </div>
    </div>
  );
}

function PointsBadge({
  points,
  tooltipText,
  className,
}: {
  points: number;
  tooltipText?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          className={cn(
            "cursor-pointer rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary",
            className,
          )}
          onClick={() => setOpen((v) => !v)}
        >
          +{points}
        </TooltipTrigger>
        {tooltipText && (
          <TooltipContent>
            +{points} {tooltipText}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function RoundHeading({
  children,
  className,
  scoringPoints,
  tooltipText,
}: {
  children: React.ReactNode;
  className?: string;
  scoringPoints?: number;
  tooltipText?: string;
}) {
  return (
    <h3
      className={cn(
        "mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
      {scoringPoints !== undefined && (
        <PointsBadge points={scoringPoints} tooltipText={tooltipText} className="normal-case tracking-normal" />
      )}
    </h3>
  );
}

function BracketColumn({
  label,
  children,
  align = "left",
  scoringPoints,
  tooltipText,
}: {
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
  scoringPoints?: number;
  tooltipText?: string;
}) {
  return (
    <div className="flex w-[180px] flex-shrink-0 flex-col sm:w-[200px]">
      <div
        className={cn(
          "mb-3 flex items-center gap-2",
          align === "right" ? "justify-end" : "justify-start",
        )}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        {scoringPoints !== undefined && (
          <PointsBadge points={scoringPoints} tooltipText={tooltipText} />
        )}
      </div>
      <div className="flex h-full flex-col justify-around gap-3">{children}</div>
    </div>
  );
}

function MatchupCard({
  targetSlot,
  team1,
  team1Slot,
  team2,
  team2Slot,
  winner,
  onAdvance,
  mirror = false,
  readOnly = false,
}: {
  targetSlot: number;
  team1: BracketTeam | null;
  team1Slot: number;
  team2: BracketTeam | null;
  team2Slot: number;
  winner: BracketTeam | null;
  onAdvance: (fromSlot: number, toSlot: number) => void;
  mirror?: boolean;
  readOnly?: boolean;
}) {
  return (
    <Card className={cn("overflow-hidden p-0 shadow-sm", !readOnly && "transition-shadow hover:shadow-md")}>
      <div className="divide-y">
        <TeamSlotButton
          team={team1}
          isWinner={!!winner && winner.teamId === team1?.teamId}
          onClick={() => team1 && onAdvance(team1Slot, targetSlot)}
          mirror={mirror}
          readOnly={readOnly}
        />
        <TeamSlotButton
          team={team2}
          isWinner={!!winner && winner.teamId === team2?.teamId}
          onClick={() => team2 && onAdvance(team2Slot, targetSlot)}
          mirror={mirror}
          readOnly={readOnly}
        />
      </div>
    </Card>
  );
}

function TeamSlotButton({
  team,
  isWinner,
  onClick,
  mirror = false,
  readOnly = false,
}: {
  team: BracketTeam | null;
  isWinner: boolean;
  onClick: () => void;
  mirror?: boolean;
  readOnly?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 transition-colors disabled:cursor-not-allowed",
        mirror ? "flex-row-reverse text-right" : "text-left",
        isWinner
          ? "bg-qualified/12 font-semibold"
          : team && !readOnly
            ? "hover:bg-muted/60"
            : !team
              ? "opacity-60"
              : "",
        readOnly && "cursor-default",
      )}
      onClick={onClick}
      disabled={!team || readOnly}
    >
      {team ? (
        <TeamFlag teamId={team.teamId} size="md" />
      ) : (
        <span className="h-4 w-6 rounded-[2px] bg-muted" />
      )}
      <span className="flex-1 truncate text-sm"><TeamName teamId={team?.teamId} /></span>
      {isWinner && <Crown className="h-4 w-4 shrink-0 text-gold" />}
    </button>
  );
}
