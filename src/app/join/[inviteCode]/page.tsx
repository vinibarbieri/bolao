import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/db";
import { leagues } from "@/db/schema/leagues";
import { eq } from "drizzle-orm";
import { joinLeagueByCode } from "../../(app)/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LocaleToggle } from "@/components/locale-toggle";
import { Trophy } from "lucide-react";

async function getLeagueByCode(inviteCode: string) {
  const [league] = await db
    .select({ name: leagues.name })
    .from(leagues)
    .where(eq(leagues.inviteCode, inviteCode))
    .limit(1);
  return league ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<Metadata> {
  const { inviteCode } = await params;
  const league = await getLeagueByCode(inviteCode);
  const t = await getTranslations("Invite");

  const title = league
    ? t("metaTitle", { name: league.name })
    : t("metaUnknownTitle");
  const description = league
    ? t("metaDesc", { name: league.name })
    : t("metaUnknownDesc");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "/og.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function JoinLeaguePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const t = await getTranslations("Invite");

  const league = await getLeagueByCode(inviteCode);

  // Authenticated users auto-join and go straight to the league. Crawlers and
  // logged-out visitors fall through to the public landing below, which carries
  // the league-specific Open Graph metadata for rich link previews.
  const user = await getUser();
  if (user && league) {
    let leagueId: string;
    try {
      const joined = await joinLeagueByCode(inviteCode);
      leagueId = joined.id;
    } catch (e) {
      console.error("joinLeagueByCode failed", e);
      redirect("/leagues?error=invalid-invite");
    }
    redirect(`/leagues/${leagueId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="absolute top-4 right-4">
        <LocaleToggle />
      </div>
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="size-6" />
          </div>
          {league ? (
            <>
              <CardTitle className="mt-2">{t("heading")}</CardTitle>
              <CardDescription>
                {t("subheading", { name: league.name })}
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="mt-2">{t("invalidTitle")}</CardTitle>
              <CardDescription>{t("invalidDesc")}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {league ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`}
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              {t("signInToJoin")}
            </Link>
          ) : (
            <Link
              href="/"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "w-full",
              })}
            >
              {t("backToApp")}
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
