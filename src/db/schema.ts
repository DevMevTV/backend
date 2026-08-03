import { boolean, integer, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const worlds = pgTable("worlds", {
  uuid: uuid().primaryKey(),
  name: varchar().notNull(),
  token: varchar().notNull().unique(),
  verified: boolean().notNull().default(false),
})

export const jobType = pgEnum("type", ["buy", "sell"])

export const jobs = pgTable("jobs", {
  id: varchar().primaryKey(),
  token: varchar().notNull().unique(),
  type: jobType().notNull(),
  amount: integer().notNull(),
  worldToken: varchar("world_token").references(() => worlds.token).notNull(),
})
