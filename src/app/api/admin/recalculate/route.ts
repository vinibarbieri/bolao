import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { recalculateAllScores } from "@/lib/scoring/recalculate";

export async function POST() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await recalculateAllScores();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Recalculation error:", error);
    return NextResponse.json(
      { error: "Recalculation failed" },
      { status: 500 }
    );
  }
}
