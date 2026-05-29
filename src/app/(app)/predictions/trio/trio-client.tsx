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
import { TeamFlag } from "@/components/team-badge";
import { cn } from "@/lib/utils";
import { Star, X, Plus, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
  slotPoints = {},
}: {
  existingTrio: TrioPick[];
  players: Player[];
  slotPoints?: Record<number, number>;
}) {
  const t = useTranslations("GoldenTrio");

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
      toast.error(t("selectExact3"));
      return;
    }

    setSaving(true);
    try {
      await saveGoldenTrio(validPicks);
      toast.success(t("saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedSave")
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
              className={cn(
                "transition-colors",
                player
                  ? "border-gold/50 ring-1 ring-gold/30"
                  : "border-dashed",
              )}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      player ? "fill-gold text-gold" : "text-muted-foreground",
                    )}
                  />
                  {t("pick", { slot: slot + 1 })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {player ? (
                  <div className="flex items-center gap-3">
                    <TeamFlag teamId={player.teamId} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {player.teamId} · {player.position}
                      </p>
                    </div>
                    {(slotPoints[slot + 1] ?? 0) > 0 && (
                      <span className="rounded-full bg-qualified/15 px-2 py-0.5 font-mono text-xs font-bold text-qualified-foreground">
                        +{slotPoints[slot + 1]} pts
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("removePlayer")}
                      onClick={() => handleRemove(slot)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                    onClick={() => {
                      setSearchSlot(slot);
                      setSearch("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {t("selectPlayer")}
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
              {t("selectPlayerFor", { slot: searchSlot + 1 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("searchPlayers")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto rounded-lg border">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => handleSelectPlayer(searchSlot, player.id)}
                >
                  <TeamFlag teamId={player.teamId} size="sm" />
                  <span className="font-medium">{player.name}</span>
                  <Badge variant="outline" className="font-mono">
                    {player.teamId}
                  </Badge>
                  <span className="text-muted-foreground">
                    {player.position}
                  </span>
                </button>
              ))}
              {filteredPlayers.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  {t("noPlayersFound")}
                </p>
              )}
            </div>
            <Button variant="ghost" onClick={() => setSearchSlot(null)}>
              {t("cancel")}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
        <Button
          onClick={handleSave}
          disabled={saving || picks.filter(Boolean).length !== 3}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? t("saving") : t("saveGoldenTrio")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {t("selected", { count: picks.filter(Boolean).length })}
        </span>
      </div>
    </div>
  );
}
