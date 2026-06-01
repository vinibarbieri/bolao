import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { syncWorldCupMatches } from "@/lib/matches/sync";

export async function POST() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncWorldCupMatches();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Match sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Match sync failed",
      },
      { status: 500 }
    );
  }
}
