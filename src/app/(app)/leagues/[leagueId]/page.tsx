import { requireUser } from "@/lib/supabase/auth";
import { getLeaderboard, getLeagueMembers } from "../../queries";
import { db } from "@/db";
import { leagues } from "@/db/schema/leagues";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Crown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { CopyInviteLink } from "../copy-invite-link";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const user = await requireUser();
  const t = await getTranslations("LeagueDetail");

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (league.length === 0) notFound();

  const [leaderboard, members] = await Promise.all([
    getLeaderboard(leagueId),
    getLeagueMembers(leagueId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-brand-foreground shadow-sm">
          <Trophy className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide sm:text-4xl">
            {league[0].name}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">{t("inviteCode")}</span>
            <Badge variant="outline" className="font-mono text-sm">
              {league[0].inviteCode}
            </Badge>
          </div>
        </div>
        <CopyInviteLink inviteCode={league[0].inviteCode} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            {t("leaderboard")}
          </CardTitle>
          <CardDescription>{t("members", { count: members.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noScores")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{t("rank")}</TableHead>
                  <TableHead>{t("player")}</TableHead>
                  <TableHead className="text-center">{t("groups")}</TableHead>
                  <TableHead className="text-center">{t("knockout")}</TableHead>
                  <TableHead className="text-center">{t("awards")}</TableHead>
                  <TableHead className="text-center">{t("trio")}</TableHead>
                  <TableHead className="text-center font-bold">
                    {t("total")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow key={entry.userId}>
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
                        {entry.rank}
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
                        <span className="font-medium">
                          {entry.displayName}
                        </span>
                        {entry.championCorrect && (
                          <Crown className="h-4 w-4 text-gold" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{entry.groupPoints}</TableCell>
                    <TableCell className="text-center">{entry.knockoutPoints}</TableCell>
                    <TableCell className="text-center">{entry.awardPoints}</TableCell>
                    <TableCell className="text-center">{entry.trioPoints}</TableCell>
                    <TableCell className="text-center text-lg font-bold">
                      {entry.totalPoints}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("membersTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <Link
                key={member.userId}
                href={`/compare/${member.userId}`}
                className="group flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {member.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 font-medium">
                  {member.displayName}
                </span>
                <Badge variant="outline">{member.status}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
