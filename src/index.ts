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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

server.register(autoload, {
  dir: path.join(__dirname, "routes"),
});

server.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`listening on port ${PORT}`);
});
