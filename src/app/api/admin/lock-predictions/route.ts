import { NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentConfig } from "@/db/schema/matches";
import { predictionVisibility } from "@/db/schema/predictions";
import { eq } from "drizzle-orm";
import { getUser, isAdmin } from "@/lib/supabase/auth";

export async function POST() {
  const user = await getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tournamentConfig)
      .set({ isLocked: true, currentStage: "group_stage" })
      .where(eq(tournamentConfig.id, 1));

    // Auto-publish all predictions
    await tx
      .update(predictionVisibility)
      .set({ isPublic: true, unlockedAt: new Date() });
  });

  return NextResponse.json({ success: true });
}
