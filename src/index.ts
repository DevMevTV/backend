import autoload from "@fastify/autoload";
import "dotenv/config";
import fastify from "fastify";
import path from "node:path";
const server = fastify();
const PORT = Number(process.env.PORT) || 3000;
import { drizzle } from "drizzle-orm/node-postgres";
export const db = drizzle(process.env.DATABASE_URL!);
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "@fastify/cors";
import { transactions } from "./db/schema.js";
import { and, eq, lt } from "drizzle-orm";

let CHECKING_INTERVAL;
let TTL_BEFORE_REJECT = 30000;

CHECKING_INTERVAL = setInterval(() => {
  void rejectOldTransactions();
}, TTL_BEFORE_REJECT);

async function rejectOldTransactions() {
  const cutoff = new Date(Date.now() - TTL_BEFORE_REJECT);

  await db
    .update(transactions)
    .set({ status: "rejected" })
    .where(
      and(eq(transactions.status, "waiting"), lt(transactions.time, cutoff)),
    );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

server.register(cors, { origin: "*" });

server.register(autoload, {
  dir: path.join(__dirname, "routes"),
});

server.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`listening on port ${PORT}`);
});
