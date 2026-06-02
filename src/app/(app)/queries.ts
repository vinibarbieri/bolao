import { db } from "@/db";
import { profiles } from "@/db/schema/profiles";
import { teams, groupStandings } from "@/db/schema/teams";
import { matches, players, tournamentConfig } from "@/db/schema/matches";
import { leagues, leagueMembers } from "@/db/schema/leagues";
import {
  groupPredictions,
  groupScorePredictions,
  knockoutPredictions,
  bracketPicks,
  awardPredictions,
  goldenTrio,
  predictionVisibility,
} from "@/db/schema/predictions";
import { userScores, leaderboardCache } from "@/db/schema/scores";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export async function getTeamsByGroup() {
  const allTeams = await db.select().from(teams).orderBy(asc(teams.groupLetter), asc(teams.name));
  const grouped: Record<string, typeof allTeams> = {};
  for (const team of allTeams) {
    if (!grouped[team.groupLetter]) grouped[team.groupLetter] = [];
    grouped[team.groupLetter].push(team);
  }
  return grouped;
}

export async function getAllTeams() {
  return db.select().from(teams).orderBy(asc(teams.name));
}

export async function getGroupMatches(groupLetter: string) {
  return db
    .select()
    .from(matches)
    .where(
      and(eq(matches.stage, "group"), eq(matches.groupLetter, groupLetter))
    )
    .orderBy(asc(matches.matchNumber));
}

export async function getAllMatches() {
  return db.select().from(matches).orderBy(asc(matches.matchNumber));
}

export async function getUserGroupPredictions(userId: string) {
  return db
    .select()
    .from(groupPredictions)
    .where(eq(groupPredictions.userId, userId));
}

export async function getUserScorePredictions(userId: string) {
  return db
    .select()
    .from(groupScorePredictions)
    .where(eq(groupScorePredictions.userId, userId));
}

export async function getUserBracketPicks(userId: string) {
  return db
    .select()
    .from(bracketPicks)
    .where(eq(bracketPicks.userId, userId));
}

export async function getUserAwardPredictions(userId: string) {
  return db
    .select()
    .from(awardPredictions)
    .where(eq(awardPredictions.userId, userId));
}

export async function getUserGoldenTrio(userId: string) {
  return db.select().from(goldenTrio).where(eq(goldenTrio.userId, userId));
}

export async function getLeaderboard(leagueId: string) {
  return db
    .select({
      userId: leagueMembers.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      totalPoints: sql<number>`coalesce(${leaderboardCache.totalPoints}, 0)`,
      groupPoints: sql<number>`coalesce(${leaderboardCache.groupPoints}, 0)`,
      knockoutPoints: sql<number>`coalesce(${leaderboardCache.knockoutPoints}, 0)`,
      awardPoints: sql<number>`coalesce(${leaderboardCache.awardPoints}, 0)`,
      trioPoints: sql<number>`coalesce(${leaderboardCache.trioPoints}, 0)`,
      championCorrect: sql<boolean>`coalesce(${leaderboardCache.championCorrect}, false)`,
      rank: leaderboardCache.rank,
    })
    .from(leagueMembers)
    .innerJoin(profiles, eq(leagueMembers.userId, profiles.id))
    .leftJoin(
      leaderboardCache,
      and(
        eq(leaderboardCache.userId, leagueMembers.userId),
        eq(leaderboardCache.leagueId, leagueMembers.leagueId),
      ),
    )
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        eq(leagueMembers.status, "accepted"),
      ),
    )
    .orderBy(
      asc(leaderboardCache.rank),
      desc(sql`coalesce(${leaderboardCache.totalPoints}, 0)`),
      asc(profiles.displayName),
    );
}

export async function getUserLeagues(userId: string) {
  return db
    .select({
      id: leagues.id,
      name: leagues.name,
      inviteCode: leagues.inviteCode,
      ownerId: leagues.ownerId,
      status: leagueMembers.status,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(
      and(
        eq(leagueMembers.userId, userId),
        eq(leagueMembers.status, "accepted")
      )
    );
}

export async function getLeagueMembers(leagueId: string) {
  return db
    .select({
      userId: leagueMembers.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      status: leagueMembers.status,
    })
    .from(leagueMembers)
    .innerJoin(profiles, eq(leagueMembers.userId, profiles.id))
    .where(eq(leagueMembers.leagueId, leagueId));
}

export async function getTournamentConfig() {
  const config = await db
    .select()
    .from(tournamentConfig)
    .where(eq(tournamentConfig.id, 1))
    .limit(1);
  return config[0] ?? null;
}

export async function getPredictionVisibility(userId: string) {
  const row = await db
    .select()
    .from(predictionVisibility)
    .where(eq(predictionVisibility.userId, userId))
    .limit(1);
  return row[0] ?? null;
}

export async function getAllPlayers() {
  return db.select().from(players).orderBy(asc(players.name));
}

export async function getPlayersByTeam(teamId: string) {
  return db
    .select()
    .from(players)
    .where(eq(players.teamId, teamId))
    .orderBy(asc(players.name));
}

export async function getUserScoreBreakdown(userId: string) {
  return db
    .select()
    .from(userScores)
    .where(eq(userScores.userId, userId))
    .orderBy(asc(userScores.category));
}

export async function getUserProfile(userId: string) {
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return result[0] ?? null;
}
