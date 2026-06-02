"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trophy, Crown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { fetchLeagueLeaderboard } from "../actions";
import { ClickableRow } from "../clickable-row";

type LeaderboardEntry = Awaited<ReturnType<typeof fetchLeagueLeaderboard>>[number];
type LeagueOption = { id: string; name: string };

export function LeagueLeaderboard({
  leagues,
  initialLeagueId,
  initialLeaderboard,
}: {
  leagues: LeagueOption[];
  initialLeagueId: string;
  initialLeaderboard: LeaderboardEntry[];
}) {
  const t = useTranslations("Dashboard");
  const [leagueId, setLeagueId] = useState(initialLeagueId);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === leagueId) return;
    setLeagueId(value);
    startTransition(async () => {
      setLeaderboard(await fetchLeagueLeaderboard(value));
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold" />
              {t("leaderboardTitle")}
            </CardTitle>
            <CardDescription>{t("leaderboardSubtitle")}</CardDescription>
          </div>
          {leagues.length > 1 && (
            <Select value={leagueId} onValueChange={handleChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue>
                  {leagues.find((l) => l.id === leagueId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {leagues.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noScores")}</p>
        ) : (
          <Table className={cn(isPending && "opacity-50 transition-opacity")}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{t("rank")}</TableHead>
                <TableHead>{t("player")}</TableHead>
                <TableHead className="text-center font-bold">
                  {t("points")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, index) => (
                <ClickableRow
                  key={entry.userId}
                  href={`/compare/${entry.userId}`}
                >
                  <TableCell>
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                        entry.rank === 1
                          ? "bg-gold/25 text-gold-foreground"
                          : entry.rank === 2
                            ? "bg-muted-foreground/15 text-foreground"
                            : entry.rank === 3
                              ? "bg-third/20 text-third-foreground"
                              : "text-muted-foreground",
                      )}
                    >
                      {entry.rank ?? index + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={entry.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {entry.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{entry.displayName}</span>
                      {entry.championCorrect && (
                        <Crown className="h-4 w-4 text-gold" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-lg font-bold">
                    {entry.totalPoints}
                  </TableCell>
                </ClickableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
