import { requireUser } from "@/lib/supabase/auth";
import { ensureProfile } from "../actions";
import { getUserLeagues, getTournamentConfig, getUserGroupPredictions, getUserBracketPicks } from "../queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireUser();
  await ensureProfile();

  const [config, leagues, groupPreds, bracketPicks] = await Promise.all([
    getTournamentConfig(),
    getUserLeagues(user.id),
    getUserGroupPredictions(user.id),
    getUserBracketPicks(user.id),
  ]);

  const isLocked = config?.isLocked ?? false;
  const groupsCompleted = new Set(groupPreds.map((p) => p.groupLetter)).size;
  const hasBracket = bracketPicks.length > 0;
  const thirdPlaceSelected = groupPreds.filter((p) => p.advancesAsThird).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Bolao 2026 - World Cup Predictions
        </p>
      </div>

      {isLocked && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Predictions are locked. The tournament has started!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Groups Completed</CardDescription>
            <CardTitle className="text-2xl">{groupsCompleted}/12</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/groups">
              <Button variant="outline" size="sm">
                {groupsCompleted === 12 ? "Review" : "Continue"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>3rd Place Selection</CardDescription>
            <CardTitle className="text-2xl">{thirdPlaceSelected}/8</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/third-place">
              <Button variant="outline" size="sm">
                {thirdPlaceSelected === 8 ? "Review" : "Select"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bracket</CardDescription>
            <CardTitle className="text-2xl">
              {hasBracket ? (
                <Badge variant="default">Complete</Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/bracket">
              <Button variant="outline" size="sm">
                {hasBracket ? "Review" : "Build"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leagues</CardDescription>
            <CardTitle className="text-2xl">{leagues.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/leagues">
              <Button variant="outline" size="sm">Manage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {!isLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Prediction Checklist</CardTitle>
            <CardDescription>
              Complete all steps before the tournament starts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <ChecklistItem
                done={groupsCompleted === 12}
                label="Predict all 12 group standings"
                href="/groups"
              />
              <ChecklistItem
                done={thirdPlaceSelected === 8}
                label="Select 8 best 3rd-place teams"
                href="/third-place"
              />
              <ChecklistItem
                done={hasBracket}
                label="Build your knockout bracket"
                href="/bracket"
              />
              <ChecklistItem
                done={false}
                label="Pick award winners"
                href="/predictions/awards"
              />
              <ChecklistItem
                done={false}
                label="Select your Golden Trio"
                href="/predictions/trio"
              />
              <ChecklistItem
                done={leagues.length > 0}
                label="Join or create a league"
                href="/leagues"
              />
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  href,
}: {
  done: boolean;
  label: string;
  href: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
          done
            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? "✓" : "○"}
      </span>
      <Link
        href={href}
        className="text-sm hover:underline"
      >
        {label}
      </Link>
    </li>
  );
}
