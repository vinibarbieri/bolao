import { requireUser } from "@/lib/supabase/auth";
import {
  getUserGroupPredictions,
  getUserBracketPicks,
  getUserScoreBreakdown,
} from "../../queries";
import { db } from "@/db";
import { profiles } from "@/db/schema/profiles";
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

export default async function ComparePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: compareUserId } = await params;
  const currentUser = await requireUser();

  const profile = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, compareUserId))
    .limit(1);

  if (profile.length === 0) notFound();

  const [predictions, bracketPicks, scoreBreakdown] = await Promise.all([
    getUserGroupPredictions(compareUserId),
    getUserBracketPicks(compareUserId),
    getUserScoreBreakdown(compareUserId),
  ]);

  const groupPredsByGroup: Record<
    string,
    { teamId: string; position: number }[]
  > = {};
  for (const pred of predictions) {
    if (!groupPredsByGroup[pred.groupLetter]) {
      groupPredsByGroup[pred.groupLetter] = [];
    }
    groupPredsByGroup[pred.groupLetter].push({
      teamId: pred.teamId,
      position: pred.predictedPosition,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile[0].avatarUrl ?? undefined} />
          <AvatarFallback>
            {profile[0].displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">
            {profile[0].displayName}&apos;s Predictions
          </h1>
          <p className="text-muted-foreground">
            Viewing predictions and scores
          </p>
        </div>
      </div>

      {/* Score breakdown */}
      {scoreBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scoreBreakdown.map((score) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <span className="font-medium">{score.description}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({score.subDetail})
                    </span>
                  </div>
                  <Badge variant="default">+{score.points}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Group Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groupPredsByGroup)
              .sort()
              .map(([group, preds]) => (
                <div key={group} className="rounded-md border p-3">
                  <h4 className="mb-2 font-semibold">Group {group}</h4>
                  {preds
                    .sort((a, b) => a.position - b.position)
                    .map((pred) => (
                      <div
                        key={pred.teamId}
                        className="flex items-center gap-2 py-1"
                      >
                        <Badge variant="outline" className="w-6 justify-center">
                          {pred.position}
                        </Badge>
                        <span className="text-sm">{pred.teamId}</span>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
