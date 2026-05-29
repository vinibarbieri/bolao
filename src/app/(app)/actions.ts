"use server";

import { db } from "@/db";
import {
  groupPredictions,
  groupScorePredictions,
  knockoutPredictions,
  bracketPicks,
  awardPredictions,
  goldenTrio,
  predictionVisibility,
} from "@/db/schema/predictions";
import {
  leagues,
  leagueMembers,
} from "@/db/schema/leagues";
import { profiles } from "@/db/schema/profiles";
import { tournamentConfig } from "@/db/schema/matches";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/supabase/auth";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

async function getAuthUserId(): Promise<string> {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function checkNotLocked() {
  const config = await db
    .select()
    .from(tournamentConfig)
    .where(eq(tournamentConfig.id, 1))
    .limit(1);
  if (config[0]?.isLocked) {
    throw new Error("Predictions are locked. The tournament has started.");
  }
}

// === Profile ===

export async function ensureProfile() {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(profiles).values({
      id: user.id,
      displayName:
        user.user_metadata?.full_name ?? user.email ?? "Anonymous",
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    });

    // Also create prediction visibility
    await db.insert(predictionVisibility).values({
      userId: user.id,
      isPublic: false,
    });
  }

  return user.id;
}

export async function updateDisplayName(displayName: string) {
  const userId = await getAuthUserId();
  const trimmed = displayName.trim();
  if (!trimmed || trimmed.length > 50) {
    throw new Error("Display name must be between 1 and 50 characters.");
  }
  await db
    .update(profiles)
    .set({ displayName: trimmed })
    .where(eq(profiles.id, userId));
  revalidatePath("/", "layout");
}

// === Group Predictions ===

export async function saveGroupPredictions(
  data: {
    groupLetter: string;
    teams: { teamId: string; position: number }[];
  }[]
) {
  const userId = await getAuthUserId();
  await checkNotLocked();

  await db.transaction(async (tx) => {
    // Delete existing predictions for the user
    await tx
      .delete(groupPredictions)
      .where(eq(groupPredictions.userId, userId));

    // Insert new predictions
    const rows = data.flatMap((group) =>
      group.teams.map((team) => ({
        userId,
        groupLetter: group.groupLetter,
        teamId: team.teamId,
        predictedPosition: team.position,
        advancesAsThird: false, // will be set separately
      }))
    );

    if (rows.length > 0) {
      await tx.insert(groupPredictions).values(rows);
    }
  });

  revalidatePath("/groups");
}

export async function saveThirdPlaceSelections(teamIds: string[]) {
  const userId = await getAuthUserId();
  await checkNotLocked();

  if (teamIds.length !== 8) {
    throw new Error("Exactly 8 third-place teams must be selected");
  }

  await db.transaction(async (tx) => {
    // Reset all advances_as_third to false
    await tx
      .update(groupPredictions)
      .set({ advancesAsThird: false })
      .where(
        and(
          eq(groupPredictions.userId, userId),
          eq(groupPredictions.predictedPosition, 3)
        )
      );

    // Set selected teams to true
    for (const teamId of teamIds) {
      await tx
        .update(groupPredictions)
        .set({ advancesAsThird: true })
        .where(
          and(
            eq(groupPredictions.userId, userId),
            eq(groupPredictions.teamId, teamId),
            eq(groupPredictions.predictedPosition, 3)
          )
        );
    }
  });

  revalidatePath("/third-place");
  revalidatePath("/bracket");
}

// === Score Predictions (Cosmetic) ===

export async function saveScorePredictions(
  data: {
    matchId: string;
    homeScore: number;
    awayScore: number;
  }[]
) {
  const userId = await getAuthUserId();
  await checkNotLocked();

  await db.transaction(async (tx) => {
    for (const score of data) {
      await tx
        .insert(groupScorePredictions)
        .values({
          userId,
          matchId: score.matchId,
          predictedHomeScore: score.homeScore,
          predictedAwayScore: score.awayScore,
        })
        .onConflictDoUpdate({
          target: [
            groupScorePredictions.userId,
            groupScorePredictions.matchId,
          ],
          set: {
            predictedHomeScore: score.homeScore,
            predictedAwayScore: score.awayScore,
          },
        });
    }
  });
}

// === Bracket Predictions ===

export async function saveBracketPredictions(
  picks: { bracketSlot: number; teamId: string }[]
) {
  const userId = await getAuthUserId();
  await checkNotLocked();

  await db.transaction(async (tx) => {
    // Clear existing bracket picks
    await tx.delete(bracketPicks).where(eq(bracketPicks.userId, userId));

    // Clear existing knockout predictions
    await tx
      .delete(knockoutPredictions)
      .where(eq(knockoutPredictions.userId, userId));

    // Insert bracket picks
    if (picks.length > 0) {
      await tx.insert(bracketPicks).values(
        picks.map((p) => ({
          userId,
          bracketSlot: p.bracketSlot,
          teamId: p.teamId,
        }))
      );
    }

    // Derive knockout predictions from bracket picks
    // For each team, determine which rounds they reached
    const teamRounds = new Map<string, Set<string>>();

    for (const pick of picks) {
      const round = slotToRound(pick.bracketSlot);
      if (!round) continue;

      if (!teamRounds.has(pick.teamId)) {
        teamRounds.set(pick.teamId, new Set());
      }
      teamRounds.get(pick.teamId)!.add(round);
    }

    const knockoutRows: {
      userId: string;
      teamId: string;
      round: "r32" | "r16" | "qf" | "sf" | "third" | "final" | "champion";
    }[] = [];

    for (const [teamId, rounds] of teamRounds) {
      for (const round of rounds) {
        knockoutRows.push({
          userId,
          teamId,
          round: round as "r32" | "r16" | "qf" | "sf" | "third" | "final" | "champion",
        });
      }
    }

    if (knockoutRows.length > 0) {
      await tx.insert(knockoutPredictions).values(knockoutRows);
    }
  });

  revalidatePath("/bracket");
}

function slotToRound(
  slot: number
): string | null {
  if (slot >= 1 && slot <= 16) return "r32";
  if (slot >= 17 && slot <= 24) return "r16";
  if (slot >= 25 && slot <= 28) return "qf";
  if (slot >= 29 && slot <= 30) return "sf";
  if (slot === 31) return "final";
  if (slot === 32) return "third";
  return null;
}

// === Award Predictions ===

export async function saveAwardPredictions(
  data: {
    awardType: "golden_boot" | "golden_glove" | "top_assist" | "goal_of_tournament";
    playerId?: string;
  }[]
) {
  const userId = await getAuthUserId();
  await checkNotLocked();

  await db.transaction(async (tx) => {
    await tx
      .delete(awardPredictions)
      .where(eq(awardPredictions.userId, userId));

    const rows = data
      .filter((d) => d.playerId)
      .map((d) => ({
        userId,
        awardType: d.awardType,
        playerId: d.playerId ?? null,
      }));

    if (rows.length > 0) {
      await tx.insert(awardPredictions).values(rows);
    }
  });

  revalidatePath("/predictions/awards");
}

// === Golden Trio ===

export async function saveGoldenTrio(
  players: { playerId: string; slot: number }[]
) {
  const userId = await getAuthUserId();
  await checkNotLocked();

  if (players.length !== 3) {
    throw new Error("Golden Trio must have exactly 3 players");
  }

  await db.transaction(async (tx) => {
    await tx.delete(goldenTrio).where(eq(goldenTrio.userId, userId));
    await tx.insert(goldenTrio).values(
      players.map((p) => ({
        userId,
        playerId: p.playerId,
        slot: p.slot,
      }))
    );
  });

  revalidatePath("/predictions/trio");
}

// === Leagues ===

export async function createLeague(name: string) {
  const userId = await getAuthUserId();
  const inviteCode = nanoid(8);

  const [league] = await db
    .insert(leagues)
    .values({ name, inviteCode, ownerId: userId })
    .returning();

  // Owner is automatically a member
  await db.insert(leagueMembers).values({
    leagueId: league.id,
    userId,
    status: "accepted",
  });

  revalidatePath("/leagues");
  return league;
}

export async function joinLeague(inviteCode: string) {
  const userId = await getAuthUserId();

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, inviteCode))
    .limit(1);

  if (league.length === 0) {
    throw new Error("Invalid invite code");
  }

  // Check if already a member
  const existing = await db
    .select()
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, league[0].id),
        eq(leagueMembers.userId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Already a member of this league");
  }

  await db.insert(leagueMembers).values({
    leagueId: league[0].id,
    userId,
    status: "accepted",
  });

  revalidatePath("/leagues");
  return league[0];
}
