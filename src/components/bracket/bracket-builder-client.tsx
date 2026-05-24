"use client";

import { useEffect, useState, useCallback } from "react";
import { useBracketStore, type BracketTeam } from "@/lib/stores/bracket-store";
import { R32_MATCHUPS, BRACKET_STRUCTURE } from "@/lib/tournament/bracket-mapping";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveBracketPredictions } from "@/app/(app)/actions";
import { toast } from "sonner";

interface Props {
  r32Teams: { teamId: string; teamName: string; source: string }[];
  existingPicks: Record<number, BracketTeam>;
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

export function BracketBuilderClient({ r32Teams, existingPicks }: Props) {
  const store = useBracketStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!store.isInitialized) {
      const picks: Record<number, BracketTeam | null> = {};

      if (Object.keys(existingPicks).length > 0) {
        for (const [slot, team] of Object.entries(existingPicks)) {
          picks[parseInt(slot)] = team;
        }
      }

      // Always populate R32 home/away team positions from predictions
      for (const matchup of R32_MATCHUPS) {
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
    }
  }, [r32Teams, existingPicks, store]);

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
  const r32Cards = R32_MATCHUPS.map((matchup) => {
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
        const [s1, s2] = slot.sourceSlots!;
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
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={!store.isDirty || saving}>
          {saving ? "Saving..." : "Save Bracket"}
        </Button>
        <Button variant="outline" onClick={() => store.clearBracket()}>
          Reset Bracket
        </Button>
        {store.isDirty && (
          <span className="text-sm text-yellow-600">Unsaved changes</span>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        <div className="min-w-[220px] flex-shrink-0">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            {ROUND_LABELS.r32}
          </h3>
          <div className="space-y-2">{r32Cards}</div>
        </div>

        {laterRounds
          .filter((r) => r !== "third")
          .map((round) => (
            <div key={round} className="min-w-[220px] flex-shrink-0">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {ROUND_LABELS[round]}
              </h3>
              <div className="space-y-2">{roundCards[round]}</div>
            </div>
          ))}
      </div>

      {/* 3rd place match */}
      {roundCards.third && roundCards.third.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            {ROUND_LABELS.third}
          </h3>
          <div className="max-w-[220px]">{roundCards.third}</div>
        </div>
      )}

      {champion && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="flex items-center gap-3 p-6">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-lg font-bold">{champion.teamName}</p>
              <p className="text-sm text-muted-foreground">
                Your predicted champion
              </p>
            </div>
          </CardContent>
        </Card>
      )}
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
    <Card className="overflow-hidden">
      <div className="divide-y">
        <button
          className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
            winner?.teamId === team1?.teamId
              ? "bg-green-50 dark:bg-green-950"
              : "hover:bg-muted/50"
          }`}
          onClick={() => team1 && onAdvance(team1Slot, targetSlot)}
          disabled={!team1}
        >
          <span className="flex-1 text-sm font-medium">
            {team1?.teamName ?? "TBD"}
          </span>
          {winner?.teamId === team1?.teamId && (
            <Badge variant="default" className="text-xs">W</Badge>
          )}
        </button>
        <button
          className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
            winner?.teamId === team2?.teamId
              ? "bg-green-50 dark:bg-green-950"
              : "hover:bg-muted/50"
          }`}
          onClick={() => team2 && onAdvance(team2Slot, targetSlot)}
          disabled={!team2}
        >
          <span className="flex-1 text-sm font-medium">
            {team2?.teamName ?? "TBD"}
          </span>
          {winner?.teamId === team2?.teamId && (
            <Badge variant="default" className="text-xs">W</Badge>
          )}
        </button>
      </div>
    </Card>
  );
}
