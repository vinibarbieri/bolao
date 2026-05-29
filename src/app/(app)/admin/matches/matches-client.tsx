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

export function MatchAdminClient({
  matches,
  players,
  teams,
}: {
  matches: Match[];
  players: Player[];
  teams: Team[];
}) {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));

  const handleSubmitResult = async (matchId: string) => {
    try {
      const res = await fetch("/api/admin/match-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore),
        }),
      });

      if (!res.ok) throw new Error("Failed to update match");
      toast.success("Match result saved!");
      setEditingMatch(null);
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save"
      );
    }
  };

  const groupMatches = matches.filter((m) => m.stage === "group");
  const knockoutMatches = matches.filter((m) => m.stage !== "group");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Group Stage Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Home</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Away</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupMatches.map((match) => (
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
                    {editingMatch === match.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          className="w-14 text-center"
                          value={homeScore}
                          onChange={(e) => setHomeScore(e.target.value)}
                          min={0}
                        />
                        <span>-</span>
                        <Input
                          type="number"
                          className="w-14 text-center"
                          value={awayScore}
                          onChange={(e) => setAwayScore(e.target.value)}
                          min={0}
                        />
                      </div>
                    ) : match.homeScore !== null ? (
                      `${match.homeScore} - ${match.awayScore}`
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <TeamCell
                      teamId={match.awayTeamId}
                      name={teamNameMap.get(match.awayTeamId ?? "")}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={match.status} />
                  </TableCell>
                  <TableCell>
                    {editingMatch === match.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => handleSubmitResult(match.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Cancel"
                          onClick={() => setEditingMatch(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          setEditingMatch(match.id);
                          setHomeScore(match.homeScore?.toString() ?? "");
                          setAwayScore(match.awayScore?.toString() ?? "");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {knockoutMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Knockout Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Away</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {knockoutMatches.map((match) => (
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
                        ? `${match.homeScore} - ${match.awayScore}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <TeamCell
                        teamId={match.awayTeamId}
                        name={teamNameMap.get(match.awayTeamId ?? "")}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={match.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          setEditingMatch(match.id);
                          setHomeScore(match.homeScore?.toString() ?? "");
                          setAwayScore(match.awayScore?.toString() ?? "");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
