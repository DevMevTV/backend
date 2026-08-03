import { FastifyInstance, FastifyPluginOptions } from "fastify";

type UserLoginBody = {
  // mc auth authorization code
  code: string;
};

type UserLoginResponse = {
  success: true;
  token: string;
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
    const mcAuthPostRequestBody = {
      client_id: process.env.MCAUTH_CLIENT_ID!,
      client_secret: process.env.MCAUTH_CLIENT_SECRET!,
      code: request.body.code,
      redirect_uri: "",
      grant_type: "authorization_code",
    };

    const mcauthTokenResponse = await fetch(
      "https://mc-auth.com/oAuth2/token",
      {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mcAuthPostRequestBody),
      },
    );
    const body = await mcauthTokenResponse.json();

    if (mcauthTokenResponse.status == 400) {
      reply.status(400).send({ success: false, error: body.message });
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
    const profile = await mcauthTokenResponse.json();

    // check if profile valid


  });
}
