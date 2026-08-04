import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { generateToken } from "../../util.js";

type UserLoginBody = {
  client_id: string;
  client_secret: string;
  code: string;
  redirect_uri: string;
  grant_type: "authorization_code";
};

type UserLoginResponse = {
  success: true;
  token: string;
  uuid: string;
  state: string;
};

type UserLoginErrorResponse = {
  success: false;
  error: string;
};

export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.post<{
    Body: UserLoginBody;
    Reply: UserLoginResponse | UserLoginErrorResponse;
  }>("/login", async (request, reply) => {
    const mcauthTokenResponse = await fetch(
      "https://mc-auth.com/oAuth2/token",
      {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      },
    );
    const body = await mcauthTokenResponse.json();

    if (mcauthTokenResponse.status == 400) {
      return reply.status(400).send({ success: false, error: body.message });
    }

    const mcauthProfileResponse = await fetch(
      "https://mc-auth.com/api/v2/profile",
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${body.access_token}`,
        },
      },
    );
    const profile = await mcauthProfileResponse.json();
    console.log(profile);

    // check if profile valid
    if (mcauthProfileResponse.status == 400) {
      return reply.status(400).send({ success: false, error: body.message });
    }

    const { id, name } = profile;
    const existingUser = (
      await db.select().from(users).where(eq(users.uuid, id)).limit(1)
    )[0];
    if (existingUser) {
      return reply
        .status(200)
        .send({
          success: true,
          token: existingUser.token,
          state: body.state,
          uuid: existingUser.uuid,
        });
    }
    const token = generateToken();
    await db.insert(users).values({
      uuid: id,
      name: name,
      token: token,
    });
    return reply
      .status(201)
      .send({ success: true, token: token, state: body.state, uuid: id });
  });
}
