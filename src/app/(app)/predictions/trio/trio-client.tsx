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
import { Badge } from "@/components/ui/badge";
import { saveGoldenTrio } from "@/app/(app)/actions";
import { toast } from "sonner";

interface Player {
  id: string;
  name: string;
  teamId: string;
  position: string;
}

interface TrioPick {
  playerId: string;
  slot: number;
}

export function GoldenTrioClient({
  existingTrio,
  players,
}: {
  existingTrio: TrioPick[];
  players: Player[];
}) {
  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );

  const [picks, setPicks] = useState<(string | null)[]>(() => {
    const slots = [null, null, null] as (string | null)[];
    for (const t of existingTrio) {
      if (t.slot >= 1 && t.slot <= 3) {
        slots[t.slot - 1] = t.playerId;
      }
    }
    return slots;
  });

  const [searchSlot, setSearchSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedIds = new Set(picks.filter(Boolean) as string[]);

  const handleSelectPlayer = (slot: number, playerId: string) => {
    setPicks((prev) => {
      const next = [...prev];
      next[slot] = playerId;
      return next;
    });
    setSearchSlot(null);
    setSearch("");
  };

  const handleRemove = (slot: number) => {
    setPicks((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
  };

  const handleSave = async () => {
    const validPicks = picks
      .map((id, i) => (id ? { playerId: id, slot: i + 1 } : null))
      .filter(Boolean) as TrioPick[];

    if (validPicks.length !== 3) {
      toast.error("Select exactly 3 players");
      return;
    }

    setSaving(true);
    try {
      await saveGoldenTrio(validPicks);
      toast.success("Golden Trio saved!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = players
    .filter(
      (p) =>
        !selectedIds.has(p.id) &&
        p.name.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((slot) => {
          const playerId = picks[slot];
          const player = playerId ? playerMap.get(playerId) : null;

          return (
            <Card
              key={slot}
              className={
                player ? "border-primary" : "border-dashed"
              }
            >
              <CardHeader className="pb-2">
                <CardDescription>Pick #{slot + 1}</CardDescription>
              </CardHeader>
              <CardContent>
                {player ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.teamId} - {player.position}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(slot)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSearchSlot(slot);
                      setSearch("");
                    }}
                  >
                    Select Player
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {searchSlot !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Select player for Pick #{searchSlot + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto rounded-md border">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => handleSelectPlayer(searchSlot, player.id)}
                >
                  <span className="font-medium">{player.name}</span>
                  <Badge variant="outline">{player.teamId}</Badge>
                  <span className="text-muted-foreground">
                    {player.position}
                  </span>
                </button>
              ))}
              {filteredPlayers.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  No players found
                </p>
              )}
            </div>
            <Button variant="ghost" onClick={() => setSearchSlot(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || picks.filter(Boolean).length !== 3}
      >
        {saving ? "Saving..." : "Save Golden Trio"}
      </Button>
    </div>
  );
}
