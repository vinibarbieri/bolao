import { NextResponse } from "next/server";
import { getUser, isAdmin } from "@/lib/supabase/auth";
import { recalculateAllScores } from "@/lib/scoring/recalculate";

export async function POST() {
  const user = await getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
