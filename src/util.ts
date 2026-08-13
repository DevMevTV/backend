import { randomBytes } from "crypto";
import { db } from "./index.js";
import { jobs, transactions, users, worlds } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { VerifyTransactionResponse } from "./routes/transaction/index.js";

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

export async function getWorldFromUuid(uuid: string) {
  const world = (
    await db.select().from(worlds).where(eq(worlds.uuid, uuid)).limit(1)
  )[0];
  return world;
}

export async function getJobFromId(id: string) {
  const job = (await db.select().from(jobs).where(eq(jobs.id, id)).limit(1))[0];
  return job;
}

export async function getTransactionFromId(id: number) {
  const transaction = (
    await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)
  )[0];
  return transaction;
}

export async function getUsernameFromUuid(uuid: string) {
  const body = await (
    await fetch(
      `https://api.minecraftservices.com/minecraft/profile/lookup/${uuid}`,
    )
  ).json();
  return body.name;
}
export type AuthorizationHeaders = {
  Authorization: `Bearer ${string}`;
};

export async function executeTransaction(
  fromTable: typeof worlds | typeof users,
  toTable: typeof worlds | typeof users,
  job: Awaited<ReturnType<typeof getJobFromId>>,
  transaction: Awaited<ReturnType<typeof getTransactionFromId>>,
  from:
    | Awaited<ReturnType<typeof getUserFromUuid>>
    | Awaited<ReturnType<typeof getWorldFromUuid>>,
  to:
    | Awaited<ReturnType<typeof getUserFromUuid>>
    | Awaited<ReturnType<typeof getWorldFromUuid>>,
): Promise<VerifyTransactionResponse | ErrorResponse> {
  const newFromBalance = from.balance - job.amount;
  const newToBalance = to.balance + job.amount;
  if (newFromBalance < 0) {
    await db
      .update(transactions)
      .set({ status: "rejected" })
      .where(eq(transactions.id, transaction.id));
    return { success: false, error: "Not enough balance in sender" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(fromTable)
      .set({ balance: newFromBalance })
      .where(eq(fromTable.uuid, from.uuid));

    await tx
      .update(toTable)
      .set({ balance: newToBalance })
      .where(eq(toTable.uuid, to.uuid));

    await tx
      .update(transactions)
      .set({ status: "approved" })
      .where(eq(transactions.id, transaction.id));
  });
  return { success: true, id: transaction.id };
}

export type ErrorResponse = {
  success: false;
  error: string;
};
