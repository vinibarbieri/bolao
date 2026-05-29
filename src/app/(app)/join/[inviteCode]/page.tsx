import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { joinLeagueByCode } from "../../actions";

export default async function JoinLeaguePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;

  // Defensive fallback — middleware already redirects unauthenticated users
  // to /login?next=/join/[code], but if that is bypassed, handle it here too.
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
