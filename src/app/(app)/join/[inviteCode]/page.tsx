import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/db";
import { leagues } from "@/db/schema/leagues";
import { eq } from "drizzle-orm";
import { joinLeagueByCode } from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<Metadata> {
  const { inviteCode } = await params;

  const [league] = await db
    .select({ name: leagues.name })
    .from(leagues)
    .where(eq(leagues.inviteCode, inviteCode))
    .limit(1);

  if (!league) {
    return {};
  }

  const title = `Join "${league.name}" on Bolão 2026`;
  const description = `You've been invited to join the "${league.name}" league. Make your World Cup 2026 predictions!`;

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

  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`);
  }

  let leagueId: string;
  try {
    const league = await joinLeagueByCode(inviteCode);
    leagueId = league.id;
  } catch {
    redirect("/leagues?error=invalid-invite");
  }

  redirect(`/leagues/${leagueId}`);
}
