import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  time,
  timestamp,
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
  owner: uuid("owner")
    .notNull()
    .references(() => users.uuid),
});

export const jobType = pgEnum("type", ["buy", "sell"]);

export const jobs = pgTable("jobs", {
  id: varchar().primaryKey(),
  name: varchar().notNull(),
  token: varchar().notNull().unique(),
  type: jobType().notNull(),
  amount: integer().notNull(),
  world: uuid()
    .references(() => worlds.uuid)
    .notNull(),
});

export const transactions = pgTable("transactions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  job: varchar("job")
    .notNull()
    .references(() => jobs.id),
  world: uuid()
    .notNull()
    .references(() => worlds.uuid),
  user: uuid()
    .notNull()
    .references(() => users.uuid),
  amount: integer().notNull(),
  time: timestamp().defaultNow().notNull(),
});
