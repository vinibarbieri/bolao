import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recalculateAllScores } from "@/lib/scoring/recalculate";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
