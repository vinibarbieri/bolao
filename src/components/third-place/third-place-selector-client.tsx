"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { saveThirdPlaceSelections } from "@/app/(app)/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ThirdPlaceTeam {
  teamId: string;
  teamName: string;
  groupLetter: string;
  isSelected: boolean;
}

interface Props {
  teams: ThirdPlaceTeam[];
}

export function ThirdPlaceSelectorClient({ teams }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(teams.filter((t) => t.isSelected).map((t) => t.teamId))
  );
  const [saving, setSaving] = useState(false);

  const toggleTeam = useCallback((teamId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else if (next.size < 8) {
        next.add(teamId);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (selected.size !== 8) return;
    setSaving(true);
    try {
      await saveThirdPlaceSelections(Array.from(selected));
      toast.success("3rd place selections saved!");
      router.push("/bracket");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Badge variant={selected.size === 8 ? "default" : "secondary"}>
          {selected.size}/8 selected
        </Badge>
        <Button
          onClick={handleSave}
          disabled={selected.size !== 8 || saving}
        >
          {saving ? "Saving..." : "Save & Build Bracket"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams
          .sort((a, b) => a.groupLetter.localeCompare(b.groupLetter))
          .map((team) => {
            const isChecked = selected.has(team.teamId);
            const isDisabled = !isChecked && selected.size >= 8;

            return (
              <Card
                key={team.teamId}
                className={`cursor-pointer transition-colors ${
                  isChecked
                    ? "border-primary bg-primary/5"
                    : isDisabled
                      ? "opacity-50"
                      : "hover:border-primary/50"
                }`}
                onClick={() => !isDisabled && toggleTeam(team.teamId)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Checkbox
                    checked={isChecked}
                    disabled={isDisabled}
                    onCheckedChange={() => toggleTeam(team.teamId)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{team.teamName}</p>
                    <p className="text-sm text-muted-foreground">
                      3rd in Group {team.groupLetter}
                    </p>
                  </div>
                  <Badge variant="outline">{team.teamId}</Badge>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
