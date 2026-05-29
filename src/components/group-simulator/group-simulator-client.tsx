"use client";

import { useEffect, useCallback } from "react";
import {
  useGroupSimulatorStore,
  type GroupLetter,
  GROUP_LETTERS,
} from "@/lib/stores/group-simulator-store";
import { PlacementsTable } from "./placements-table";
import { ScoresTable } from "./scores-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveGroupPredictions, saveScorePredictions } from "@/app/(app)/actions";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  initialPlacements: Record<
    string,
    { teamId: string; teamName: string; position: number }[]
  >;
  initialScores: Record<
    string,
    {
      matchId: string;
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number | null;
      awayScore: number | null;
    }[]
  >;
  initialThirdPlaces: string[];
  teamPointsMap: Record<string, number>;
}

export function GroupSimulatorClient({
  initialPlacements,
  initialScores,
  initialThirdPlaces,
  teamPointsMap,
}: Props) {
  const store = useGroupSimulatorStore();

  useEffect(() => {
    if (!store.isInitialized) {
      store.initialize({
        placements: initialPlacements as Record<GroupLetter, typeof initialPlacements["A"]>,
        scores: initialScores as Record<GroupLetter, typeof initialScores["A"]>,
        selectedThirdPlaces: initialThirdPlaces,
      });
    }
  }, [initialPlacements, initialScores, initialThirdPlaces, store]);

  const handleSave = useCallback(async () => {
    try {
      // Save group placements
      const data = GROUP_LETTERS.map((letter) => ({
        groupLetter: letter,
        teams: store.placements[letter].map((t) => ({
          teamId: t.teamId,
          position: t.position,
        })),
      }));

      await saveGroupPredictions(data);

      // Save score predictions
      const allScores = GROUP_LETTERS.flatMap((letter) =>
        store.scores[letter]
          .filter((s) => s.homeScore !== null && s.awayScore !== null)
          .map((s) => ({
            matchId: s.matchId,
            homeScore: s.homeScore!,
            awayScore: s.awayScore!,
          }))
      );

      if (allScores.length > 0) {
        await saveScorePredictions(allScores);
      }

      store.markClean();
      toast.success("Group predictions saved!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save predictions"
      );
    }
  }, [store]);

  if (!store.isInitialized) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Group selector tabs */}
      <div className="flex flex-wrap gap-2">
        {GROUP_LETTERS.map((letter) => (
          <Button
            key={letter}
            variant={store.activeGroup === letter ? "default" : "outline"}
            size="sm"
            onClick={() => store.setActiveGroup(letter)}
          >
            Group {letter}
          </Button>
        ))}
      </div>

      {/* View toggle */}
      <Tabs
        value={store.activeView}
        onValueChange={(v) =>
          store.setActiveView(v as "placements" | "scores" | "split")
        }
      >
        <TabsList>
          <TabsTrigger value="placements">Placements</TabsTrigger>
          <TabsTrigger value="scores">Score Simulator</TabsTrigger>
          <TabsTrigger value="split">Split View</TabsTrigger>
        </TabsList>

        <TabsContent value="placements">
          <PlacementsTable
            group={store.activeGroup}
            placements={store.placements[store.activeGroup]}
            onReorder={(from, to) =>
              store.reorderPlacement(store.activeGroup, from, to)
            }
            teamPointsMap={teamPointsMap}
          />
        </TabsContent>

        <TabsContent value="scores">
          <div className="space-y-4">
            <ScoresTable
              group={store.activeGroup}
              scores={store.scores[store.activeGroup]}
              standings={store.computedStandings[store.activeGroup]}
              placements={store.placements[store.activeGroup]}
              onScoreChange={(matchId, home, away) =>
                store.setScore(store.activeGroup, matchId, home, away)
              }
            />
            <Button
              variant="secondary"
              onClick={() => store.syncFromScores(store.activeGroup)}
              disabled={
                store.computedStandings[store.activeGroup].length === 0
              }
            >
              Sync standings to placements
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="split">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Your Placements (Drag to reorder)
              </h3>
              <PlacementsTable
                group={store.activeGroup}
                placements={store.placements[store.activeGroup]}
                onReorder={(from, to) =>
                  store.reorderPlacement(store.activeGroup, from, to)
                }
                teamPointsMap={teamPointsMap}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Score Simulator
              </h3>
              <ScoresTable
                group={store.activeGroup}
                scores={store.scores[store.activeGroup]}
                standings={store.computedStandings[store.activeGroup]}
                placements={store.placements[store.activeGroup]}
                onScoreChange={(matchId, home, away) =>
                  store.setScore(store.activeGroup, matchId, home, away)
                }
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => store.syncFromScores(store.activeGroup)}
                disabled={
                  store.computedStandings[store.activeGroup].length === 0
                }
              >
                Sync to placements
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
        <Button onClick={handleSave} disabled={!store.isDirty} className="gap-2">
          <Save className="h-4 w-4" />
          Save All Group Predictions
        </Button>
        {store.isDirty ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-third-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-third" />
            Unsaved changes
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">All changes saved</span>
        )}
      </div>
    </div>
  );
}
