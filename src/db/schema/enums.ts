import { pgEnum } from "drizzle-orm/pg-core";

export const memberStatusEnum = pgEnum("member_status", [
  "pending",
  "accepted",
  "denied",
]);

export const matchStageEnum = pgEnum("match_stage", [
  "group",
  "r32",
  "r16",
  "qf",
  "sf",
  "third",
  "final",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
]);

export const playerPositionEnum = pgEnum("player_position", [
  "GK",
  "DF",
  "MF",
  "FW",
]);

export const knockoutRoundEnum = pgEnum("knockout_round", [
  "r32",
  "r16",
  "qf",
  "sf",
  "third",
  "final",
  "champion",
]);

export const awardTypeEnum = pgEnum("award_type", [
  "golden_boot",
  "golden_glove",
  "top_assist",
  "goal_of_tournament",
]);

export const scoreCategoryEnum = pgEnum("score_category", [
  "group",
  "knockout",
  "awards",
  "golden_trio",
]);

export const tournamentStageEnum = pgEnum("tournament_stage", [
  "pre_tournament",
  "group_stage",
  "knockout",
  "finished",
]);
