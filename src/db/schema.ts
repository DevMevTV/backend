import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  uuid: uuid().primaryKey(),
  name: varchar().notNull(),
  token: varchar().notNull().unique(),
  balance: integer().notNull().default(0),
  admin: boolean().notNull().default(false)
});

export const worlds = pgTable("worlds", {
  uuid: uuid().primaryKey(),
  name: varchar().notNull(),
  token: varchar().notNull().unique(),
  verified: boolean().notNull().default(false),
  owner: uuid("owner")
    .notNull()
    .references(() => users.uuid),
  balance: integer().notNull().default(0),
});

export const jobType = pgEnum("job_type", ["buy", "sell"]);

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

export const entityType = pgEnum("entity_type", ["user", "world"]);

export const transactionStatus = pgEnum("transaction_status", [
  "approved",
  "rejected",
  "waiting",
]);

export const transactions = pgTable("transactions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  job: varchar("job")
    .notNull()
    .references(() => jobs.id),

  fromType: entityType("from_type").notNull(),
  fromId: uuid("from_id").notNull(),

  toType: entityType("to_type").notNull(),
  toId: uuid("to_id").notNull(),

  status: transactionStatus().notNull().default("waiting"),

  amount: integer().notNull(),
  time: timestamp().defaultNow().notNull(),
});
