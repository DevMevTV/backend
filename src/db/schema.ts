import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const worlds = pgTable("worlds", {
  uuid: uuid().primaryKey(),
  name: varchar().notNull(),
  token: varchar().notNull(),
  verified: boolean().notNull().default(false),
})
