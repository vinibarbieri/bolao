import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { leagues } from "./leagues";
import { scoreCategoryEnum } from "./enums";

export const userScores = pgTable("user_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  category: scoreCategoryEnum("category").notNull(),
  subDetail: text("sub_detail"),
  points: integer("points").notNull(),
  description: text("description"),
});

export const leaderboardCache = pgTable(
  "leaderboard_cache",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id),
    totalPoints: integer("total_points").default(0),
    groupPoints: integer("group_points").default(0),
    knockoutPoints: integer("knockout_points").default(0),
    awardPoints: integer("award_points").default(0),
    trioPoints: integer("trio_points").default(0),
    championCorrect: boolean("champion_correct").default(false),
    rank: integer("rank"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.leagueId] })]
);
