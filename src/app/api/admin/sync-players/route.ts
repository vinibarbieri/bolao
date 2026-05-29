import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { syncWorldCupPlayers } from "@/lib/players/sync";

export async function POST() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncWorldCupPlayers();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Player sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Player sync failed",
      },
      { status: 500 }
    );
  }
}
