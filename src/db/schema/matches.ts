import {
  pgTable,
  uuid,
  text,
  char,
  integer,
  timestamp,
  boolean,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { teams } from "./teams";
import { matchStageEnum, matchStatusEnum, playerPositionEnum } from "./enums";

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id),
  position: playerPositionEnum("position").notNull(),
  externalApiId: text("external_api_id"),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  stage: matchStageEnum("stage").notNull(),
  groupLetter: char("group_letter", { length: 1 }),
  matchNumber: integer("match_number"),
  homeTeamId: text("home_team_id").references(() => teams.id),
  awayTeamId: text("away_team_id").references(() => teams.id),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  homePenalties: integer("home_penalties"),
  awayPenalties: integer("away_penalties"),
  winnerTeamId: text("winner_team_id").references(() => teams.id),
  motmPlayerId: uuid("motm_player_id").references(() => players.id),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  status: matchStatusEnum("status").notNull().default("scheduled"),
  externalApiId: text("external_api_id"),
});

export const tournamentConfig = pgTable(
  "tournament_config",
  {
    id: integer("id").primaryKey(),
    predictionsLockAt: timestamp("predictions_lock_at", {
      withTimezone: true,
    }).notNull(),
    isLocked: boolean("is_locked").default(false),
    currentStage: text("current_stage").notNull().default("pre_tournament"),
  },
  (t) => [check("singleton_check", sql`${t.id} = 1`)]
);
