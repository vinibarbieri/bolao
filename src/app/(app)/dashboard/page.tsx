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
import {
  Volleyball,
  Medal,
  Trophy,
  Users,
  Lock,
  Check,
  ArrowRight,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const steps = [
    groupsCompleted === 12,
    thirdPlaceSelected === 8,
    hasBracket,
    false, // awards
    false, // trio
    leagues.length > 0,
  ];
  const completedSteps = steps.filter(Boolean).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-brand-gradient relative overflow-hidden rounded-2xl p-6 text-brand-foreground shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium text-brand-foreground/75">
            Welcome back, {user.user_metadata?.full_name?.split(" ")[0] ?? "player"} 👋
          </p>
          <h1 className="mt-1 font-heading text-4xl font-bold uppercase tracking-wide">
            Bolão World Cup 2026
          </h1>
          <p className="mt-1 max-w-prose text-sm text-brand-foreground/80">
            Make your predictions, build your bracket and climb your leagues.
          </p>
          {!isLocked && (
            <div className="mt-4 max-w-sm">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-brand-foreground/90">
                <span>Predictions progress</span>
                <span>{completedSteps}/{steps.length} done</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-brand-foreground/20">
                <div
                  className="h-full rounded-full bg-brand-foreground transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <Trophy className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 text-brand-foreground/10" />
      </div>

      {isLocked && (
        <Card className="border-third/50 bg-third/10">
          <CardContent className="flex items-center gap-3 py-4">
            <Lock className="h-5 w-5 text-third-foreground" />
            <p className="font-medium text-third-foreground">
              Predictions are locked. The tournament has started!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Volleyball}
          label="Groups Completed"
          value={`${groupsCompleted}/12`}
          href="/groups"
          cta={groupsCompleted === 12 ? "Review" : "Continue"}
          tint="text-chart-3"
        />
        <StatCard
          icon={Medal}
          label="3rd Place Selection"
          value={`${thirdPlaceSelected}/8`}
          href="/third-place"
          cta={thirdPlaceSelected === 8 ? "Review" : "Select"}
          tint="text-third"
        />
        <StatCard
          icon={Trophy}
          label="Bracket"
          value={
            hasBracket ? (
              <Badge className="bg-qualified/15 text-qualified-foreground">
                Complete
              </Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )
          }
          href="/bracket"
          cta={hasBracket ? "Review" : "Build"}
          tint="text-chart-1"
        />
        <StatCard
          icon={Users}
          label="Leagues"
          value={leagues.length}
          href="/leagues"
          cta="Manage"
          tint="text-chart-5"
        />
      </div>

      {!isLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Prediction Checklist
            </CardTitle>
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

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  cta,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  href: string;
  cta: string;
  tint: string;
}) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className={cn("h-5 w-5", tint)} />
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <Link href={href}>
          <Button variant="outline" size="sm" className="gap-1">
            {cta}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
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
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/60"
      >
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-sm transition-colors",
            done
              ? "bg-qualified/15 text-qualified-foreground"
              : "border-2 border-dashed border-muted-foreground/30 text-muted-foreground",
          )}
        >
          {done && <Check className="h-3.5 w-3.5" />}
        </span>
        <span
          className={cn(
            "flex-1 text-sm",
            done && "text-muted-foreground line-through",
          )}
        >
          {label}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  );
}
