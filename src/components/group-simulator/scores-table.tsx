"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  MatchScore,
  ComputedStanding,
  TeamPlacement,
  GroupLetter,
} from "@/lib/stores/group-simulator-store";

interface ScoresTableProps {
  group: GroupLetter;
  scores: MatchScore[];
  standings: ComputedStanding[];
  placements: TeamPlacement[];
  onScoreChange: (
    matchId: string,
    homeScore: number,
    awayScore: number
  ) => void;
}

export function ScoresTable({
  group,
  scores,
  standings,
  placements,
  onScoreChange,
}: ScoresTableProps) {
  const teamNames = new Map(placements.map((t) => [t.teamId, t.teamName]));

  return (
    <div className="space-y-4">
      {/* Match score inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Group {group} Matches</CardTitle>
        </CardHeader>
        <CardContent>
          {scores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matches available for this group yet.
            </p>
          ) : (
            <div className="space-y-2">
              {scores.map((match) => (
                <div
                  key={match.matchId}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <span className="flex-1 text-right text-sm font-medium">
                    {teamNames.get(match.homeTeamId) ?? match.homeTeamId}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    className="w-16 text-center"
                    value={match.homeScore ?? ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && match.awayScore !== null) {
                        onScoreChange(match.matchId, val, match.awayScore);
                      } else if (!isNaN(val)) {
                        onScoreChange(match.matchId, val, 0);
                      }
                    }}
                    placeholder="-"
                  />
                  <span className="text-muted-foreground">x</span>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    className="w-16 text-center"
                    value={match.awayScore ?? ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && match.homeScore !== null) {
                        onScoreChange(match.matchId, match.homeScore, val);
                      } else if (!isNaN(val)) {
                        onScoreChange(match.matchId, 0, val);
                      }
                    }}
                    placeholder="-"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {teamNames.get(match.awayTeamId) ?? match.awayTeamId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Computed standings */}
      {standings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Computed Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead className="text-center">GD</TableHead>
                  <TableHead className="text-center">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row, i) => (
                  <TableRow key={row.teamId}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>{row.teamName}</TableCell>
                    <TableCell className="text-center">{row.played}</TableCell>
                    <TableCell className="text-center">{row.won}</TableCell>
                    <TableCell className="text-center">{row.drawn}</TableCell>
                    <TableCell className="text-center">{row.lost}</TableCell>
                    <TableCell className="text-center">{row.gd}</TableCell>
                    <TableCell className="text-center font-bold">
                      {row.points}
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
