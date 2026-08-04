import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../index.js";
import { jobs, transactions, worlds } from "../../db/schema.js";
import { DrizzleError, DrizzleQueryError, eq } from "drizzle-orm";
import {
  generateToken,
  getJobFromId,
  getUserFromToken,
  getUserFromUuid,
  getWorldFromToken,
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
    switch (job.type) {
      case "buy": {
        fromType = "world";
        fromId = world.uuid;

        toType = "user";
        toId = user.uuid;
        break;
      }
      case "sell": {
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
}
