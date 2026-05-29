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
import { saveAwardPredictions } from "@/app/(app)/actions";
import { TeamFlag } from "@/components/team-badge";
import { cn } from "@/lib/utils";
import {
  Goal,
  Shield,
  Handshake,
  Sparkles,
  Check,
  Save,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

const AWARD_TYPES: {
  type: "golden_boot" | "golden_glove" | "top_assist" | "goal_of_tournament";
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    type: "golden_boot",
    label: "Golden Boot",
    description: "Top scorer of the tournament",
    icon: Goal,
  },
  {
    type: "golden_glove",
    label: "Golden Glove",
    description: "Best goalkeeper of the tournament",
    icon: Shield,
  },
  {
    type: "top_assist",
    label: "Top Assists",
    description: "Most assists in the tournament",
    icon: Handshake,
  },
  {
    type: "goal_of_tournament",
    label: "Goal of the Tournament",
    description: "Scorer of the best goal of the tournament",
    icon: Sparkles,
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
  earnedPointsMap = {},
  awardPointsConfig = {},
}: {
  existingPredictions: Prediction[];
  players: Player[];
  earnedPointsMap?: Record<string, number>;
  awardPointsConfig?: Record<string, number>;
}) {
  const predMap = useMemo(() => {
    const map: Record<string, Prediction> = {};
    for (const p of existingPredictions) {
      map[p.awardType] = p;
    }
    return map;
  }, [existingPredictions]);

  const [selections, setSelections] = useState<
    Record<string, { playerId?: string; search?: string }>
  >(() => {
    const initial: Record<string, { playerId?: string; search?: string }> = {};
    for (const award of AWARD_TYPES) {
      const existing = predMap[award.type];
      initial[award.type] = {
        playerId: existing?.playerId ?? undefined,
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
      <div className="grid gap-4 sm:grid-cols-2">
        {AWARD_TYPES.map((award) => {
          const Icon = award.icon;
          const sel = selections[award.type];
          const chosen = sel?.playerId
            ? players.find((p) => p.id === sel.playerId)
            : null;
          const filled = !!chosen;

          return (
            <Card
              key={award.type}
              className={cn(
                "transition-colors",
                filled && "border-gold/50 ring-1 ring-gold/30",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      filled
                        ? "bg-gold/20 text-gold-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{award.label}</CardTitle>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                        +{awardPointsConfig[award.type] ?? 0}
                      </span>
                    </div>
                    <CardDescription>{award.description}</CardDescription>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {filled && <Check className="h-5 w-5 shrink-0 text-qualified" />}
                    {(earnedPointsMap[award.type] ?? 0) > 0 && (
                      <span className="rounded-full bg-qualified/15 px-2 py-0.5 font-mono text-xs font-bold text-qualified-foreground">
                        +{earnedPointsMap[award.type]}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Player</Label>
                  {chosen && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                      <TeamFlag teamId={chosen.teamId} size="md" />
                      <span className="font-medium">{chosen.name}</span>
                      <span className="text-muted-foreground">
                        {chosen.position}
                      </span>
                    </div>
                  )}
                  <Input
                    placeholder="Search for a player..."
                    value={sel?.search ?? ""}
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
                  {sel?.search && !sel?.playerId && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border">
                      {players
                        .filter((p) =>
                          p.name
                            .toLowerCase()
                            .includes((sel?.search ?? "").toLowerCase()),
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
                            <TeamFlag teamId={player.teamId} size="sm" />
                            <span className="font-medium">{player.name}</span>
                            <span className="text-muted-foreground">
                              {player.position}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="sticky bottom-4 flex items-center rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Award Predictions"}
        </Button>
      </div>
    </div>
  );
}
