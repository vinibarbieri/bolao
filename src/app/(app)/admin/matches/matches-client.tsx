"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamFlag } from "@/components/team-badge";
import { cn } from "@/lib/utils";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const STATUS_STYLES: Record<string, string> = {
  finished: "bg-qualified/15 text-qualified-foreground",
  live: "bg-eliminated/15 text-eliminated-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn(STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {status === "live" && (
        <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </Badge>
  );
}

function TeamCell({
  teamId,
  name,
  align = "left",
}: {
  teamId: string | null;
  name: string | null | undefined;
  align?: "left" | "right";
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <TeamFlag teamId={teamId} size="sm" />
      <span className="truncate">{name ?? teamId ?? "TBD"}</span>
    </span>
  );
}

interface Match {
  id: string;
  stage: string;
  groupLetter: string | null;
  matchNumber: number | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  motmPlayerId: string | null;
  status: string;
  kickoffAt: Date;
}

interface Player {
  id: string;
  name: string;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
}

interface EditState {
  matchId: string;
  homeScore: string;
  awayScore: string;
  motmPlayerId: string;
}

export function MatchAdminClient({
  matches,
  players,
  teams,
}: {
  matches: Match[];
  players: Player[];
  teams: Team[];
}) {
  const t = useTranslations("AdminMatches");
  const [editing, setEditing] = useState<EditState | null>(null);

  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const playerNameMap = new Map(players.map((p) => [p.id, p.name]));

  const startEdit = (match: Match) => {
    setEditing({
      matchId: match.id,
      homeScore: match.homeScore?.toString() ?? "",
      awayScore: match.awayScore?.toString() ?? "",
      motmPlayerId: match.motmPlayerId ?? "",
    });
  };

  const handleSubmit = async (match: Match) => {
    if (!editing) return;
    const home = parseInt(editing.homeScore);
    const away = parseInt(editing.awayScore);
    if (isNaN(home) || isNaN(away)) {
      toast.error(t("invalidScores"));
      return;
    }
    try {
      const res = await fetch("/api/admin/match-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: home,
          awayScore: away,
          motmPlayerId: editing.motmPlayerId || null,
        }),
      });
      if (!res.ok) throw new Error(t("failedUpdate"));
      toast.success(t("matchSaved"));
      setEditing(null);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failedSave"));
    }
  };

  const groupMatches = matches.filter((m) => m.stage === "group");
  const knockoutMatches = matches.filter((m) => m.stage !== "group");

  const renderEditRow = (match: Match) => {
    const isEditing = editing?.matchId === match.id;
    const matchPlayers = players.filter(
      (p) => p.teamId === match.homeTeamId || p.teamId === match.awayTeamId,
    );

    return isEditing ? (
      <TableRow key={match.id} className="bg-muted/30">
        <TableCell colSpan={7}>
          <div className="flex flex-wrap items-end gap-4 py-1">
            <div className="flex items-center gap-2">
              <TeamCell
                teamId={match.homeTeamId}
                name={teamNameMap.get(match.homeTeamId ?? "")}
              />
              <Input
                type="number"
                className="w-14 text-center"
                value={editing.homeScore}
                onChange={(e) =>
                  setEditing((s) => s && { ...s, homeScore: e.target.value })
                }
                min={0}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                className="w-14 text-center"
                value={editing.awayScore}
                onChange={(e) =>
                  setEditing((s) => s && { ...s, awayScore: e.target.value })
                }
                min={0}
              />
              <TeamCell
                teamId={match.awayTeamId}
                name={teamNameMap.get(match.awayTeamId ?? "")}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs">{t("motm")}</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={editing.motmPlayerId || ""}
                onChange={(e) =>
                  setEditing((s) => s && { ...s, motmPlayerId: e.target.value })
                }
              >
                <option value="">{t("none")}</option>
                {matchPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-1">
              <Button size="sm" className="gap-1" onClick={() => handleSubmit(match)}>
                <Check className="h-3.5 w-3.5" />
                {t("save")}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Cancel"
                onClick={() => setEditing(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>
    ) : null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("groupStageMatches")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("number")}</TableHead>
                <TableHead>{t("group")}</TableHead>
                <TableHead>{t("home")}</TableHead>
                <TableHead className="text-center">{t("score")}</TableHead>
                <TableHead>{t("away")}</TableHead>
                <TableHead>{t("motm")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupMatches.map((match) => (
                <>
                  <TableRow key={match.id}>
                    <TableCell>{match.matchNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{match.groupLetter}</Badge>
                    </TableCell>
                    <TableCell>
                      <TeamCell
                        teamId={match.homeTeamId}
                        name={teamNameMap.get(match.homeTeamId ?? "")}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {match.homeScore !== null
                        ? `${match.homeScore} – ${match.awayScore}`
                        : "–"}
                    </TableCell>
                    <TableCell>
                      <TeamCell
                        teamId={match.awayTeamId}
                        name={teamNameMap.get(match.awayTeamId ?? "")}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {match.motmPlayerId
                        ? playerNameMap.get(match.motmPlayerId) ?? "—"
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={match.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => startEdit(match)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {renderEditRow(match)}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {knockoutMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("knockoutMatches")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("number")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("home")}</TableHead>
                  <TableHead className="text-center">{t("score")}</TableHead>
                  <TableHead>{t("away")}</TableHead>
                  <TableHead>{t("motm")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {knockoutMatches.map((match) => (
                  <>
                    <TableRow key={match.id}>
                      <TableCell>{match.matchNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {match.stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TeamCell
                          teamId={match.homeTeamId}
                          name={teamNameMap.get(match.homeTeamId ?? "")}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {match.homeScore !== null
                          ? `${match.homeScore} – ${match.awayScore}`
                          : "–"}
                      </TableCell>
                      <TableCell>
                        <TeamCell
                          teamId={match.awayTeamId}
                          name={teamNameMap.get(match.awayTeamId ?? "")}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {match.motmPlayerId
                          ? playerNameMap.get(match.motmPlayerId) ?? "—"
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={match.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => startEdit(match)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("edit")}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {renderEditRow(match)}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
