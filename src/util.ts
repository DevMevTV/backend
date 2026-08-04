import { randomBytes } from "crypto";
import { db } from "./index.js";
import { jobs, users, worlds } from "./db/schema.js";
import { eq } from "drizzle-orm";

export const generateToken = () => randomBytes(32).toString("hex");

export async function getWorldFromToken(token: string) {
  const world = (
    await db.select().from(worlds).where(eq(worlds.token, token)).limit(1)
  )[0];
  return world;
}

export async function getUserFromToken(token: string) {
  const user = (
    await db.select().from(users).where(eq(users.token, token)).limit(1)
  )[0];
  return user;
}

export async function getUserFromUuid(uuid: string) {
  const user = (
    await db.select().from(users).where(eq(users.uuid, uuid)).limit(1)
  )[0];
  return user;
}

export async function getJobFromId(id: string) {
  const user = (
    await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)
  )[0];
  return user;
}
