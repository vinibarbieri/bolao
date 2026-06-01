import { requireUser } from "@/lib/supabase/auth";
import { ensureProfile } from "../actions";
import { getUserLeagues, getTournamentConfig, getUserGroupPredictions, getUserBracketPicks, getUserAwardPredictions, getUserGoldenTrio, getLeaderboard } from "../queries";
import { LeagueLeaderboard } from "./league-leaderboard";
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
  Award,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const user = await requireUser();
  await ensureProfile();
  const t = await getTranslations("Dashboard");

  const [config, leagues, groupPreds, bracketPicks, awardPreds, trioPreds] = await Promise.all([
    getTournamentConfig(),
    getUserLeagues(user.id),
    getUserGroupPredictions(user.id),
    getUserBracketPicks(user.id),
    getUserAwardPredictions(user.id),
    getUserGoldenTrio(user.id),
  ]);

  const initialLeagueId = leagues[0]?.id ?? null;
  const initialLeaderboard = initialLeagueId
    ? await getLeaderboard(initialLeagueId)
    : [];

  const isLocked = config?.isLocked ?? false;
  const groupsCompleted = new Set(groupPreds.map((p) => p.groupLetter)).size;
  const hasBracket = bracketPicks.length > 0;
  const thirdPlaceSelected = groupPreds.filter((p) => p.advancesAsThird).length;
  const hasAwards = awardPreds.length === 4;
  const hasTrio = trioPreds.length === 3;

  const steps = [
    groupsCompleted === 12,
    thirdPlaceSelected === 8,
    hasBracket,
    hasAwards,
    hasTrio,
    leagues.length > 0,
  ];
  const completedSteps = steps.filter(Boolean).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const firstName = user.user_metadata?.full_name?.split(" ")[0] ?? "player";

  return (
    <div className="space-y-6">
      <div className="bg-brand-gradient relative overflow-hidden rounded-2xl p-6 text-brand-foreground shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium text-brand-foreground/75">
            {t("welcomeBack", { name: firstName })}
          </p>
          <h1 className="mt-1 font-heading text-4xl font-bold uppercase tracking-wide">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-prose text-sm text-brand-foreground/80">
            {t("subtitle")}
          </p>
          {!isLocked && (
            <div className="mt-4 max-w-sm">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-brand-foreground/90">
                <span>{t("predictionsProgress")}</span>
                <span>{t("done", { completed: completedSteps, total: steps.length })}</span>
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
              {t("locked")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Volleyball}
          label={t("groupsCompleted")}
          value={`${groupsCompleted}/12`}
          href="/groups"
          cta={groupsCompleted === 12 ? t("review") : t("continue")}
          tint="text-chart-3"
        />
        <StatCard
          icon={Medal}
          label={t("thirdPlaceSelection")}
          value={`${thirdPlaceSelected}/8`}
          href="/third-place"
          cta={thirdPlaceSelected === 8 ? t("review") : t("select")}
          tint="text-third"
        />
        <StatCard
          icon={Trophy}
          label={t("bracket")}
          value={
            hasBracket ? (
              <Badge className="bg-qualified/15 text-qualified-foreground">
                {t("complete")}
              </Badge>
            ) : (
              <Badge variant="secondary">{t("pending")}</Badge>
            )
          }
          href="/bracket"
          cta={hasBracket ? t("review") : t("build")}
          tint="text-chart-1"
        />
        <StatCard
          icon={Award}
          label={t("awards")}
          value={
            hasAwards ? (
              <Badge className="bg-qualified/15 text-qualified-foreground">
                {t("complete")}
              </Badge>
            ) : (
              <Badge variant="secondary">{t("pending")}</Badge>
            )
          }
          href="/predictions/awards"
          cta={hasAwards ? t("review") : t("pick")}
          tint="text-gold"
        />
        <StatCard
          icon={Sparkles}
          label={t("goldenTrio")}
          value={
            hasTrio ? (
              <Badge className="bg-qualified/15 text-qualified-foreground">
                {t("complete")}
              </Badge>
            ) : (
              <Badge variant="secondary">{t("pending")}</Badge>
            )
          }
          href="/predictions/trio"
          cta={hasTrio ? t("review") : t("pick")}
          tint="text-chart-4"
        />
        <StatCard
          icon={Users}
          label={t("leagues")}
          value={leagues.length}
          href="/leagues"
          cta={t("manage")}
          tint="text-chart-5"
        />
      </div>

      {initialLeagueId && (
        <LeagueLeaderboard
          leagues={leagues.map((l) => ({ id: l.id, name: l.name }))}
          initialLeagueId={initialLeagueId}
          initialLeaderboard={initialLeaderboard}
        />
      )}

      {!isLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              {t("predictionChecklist")}
            </CardTitle>
            <CardDescription>
              {t("checklistSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <ChecklistItem done={groupsCompleted === 12} label={t("predictGroups")} href="/groups" />
              <ChecklistItem done={thirdPlaceSelected === 8} label={t("selectThirdPlace")} href="/third-place" />
              <ChecklistItem done={hasBracket} label={t("buildBracket")} href="/bracket" />
              <ChecklistItem done={hasAwards} label={t("pickAwards")} href="/predictions/awards" />
              <ChecklistItem done={hasTrio} label={t("selectGoldenTrio")} href="/predictions/trio" />
              <ChecklistItem done={leagues.length > 0} label={t("joinOrCreateLeague")} href="/leagues" />
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
