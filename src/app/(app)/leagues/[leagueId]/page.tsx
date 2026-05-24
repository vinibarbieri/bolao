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

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const user = await requireUser();

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
      <div>
        <h1 className="text-3xl font-bold">{league[0].name}</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Invite code:</span>
          <Badge variant="outline" className="font-mono text-base">
            {league[0].inviteCode}
          </Badge>
        </div>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>{members.length} members</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scores yet. Scores will appear after the tournament starts.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Groups</TableHead>
                  <TableHead className="text-center">Knockout</TableHead>
                  <TableHead className="text-center">Awards</TableHead>
                  <TableHead className="text-center">Trio</TableHead>
                  <TableHead className="text-center font-bold">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow key={entry.userId}>
                    <TableCell>
                      <Badge
                        variant={
                          entry.rank === 1
                            ? "default"
                            : "outline"
                        }
                      >
                        {entry.rank}
                      </Badge>
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
                        {entry.championCorrect && <span>🏆</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.groupPoints}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.knockoutPoints}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.awardPoints}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.trioPoints}
                    </TableCell>
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

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
