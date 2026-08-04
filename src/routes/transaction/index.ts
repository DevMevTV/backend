import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../index.js";
import { jobs, transactions, users, worlds } from "../../db/schema.js";
import { DrizzleError, DrizzleQueryError, eq } from "drizzle-orm";
import {
  generateToken,
  getJobFromId,
  getTransactionFromId,
  getUserFromToken,
  getUserFromUuid,
  getWorldFromToken,
  getWorldFromUuid,
} from "../../util.js";
import { DatabaseError } from "pg";

type CreateTransactionBody = {
  job: string;
  job_token: string;
  world_token: string;
  user: string;
};

type CreateTransactionResponse = {
  success: true;
  id: number;
};

type CreateTransactionErrorResponse = {
  success: false;
  error: string;
};

type VerifyTransactionParams = {
  id: number;
};

type VerifyTransactionHeaders = {
  Authorization: `Bearer ${string}`;
};

type VerifyTransactionResponse = {
  success: true;
  id: number;
};

type VerifyTransactionErrorResponse = {
  success: false;
  error: string;
};

export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.post<{
    Body: CreateTransactionBody;
    Reply: CreateTransactionResponse | CreateTransactionErrorResponse;
  }>("/create", async (request, reply) => {
    const { job: jobId, job_token, world_token, user: userUuid } = request.body;
    const world = await getWorldFromToken(world_token);
    const user = await getUserFromUuid(userUuid);
    const job = await getJobFromId(jobId);
    if (!user) {
      return reply
        .status(400)
        .send({ success: false, error: "User not found" });
    }
    if (!world) {
      return reply
        .status(400)
        .send({ success: false, error: `World not found` });
    }
    if (world.owner != user.uuid) {
      return reply
        .status(400)
        .send({ success: false, error: `User does not own world` });
    }
    if (!world.verified) {
      return reply
        .status(400)
        .send({ success: false, error: `World not verified` });
    }
    if (!job) {
      return reply.status(400).send({ success: false, error: `Job not found` });
    }
    if (job.token != job_token) {
      return reply
        .status(400)
        .send({ success: false, error: `Invalid token for job` });
    }
    if (job.world != world.uuid) {
      return reply
        .status(400)
        .send({ success: false, error: `Job does not belong to world` });
    }
    let fromType: "user" | "world";
    let fromId: string;

    let toType: "user" | "world";
    let toId: string;
    let status: "approved" | "rejected" | "waiting" = "waiting";

    switch (job.type) {
      case "buy": {
        if (world.balance < job.amount) status = "rejected";
        fromType = "world";
        fromId = world.uuid;

        toType = "user";
        toId = user.uuid;
        break;
      }
      case "sell": {
        if (user.balance < job.amount) status = "rejected";
        fromType = "user";
        fromId = user.uuid;

        toType = "world";
        toId = world.uuid;
        break;
      }
    }
    try {
      const [transaction] = await db
        .insert(transactions)
        .values({
          job: job.id,
          fromType,
          fromId,
          toType,
          toId,
          amount: job.amount,
          status: status,
        })
        .returning({ id: transactions.id });
      return reply.status(201).send({ success: true, id: transaction.id });
    } catch (err) {
      if (err instanceof DrizzleQueryError) {
        return reply
          .status(500)
          .send({ success: false, error: `DatabaseError: ${err.cause}` });
      }
      return reply
        .status(500)
        .send({ success: false, error: `Unknown server error` });
    }
  });

  fastify.get<{
    Params: VerifyTransactionParams;
    Headers: VerifyTransactionHeaders;
    Reply: VerifyTransactionResponse | VerifyTransactionErrorResponse;
  }>("/verify/:id", async (request, reply) => {
    const { id } = request.params;
    const transaction = await getTransactionFromId(id);

    if (!transaction) {
      return reply
        .status(400)
        .send({ success: false, error: `Transaction not found` });
    }

    if (transaction.status !== "waiting") {
      return reply.status(400).send({
        success: false,
        error: "Transaction has already been processed",
      });
    }

    let from =
      transaction.fromType == "world"
        ? await getWorldFromUuid(transaction.fromId)
        : await getUserFromUuid(transaction.fromId);
    let to =
      transaction.toType == "world"
        ? await getWorldFromUuid(transaction.toId)
        : await getUserFromUuid(transaction.toId);
    const job = await getJobFromId(transaction.job);

    if (!job) {
      return reply.status(400).send({ success: false, error: `Job not found` });
    }

    const world = await getWorldFromUuid(job.world);

    if (!world) {
      return reply
        .status(400)
        .send({ success: false, error: `World not found` });
    }

    if (!from) {
      return reply
        .status(400)
        .send({ success: false, error: `${transaction.fromType} not found` });
    }
    if (!to) {
      return reply
        .status(400)
        .send({ success: false, error: `${transaction.toType} not found` });
    }
    if (job.world != world.uuid) {
      return reply
        .status(400)
        .send({ success: false, error: `Job does not belong to world` });
    }
    const user = await getUserFromToken(
      request.headers.authorization.substring(7),
    );

    if (!user) {
      return reply
        .status(400)
        .send({ success: false, error: `User not found` });
    }

    const userUuid = transaction.fromType == "user" ? from.uuid : to.uuid;
    if (user.uuid != userUuid) {
      return reply.status(401).send({ success: false, error: `Unauthorized` });
    }

    const fromBalance = from.balance - job.amount;
    const toBalance = to.balance + job.amount;
    if (fromBalance < 0) {
      await db
        .update(transactions)
        .set({ status: "rejected" })
        .where(eq(transactions.id, transaction.id));
      return reply
        .status(400)
        .send({ success: false, error: "Not enough balance in sender" });
    }

    const fromTable = transaction.fromType == "world" ? worlds : users;
    const toTable = transaction.toType == "world" ? worlds : users;
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(fromTable)
          .set({ balance: fromBalance })
          .where(eq(fromTable.uuid, from.uuid));

        await tx
          .update(toTable)
          .set({ balance: toBalance })
          .where(eq(toTable.uuid, to.uuid));

        await tx
          .update(transactions)
          .set({ status: "approved" })
          .where(eq(transactions.id, transaction.id));
      });
      return reply.status(201).send({ success: true, id: transaction.id });
    } catch (err) {
      if (err instanceof DrizzleQueryError) {
        return reply
          .status(500)
          .send({ success: false, error: `DatabaseError: ${err.cause}` });
      }
      return reply
        .status(500)
        .send({ success: false, error: `Unknown server error` });
    }
  });
}
