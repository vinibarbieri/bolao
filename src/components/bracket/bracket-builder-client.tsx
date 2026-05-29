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

  // Build R32 matchup cards
  const r32Cards = resolvedMatchups.map((matchup) => {
    const hk = r32HomeKey(matchup.slot);
    const ak = r32AwayKey(matchup.slot);
    const homeTeam = store.picks[hk] ?? null;
    const awayTeam = store.picks[ak] ?? null;
    const winner = store.picks[matchup.slot] ?? null;

    return (
      <MatchupCard
        key={matchup.slot}
        targetSlot={matchup.slot}
        team1={homeTeam}
        team1Slot={hk}
        team2={awayTeam}
        team2Slot={ak}
        winner={winner}
        onAdvance={handleAdvance}
      />
    );
  });

  // Build R16+ cards from BRACKET_STRUCTURE
  const laterRounds = ["r16", "qf", "sf", "final", "third"];
  const roundCards: Record<string, React.ReactNode[]> = {};

  for (const round of laterRounds) {
    roundCards[round] = BRACKET_STRUCTURE
      .filter((s) => s.round === round && s.sourceSlots)
      .map((slot) => {
        let s1: number, s2: number;

        if (slot.round === "third") {
          // Third-place match participants are the LOSERS of the two SFs.
          // slot.sourceSlots = [29, 30] (the SF slots).
          // For each SF, find which of its two source slots holds the loser
          // (the team that is NOT the SF winner).
          const [sf1, sf2] = slot.sourceSlots!;
          const sf1Struct = BRACKET_STRUCTURE.find((s) => s.slotNumber === sf1)!;
          const sf2Struct = BRACKET_STRUCTURE.find((s) => s.slotNumber === sf2)!;
          const [sf1Src1, sf1Src2] = sf1Struct.sourceSlots!;
          const [sf2Src1, sf2Src2] = sf2Struct.sourceSlots!;
          const sf1Winner = store.picks[sf1];
          const sf2Winner = store.picks[sf2];
          // Loser slot = the source slot whose team is NOT the SF winner
          s1 = sf1Winner && store.picks[sf1Src1]?.teamId === sf1Winner.teamId ? sf1Src2 : sf1Src1;
          s2 = sf2Winner && store.picks[sf2Src1]?.teamId === sf2Winner.teamId ? sf2Src2 : sf2Src1;
        } else {
          [s1, s2] = slot.sourceSlots!;
        }

        const team1 = store.picks[s1] ?? null;
        const team2 = store.picks[s2] ?? null;
        const winner = store.picks[slot.slotNumber] ?? null;

        return (
          <MatchupCard
            key={slot.slotNumber}
            targetSlot={slot.slotNumber}
            team1={team1}
            team1Slot={s1}
            team2={team2}
            team2Slot={s2}
            winner={winner}
            onAdvance={handleAdvance}
          />
        );
      });
  }

  const champion = store.picks[32];

  return (
    <div className="space-y-6">
      <div className="sticky top-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
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

      <div className="flex gap-4 overflow-x-auto pb-4">
        <BracketColumn label={ROUND_LABELS.r32}>{r32Cards}</BracketColumn>

        {laterRounds
          .filter((r) => r !== "third")
          .map((round) => (
            <BracketColumn key={round} label={ROUND_LABELS[round]}>
              {roundCards[round]}
            </BracketColumn>
          ))}
      </div>

      {/* 3rd place match */}
      {roundCards.third && roundCards.third.length > 0 && (
        <div>
          <RoundHeading>{ROUND_LABELS.third}</RoundHeading>
          <div className="max-w-[240px]">{roundCards.third}</div>
        </div>
      )}

      {champion && (
        <Card className="overflow-hidden border-gold/60 bg-gold/10">
          <CardContent className="flex items-center gap-4 p-6">
            <span className="bg-brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-brand-foreground shadow-md">
              <Trophy className="h-7 w-7" />
            </span>
            <div className="flex items-center gap-3">
              <TeamFlag teamId={champion.teamId} size="lg" />
              <div>
                <p className="text-xl font-extrabold">{champion.teamName}</p>
                <p className="text-sm text-muted-foreground">
                  Your predicted champion
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RoundHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function BracketColumn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-[240px] flex-shrink-0">
      <RoundHeading>{label}</RoundHeading>
      <div className="flex flex-col justify-around gap-3 h-full">{children}</div>
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
}: {
  targetSlot: number;
  team1: BracketTeam | null;
  team1Slot: number;
  team2: BracketTeam | null;
  team2Slot: number;
  winner: BracketTeam | null;
  onAdvance: (fromSlot: number, toSlot: number) => void;
}) {
  return (
    <Card className="overflow-hidden p-0 shadow-sm transition-shadow hover:shadow-md">
      <div className="divide-y">
        <TeamSlotButton
          team={team1}
          isWinner={!!winner && winner.teamId === team1?.teamId}
          onClick={() => team1 && onAdvance(team1Slot, targetSlot)}
        />
        <TeamSlotButton
          team={team2}
          isWinner={!!winner && winner.teamId === team2?.teamId}
          onClick={() => team2 && onAdvance(team2Slot, targetSlot)}
        />
      </div>
    </Card>
  );
}

function TeamSlotButton({
  team,
  isWinner,
  onClick,
}: {
  team: BracketTeam | null;
  isWinner: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed",
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
