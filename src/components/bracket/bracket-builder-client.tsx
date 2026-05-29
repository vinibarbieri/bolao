"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useBracketStore, type BracketTeam } from "@/lib/stores/bracket-store";
import { type R32Matchup, BRACKET_STRUCTURE } from "@/lib/tournament/bracket-mapping";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveBracketPredictions } from "@/app/(app)/actions";
import { TeamFlag } from "@/components/team-badge";
import { cn } from "@/lib/utils";
import { Trophy, Crown, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  r32Teams: { teamId: string; teamName: string; source: string }[];
  existingPicks: Record<number, BracketTeam>;
  resolvedMatchups: R32Matchup[];
}

const ROUND_LABELS: Record<string, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-Finals",
  sf: "Semi-Finals",
  final: "Final",
  third: "3rd Place",
};

// For R32, each slot is a match with home/away.
// We encode R32 team positions as slot*100+1 (home) and slot*100+2 (away)
// e.g., R32 match slot 1: home team at key 101, away team at key 102
// The winner of the R32 match gets stored at slot 1.
// R16+ use the sourceSlots from BRACKET_STRUCTURE.
function r32HomeKey(slot: number) { return slot * 100 + 1; }
function r32AwayKey(slot: number) { return slot * 100 + 2; }

function sourceString(source: { type: string; group: string }): string {
  const positionMap: Record<string, string> = {
    group_winner: "1",
    group_runner_up: "2",
    third_place: "3",
  };
  return `${positionMap[source.type] ?? "?"}${source.group}`;
}

export function BracketBuilderClient({ r32Teams, existingPicks, resolvedMatchups }: Props) {
  const store = useBracketStore();
  const [saving, setSaving] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const picks: Record<number, BracketTeam | null> = {};

    if (Object.keys(existingPicks).length > 0) {
      for (const [slot, team] of Object.entries(existingPicks)) {
        picks[parseInt(slot)] = team;
      }
    }

    // Always populate R32 home/away team positions from predictions
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

    store.initialize(picks);
  }, [r32Teams, existingPicks, resolvedMatchups, store]);

  const handleAdvance = useCallback(
    (fromSlot: number, toSlot: number) => {
      store.advanceTeam(fromSlot, toSlot);
    },
    [store]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only save real bracket slots (1-32), not the R32 team position keys (100+)
      const picks = Object.entries(store.picks)
        .filter(([slot, team]) => team !== null && parseInt(slot) <= 32)
        .map(([slot, team]) => ({
          bracketSlot: parseInt(slot),
          teamId: team!.teamId,
        }));

      await saveBracketPredictions(picks);
      store.markClean();
      toast.success("Bracket saved!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save bracket"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!store.isInitialized) {
    return <div className="text-muted-foreground">Loading bracket...</div>;
  }

  // Renders the matchup card for any slot (R32 or a later round), wired to the
  // store. `mirror` flips the layout for the right half so flags face inward.
  const renderSlotCard = (slotNumber: number, mirror = false) => {
    const r32 = resolvedMatchups.find((m) => m.slot === slotNumber);
    let s1: number;
    let s2: number;

    if (r32) {
      s1 = r32HomeKey(slotNumber);
      s2 = r32AwayKey(slotNumber);
    } else {
      const slot = BRACKET_STRUCTURE.find((s) => s.slotNumber === slotNumber)!;
      if (slot.round === "third") {
        // Third-place participants are the LOSERS of the two SFs: for each SF,
        // the source slot whose team is NOT the SF winner.
        const [sf1, sf2] = slot.sourceSlots!;
        const sf1Struct = BRACKET_STRUCTURE.find((s) => s.slotNumber === sf1)!;
        const sf2Struct = BRACKET_STRUCTURE.find((s) => s.slotNumber === sf2)!;
        const [sf1Src1, sf1Src2] = sf1Struct.sourceSlots!;
        const [sf2Src1, sf2Src2] = sf2Struct.sourceSlots!;
        const sf1Winner = store.picks[sf1];
        const sf2Winner = store.picks[sf2];
        s1 = sf1Winner && store.picks[sf1Src1]?.teamId === sf1Winner.teamId ? sf1Src2 : sf1Src1;
        s2 = sf2Winner && store.picks[sf2Src1]?.teamId === sf2Winner.teamId ? sf2Src2 : sf2Src1;
      } else {
        [s1, s2] = slot.sourceSlots!;
      }
    }

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
      />
    );
  };

  const champion = store.picks[32];

  // Slot groupings per half. Left feeds SF 29, right feeds SF 30; both meet
  // at the Final (32). Teams in the same half can only meet by the semi-final.
  const LEFT = { r32: [1, 2, 3, 4, 5, 6, 7, 8], r16: [17, 18, 19, 20], qf: [25, 26], sf: [29] };
  const RIGHT = { sf: [30], qf: [27, 28], r16: [21, 22, 23, 24], r32: [9, 10, 11, 12, 13, 14, 15, 16] };

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-3 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
        <Button
          onClick={handleSave}
          disabled={!store.isDirty || saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Bracket"}
        </Button>
        <Button
          variant="outline"
          onClick={() => store.clearBracket()}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {store.isDirty ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-third-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-third" />
            Unsaved changes
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Bracket saved</span>
        )}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="mx-auto flex w-max items-stretch gap-3 sm:gap-4">
          {/* LEFT HALF */}
          <BracketColumn label={ROUND_LABELS.r32}>
            {LEFT.r32.map((s) => renderSlotCard(s))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.r16}>
            {LEFT.r16.map((s) => renderSlotCard(s))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.qf}>
            {LEFT.qf.map((s) => renderSlotCard(s))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.sf}>
            {LEFT.sf.map((s) => renderSlotCard(s))}
          </BracketColumn>

          {/* CENTER: champion on top, then the Final, then 3rd place */}
          <div className="flex min-w-[220px] flex-col items-center justify-center gap-4">
            {/* Champion (above the final) */}
            <div className="flex flex-col items-center gap-2">
              <RoundHeading className="mb-0 text-gold-foreground">
                Champion
              </RoundHeading>
              <span className="bg-brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-brand-foreground shadow-md">
                <Trophy className="h-7 w-7" />
              </span>
              {champion ? (
                <div className="flex max-w-full items-center gap-2 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2">
                  <Crown className="h-4 w-4 shrink-0 text-gold" />
                  <TeamFlag teamId={champion.teamId} size="md" />
                  <span className="truncate text-sm font-bold">
                    {champion.teamName}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Pick the winner
                </span>
              )}
            </div>

            {/* Final */}
            <div className="w-full">
              <RoundHeading className="text-center">
                {ROUND_LABELS.final}
              </RoundHeading>
              {renderSlotCard(32)}
            </div>

            {/* 3rd place (below the final) */}
            <div className="w-full">
              <RoundHeading className="text-center">
                {ROUND_LABELS.third}
              </RoundHeading>
              {renderSlotCard(31)}
            </div>
          </div>

          {/* RIGHT HALF (mirrored) */}
          <BracketColumn label={ROUND_LABELS.sf} align="right">
            {RIGHT.sf.map((s) => renderSlotCard(s, true))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.qf} align="right">
            {RIGHT.qf.map((s) => renderSlotCard(s, true))}
          </BracketColumn>
          <BracketColumn label={ROUND_LABELS.r16} align="right">
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

function RoundHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </h3>
  );
}

function BracketColumn({
  label,
  children,
  align = "left",
}: {
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="flex w-[180px] flex-shrink-0 flex-col sm:w-[200px]">
      <h3
        className={cn(
          "mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground",
          align === "right" && "text-right",
        )}
      >
        {label}
      </h3>
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
}: {
  targetSlot: number;
  team1: BracketTeam | null;
  team1Slot: number;
  team2: BracketTeam | null;
  team2Slot: number;
  winner: BracketTeam | null;
  onAdvance: (fromSlot: number, toSlot: number) => void;
  mirror?: boolean;
}) {
  return (
    <Card className="overflow-hidden p-0 shadow-sm transition-shadow hover:shadow-md">
      <div className="divide-y">
        <TeamSlotButton
          team={team1}
          isWinner={!!winner && winner.teamId === team1?.teamId}
          onClick={() => team1 && onAdvance(team1Slot, targetSlot)}
          mirror={mirror}
        />
        <TeamSlotButton
          team={team2}
          isWinner={!!winner && winner.teamId === team2?.teamId}
          onClick={() => team2 && onAdvance(team2Slot, targetSlot)}
          mirror={mirror}
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
}: {
  team: BracketTeam | null;
  isWinner: boolean;
  onClick: () => void;
  mirror?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 transition-colors disabled:cursor-not-allowed",
        mirror ? "flex-row-reverse text-right" : "text-left",
        isWinner
          ? "bg-qualified/12 font-semibold"
          : team
            ? "hover:bg-muted/60"
            : "opacity-60",
      )}
      onClick={onClick}
      disabled={!team}
    >
      {team ? (
        <TeamFlag teamId={team.teamId} size="md" />
      ) : (
        <span className="h-4 w-6 rounded-[2px] bg-muted" />
      )}
      <span className="flex-1 truncate text-sm">{team?.teamName ?? "TBD"}</span>
      {isWinner && <Crown className="h-4 w-4 shrink-0 text-gold" />}
    </button>
  );
}
