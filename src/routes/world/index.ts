import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../index.js";
import { worlds } from "../../db/schema.js";
import { DrizzleError, DrizzleQueryError, eq } from "drizzle-orm";
import { generateToken } from "../../util.js";
import { DatabaseError } from "pg";

type PostWorldBody = {
  uuid: string;
  name: string;
};

type CreateWorldResponse = {
  success: true;
  token: string;
};

type CreateWorldErorResponse = {
  success: false;
  error: string;
};

export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.post<{
    Body: PostWorldBody;
    Reply: CreateWorldResponse | CreateWorldErorResponse;
  }>("/create", async (request, reply) => {
    const { uuid, name } = request.body;
    const token = generateToken();
    try {
      await db.insert(worlds).values({
        uuid: uuid,
        name: name,
        token: token,
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
