import { randomBytes } from "crypto";
import { db } from "./index.js";
import { users, worlds } from "./db/schema.js";
import { eq } from "drizzle-orm";

export const generateToken = () => randomBytes(32).toString("hex");

export async function getWorldFromUuid(uuid: string) {
  const world = (await db.select().from(worlds).where(eq(worlds.uuid, uuid)).limit(1))[0]
  return world;
}

export async function getUserFromToken(token: string) {
  const user = (await db.select().from(users).where(eq(users.token, token)).limit(1))[0]
  return user;
}
