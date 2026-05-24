"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAwardPredictions } from "@/app/(app)/actions";
import { toast } from "sonner";

const AWARD_TYPES = [
  {
    type: "golden_boot" as const,
    label: "Golden Boot",
    description: "Top scorer of the tournament",
    needsPlayer: true,
  },
  {
    type: "golden_glove" as const,
    label: "Golden Glove",
    description: "Best goalkeeper of the tournament",
    needsPlayer: true,
  },
  {
    type: "top_assist" as const,
    label: "Top Assists",
    description: "Most assists in the tournament",
    needsPlayer: true,
  },
  {
    type: "goal_of_tournament" as const,
    label: "Goal of the Tournament",
    description: "Best goal scored in the tournament",
    needsPlayer: false,
  },
];

interface Player {
  id: string;
  name: string;
  teamId: string;
  position: string;
}

interface Prediction {
  awardType: string;
  playerId: string | null;
  description: string | null;
}

export function AwardsPredictionClient({
  existingPredictions,
  players,
}: {
  existingPredictions: Prediction[];
  players: Player[];
}) {
  const predMap = useMemo(() => {
    const map: Record<string, Prediction> = {};
    for (const p of existingPredictions) {
      map[p.awardType] = p;
    }
    return map;
  }, [existingPredictions]);

  const [selections, setSelections] = useState<
    Record<string, { playerId?: string; description?: string; search?: string }>
  >(() => {
    const initial: Record<string, { playerId?: string; description?: string; search?: string }> = {};
    for (const award of AWARD_TYPES) {
      const existing = predMap[award.type];
      initial[award.type] = {
        playerId: existing?.playerId ?? undefined,
        description: existing?.description ?? undefined,
        search: existing?.playerId
          ? players.find((p) => p.id === existing.playerId)?.name ?? ""
          : "",
      };
    }
    return initial;
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = AWARD_TYPES.map((award) => ({
        awardType: award.type,
        playerId: selections[award.type]?.playerId,
        description: selections[award.type]?.description,
      }));

      await saveAwardPredictions(data);
      toast.success("Award predictions saved!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {AWARD_TYPES.map((award) => (
        <Card key={award.type}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{award.label}</CardTitle>
            <CardDescription>{award.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {award.needsPlayer ? (
              <div className="space-y-2">
                <Label>Player</Label>
                <Input
                  placeholder="Search for a player..."
                  value={selections[award.type]?.search ?? ""}
                  onChange={(e) => {
                    setSelections((prev) => ({
                      ...prev,
                      [award.type]: {
                        ...prev[award.type],
                        search: e.target.value,
                        playerId: undefined,
                      },
                    }));
                  }}
                />
                {selections[award.type]?.search &&
                  !selections[award.type]?.playerId && (
                    <div className="max-h-40 overflow-y-auto rounded-md border">
                      {players
                        .filter((p) =>
                          p.name
                            .toLowerCase()
                            .includes(
                              (
                                selections[award.type]?.search ?? ""
                              ).toLowerCase()
                            )
                        )
                        .slice(0, 10)
                        .map((player) => (
                          <button
                            key={player.id}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setSelections((prev) => ({
                                ...prev,
                                [award.type]: {
                                  ...prev[award.type],
                                  playerId: player.id,
                                  search: player.name,
                                },
                              }));
                            }}
                          >
                            <span className="font-medium">{player.name}</span>
                            <span className="text-muted-foreground">
                              ({player.teamId})
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the goal..."
                  value={selections[award.type]?.description ?? ""}
                  onChange={(e) => {
                    setSelections((prev) => ({
                      ...prev,
                      [award.type]: {
                        ...prev[award.type],
                        description: e.target.value,
                      },
                    }));
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Award Predictions"}
      </Button>
    </div>
  );
}
