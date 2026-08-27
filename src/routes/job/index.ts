import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../index.js";
import { jobs, worlds } from "../../db/schema.js";
import { DrizzleError, DrizzleQueryError, eq } from "drizzle-orm";
import {
  AuthorizationHeaders,
  ErrorResponse,
  generateToken,
  getJobFromId,
  getUserFromToken,
  getWorldFromToken,
} from "../../util.js";

type CreateJobBody = {
  id: string;
  name: string;
  type: "buy" | "sell";
  amount: number;
  world_token: string;
};

type CreateJobResponse = {
  success: true;
  token: string;
};

type UpdateJobBody = {
  id: string;
  amount: number;
  world_token: string;
};

type UpdateJobResponse = {
  success: true;
  token: string;
};

export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.post<{
    Body: CreateJobBody;
    Reply: CreateJobResponse | ErrorResponse;
    Headers: AuthorizationHeaders;
  }>("/create", async (request, reply) => {
    const { id, world_token, name, type, amount } = request.body;
    const world = await getWorldFromToken(world_token);
    const user = await getUserFromToken(
      request.headers.authorization.substring(7),
    );
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
    const token = generateToken();
    try {
      await db.insert(jobs).values({
        id: id,
        name: name,
        token: token,
        type: type,
        amount: amount,
        world: world.uuid,
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

  fastify.patch<{
    Headers: AuthorizationHeaders;
    Body: UpdateJobBody;
    Reply: UpdateJobResponse | ErrorResponse;
  }>("/update", async (request, reply) => {
    const { amount, world_token, id } = request.body;
    const world = await getWorldFromToken(world_token);
    const user = await getUserFromToken(
      request.headers.authorization.substring(7),
    );
    const job = await getJobFromId(id);
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
    if (job.world != world.uuid) {
      return reply
        .status(400)
        .send({ success: false, error: `Job does not belong to world` });
    }
    try {
      const job = await db
        .update(jobs)
        .set({
          amount: amount,
        })
        .where(eq(jobs.id, id))
        .returning();
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
    return reply.status(201).send({ success: true, token: job.token });
  });
}
