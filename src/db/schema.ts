import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  uuid: uuid().primaryKey(),
  name: varchar().notNull(),
  token: varchar().notNull().unique(),
});

export const worlds = pgTable("worlds", {
  uuid: uuid().primaryKey(),
  name: varchar().notNull(),
  token: varchar().notNull().unique(),
  verified: boolean().notNull().default(false),
  ownerUuid: uuid("owner_uuid").notNull().references(() => users.uuid)
});

export const jobType = pgEnum("type", ["buy", "sell"]);

export const jobs = pgTable("jobs", {
  id: varchar().primaryKey(),
  name: varchar().notNull(),
  token: varchar().notNull().unique(),
  type: jobType().notNull(),
  amount: integer().notNull(),
  worldUuid: uuid("world_uuid")
    .references(() => worlds.uuid)
    .notNull(),
});
