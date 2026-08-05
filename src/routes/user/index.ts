import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../index.js";
import { transactions, users, worlds } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import {
  AuthorizationHeaders,
  ErrorResponse,
  generateToken,
  getUserFromUuid,
} from "../../util.js";

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

type GetUserParams = {
  uuid: string;
};

type GetUserUnauthorizedResponse = {
  success: true;
  uuid: string;
  name: string;
  balance: number;
};

type GetUserResponse = {
  success: true;
  uuid: string;
  name: string;
  balance: number;
  worlds: World[];
  transactions: Transaction[];
};

type World = {
  uuid: string;
  name: string;
  verified: boolean;
  balance: number;
};

type Transaction = {
  id: number;
  job: string;
  fromType: "world" | "user";
  fromId: string;
  toType: "world" | "user";
  toId: string;
  status: "approved" | "rejected" | "waiting";
  amount: number;
  time: Date;
};

export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.post<{
    Body: UserLoginBody;
    Reply: UserLoginResponse | ErrorResponse;
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
      return reply.status(200).send({
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

  fastify.get<{
    Headers: AuthorizationHeaders;
    Params: GetUserParams;
    Reply: GetUserResponse | GetUserUnauthorizedResponse | ErrorResponse;
  }>("/:uuid", async (request, reply) => {
    const user = await getUserFromUuid(request.params.uuid);
    if (!user) {
      return reply
        .status(400)
        .send({ success: false, error: "User not found" });
    }
    if (!request.headers.authorization) {
      return reply.status(200).send({
        success: true,
        uuid: user.uuid,
        name: user.name,
        balance: user.balance,
      });
    }
    if (user.token != request.headers.authorization.substring(7)) {
      return reply.status(403).send({ success: false, error: "Unauthorized" });
    }
    const ownedWorlds = await db
      .select({
        uuid: worlds.uuid,
        name: worlds.name,
        verified: worlds.verified,
        balance: worlds.balance,
      })
      .from(worlds)
      .where(eq(worlds.owner, user.uuid));
    const involvedTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.fromId, user.uuid),
          eq(transactions.toId, user.uuid),
        ),
      );
    return reply.status(200).send({
      success: true,
      uuid: user.uuid,
      name: user.name,
      balance: user.balance,
      worlds: ownedWorlds,
      transactions: involvedTransactions
    });
  });
}
