import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { memberStatusEnum } from "./enums";

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").unique().notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const leagueMembers = pgTable(
  "league_members",
  {
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    status: memberStatusEnum("status").notNull().default("pending"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.leagueId, t.userId] })]
);
