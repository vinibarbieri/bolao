import {
  pgTable,
  uuid,
  text,
  char,
  integer,
  boolean,
  timestamp,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./profiles";
import { teams } from "./teams";
import { matches, players } from "./matches";
import { knockoutRoundEnum, awardTypeEnum } from "./enums";

export const predictionVisibility = pgTable("prediction_visibility", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id),
  isPublic: boolean("is_public").default(false),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
});

export const groupPredictions = pgTable(
  "group_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    groupLetter: char("group_letter", { length: 1 }).notNull(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    predictedPosition: integer("predicted_position").notNull(),
    advancesAsThird: boolean("advances_as_third").notNull().default(false),
  },
  (t) => [
    unique("uq_user_group_team").on(t.userId, t.groupLetter, t.teamId),
    unique("uq_user_group_position").on(
      t.userId,
      t.groupLetter,
      t.predictedPosition
    ),
  ]
);

export const groupScorePredictions = pgTable(
  "group_score_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id),
    predictedHomeScore: integer("predicted_home_score"),
    predictedAwayScore: integer("predicted_away_score"),
  },
  (t) => [unique("uq_user_match_score").on(t.userId, t.matchId)]
);

export const knockoutPredictions = pgTable(
  "knockout_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    round: knockoutRoundEnum("round").notNull(),
  },
  (t) => [unique("uq_user_team_round").on(t.userId, t.teamId, t.round)]
);

export const bracketPicks = pgTable(
  "bracket_picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    bracketSlot: integer("bracket_slot").notNull(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
  },
  (t) => [unique("uq_user_bracket_slot").on(t.userId, t.bracketSlot)]
);

export const awardPredictions = pgTable(
  "award_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    awardType: awardTypeEnum("award_type").notNull(),
    playerId: uuid("player_id").references(() => players.id),
    description: text("description"),
  },
  (t) => [unique("uq_user_award").on(t.userId, t.awardType)]
);

export const goldenTrio = pgTable(
  "golden_trio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    slot: integer("slot").notNull(),
  },
  (t) => [
    unique("uq_user_trio_slot").on(t.userId, t.slot),
    unique("uq_user_trio_player").on(t.userId, t.playerId),
  ]
);

export const actualAwards = pgTable("actual_awards", {
  awardType: awardTypeEnum("award_type").primaryKey(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  enteredBy: uuid("entered_by").references(() => profiles.id),
});
