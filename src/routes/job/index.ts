import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../index.js";
import { jobs, worlds } from "../../db/schema.js";
import { DrizzleError, DrizzleQueryError, eq } from "drizzle-orm";
import { generateToken } from "../../util.js";
import { DatabaseError } from "pg";

type CreateJobBody = {
  id: string;
  type: "buy" | "sell";
  amount: number;
  world_token: string;
};

type CreateJobResponse = {
  success: true;
  token: string;
};

type CreateJobErrorResponse = {
  success: false;
  error: string;
};

export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.post<{
    Body: CreateJobBody;
    Reply: CreateJobResponse | CreateJobErrorResponse;
  }>("/create", async (request, reply) => {
    const { id, world_token, type, amount } = request.body;
    try {
      const world = (
        await db.select().from(worlds).where(eq(worlds.token, world_token))
      )[0];
      if (!world.verified) {
        return reply
          .status(400)
          .send({ success: false, error: `World not verified` });
      }
    } catch (err) {
      return reply
        .status(400)
        .send({ success: false, error: `World not found` });
    }
    const token = generateToken();
    try {
      await db.insert(jobs).values({
        id: id,
        token: token,
        type: type,
        amount: amount,
        worldToken: world_token,
      });
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
    return reply.status(201).send({ success: true, token: token });
  });
}
