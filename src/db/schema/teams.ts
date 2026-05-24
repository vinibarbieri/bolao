import {
  pgTable,
  text,
  char,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: text("id").primaryKey(), // FIFA code: 'BRA', 'ARG', etc.
  name: text("name").notNull(),
  flagUrl: text("flag_url"),
  groupLetter: char("group_letter", { length: 1 }).notNull(),
});

export const groupStandings = pgTable("group_standings", {
  teamId: text("team_id")
    .primaryKey()
    .references(() => teams.id),
  groupLetter: char("group_letter", { length: 1 }),
  position: integer("position"),
  played: integer("played").default(0),
  won: integer("won").default(0),
  drawn: integer("drawn").default(0),
  lost: integer("lost").default(0),
  gf: integer("gf").default(0),
  ga: integer("ga").default(0),
  gd: integer("gd").default(0),
  points: integer("points").default(0),
  isBestThird: boolean("is_best_third").default(false),
});
