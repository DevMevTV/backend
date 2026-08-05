import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../index.js";
import { jobs, worlds } from "../../db/schema.js";
import { DrizzleQueryError, eq } from "drizzle-orm";
import {
  AuthorizationHeaders,
  ErrorResponse,
  generateToken,
  getUserFromToken,
  getUserFromUuid,
  getWorldFromUuid,
} from "../../util.js";

type CreateWorldBody = {
  uuid: string;
  name: string;
};

type CreateWorldResponse = {
  success: true;
  token: string;
};

type VerifyWorldParams = {
  uuid: string;
};

type VerifyWorldResponse = {
  success: true;
  uuid: string;
};

type GetWorldParams = {
  uuid: string;
};

type GetWorldUnauthorizedResponse = {
  success: true;
  uuid: string;
  name: string;
  balance: number;
};

type GetWorldResponse = {
  success: true;
  uuid: string;
  name: string;
  verified: boolean;
  balance: number;
  token: string;
  jobs: Job[];
};

type Job = {
  id: string;
  name: string;
  token: string;
  type: "buy" | "sell";
  amount: number;
};

export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.post<{
    Body: CreateWorldBody;
    Reply: CreateWorldResponse | ErrorResponse;
    Headers: AuthorizationHeaders;
  }>("/create", async (request, reply) => {
    const user = await getUserFromToken(
      request.headers.authorization.substring(7),
    );
    if (!user) {
      return reply
        .status(400)
        .send({ success: false, error: "User not found" });
    }
    const { uuid, name } = request.body;
    const token = generateToken();
    try {
      await db.insert(worlds).values({
        uuid: uuid,
        name: name,
        token: token,
        owner: user.uuid,
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

  fastify.post<{
    Params: VerifyWorldParams;
    Headers: AuthorizationHeaders;
    Reply: VerifyWorldResponse | ErrorResponse;
  }>("/verify/:uuid", async (request, reply) => {
    if (!request.headers.authorization) {
      return reply
        .status(401)
        .send({ success: false, error: "Unauthenticated" });
    }
    const user = await getUserFromToken(
      request.headers.authorization.substring(7),
    );
    if (!user) {
      return reply
        .status(401)
        .send({ success: false, error: "Unauthenticated" });
    }
    if (!user.admin) {
      return reply.status(403).send({ success: false, error: "Unauthorized" });
    }
    const world = await getWorldFromUuid(request.params.uuid);
    if (!world) {
      return reply
        .status(400)
        .send({ success: false, error: "World not found" });
    }
    if (world.verified) {
      return reply
        .status(400)
        .send({ success: false, error: "World already verified" });
    }

    try {
      await db
        .update(worlds)
        .set({ verified: true })
        .where(eq(worlds.uuid, world.uuid));
    } catch (err) {
      if (err instanceof DrizzleQueryError) {
        return reply
          .status(500)
          .send({ success: false, error: `DatabaseError: ${err.cause}` });
      }
      return reply
        .status(500)
        .send({ success: false, error: `UnknownServerError: ${err}` });
    }
    return reply.status(200).send({ success: true, uuid: world.uuid });
  });

  fastify.get<{
    Params: GetWorldParams;
    Headers: AuthorizationHeaders;
    Reply: GetWorldResponse | GetWorldUnauthorizedResponse | ErrorResponse;
  }>("/:uuid", async (request, reply) => {
    const world = await getWorldFromUuid(request.params.uuid);
    if (!world) {
      return reply
        .status(400)
        .send({ success: false, error: "World not found" });
    }
    if (!request.headers.authorization) {
      return reply.status(200).send({
        success: true,
        uuid: world.uuid,
        name: world.name,
        balance: world.balance,
      });
    }
    const user = await getUserFromToken(
      request.headers.authorization.substring(7),
    );
    if (world.owner != user.uuid) {
      return reply.status(403).send({ success: false, error: "Unauthorized" });
    }
    const ownedJobs = await db
      .select({
        id: jobs.id,
        name: jobs.name,
        token: jobs.token,
        type: jobs.type,
        amount: jobs.amount,
      })
      .from(jobs)
      .where(eq(jobs.world, world.uuid));
    return reply.status(200).send({
      success: true,
      uuid: world.uuid,
      name: world.name,
      token: world.token,
      balance: world.balance,
      jobs: ownedJobs,
    });
  });
}
