import { createHourlyPricePoint } from "./src/manage-db.js";

import fastifyEnv from "@fastify/env";
import { PrismaClient } from "@prisma/client";
import fastify from "fastify";
import fastifyCron from "fastify-cron";

import { fetchDaily, fetchHourly } from "./src/fetch-data.js";

export const prisma = new PrismaClient();
export const app = fastify({ logger: true });

const hourly = "0 * * * * *";

const thirtySeconds = "*/30 * * * * *";

app.register(fastifyCron, {
  jobs: [
    {
      // cronTime: hourly,
      cronTime: thirtySeconds,
      onTick: async (_) => createHourlyPricePoint(),
      startWhenReady: true,
    },
  ],
});

app.register(fastifyEnv, {
  dotenv: {
    path: ".env",
  },
  schema: {
    type: "object",
    required: ["ALPHA_VANTAGE_API_KEY"],
  },
});

app.get("/health", () => {
  return { status: "ok" };
});

app.get("/daily", () => {
  return fetchDaily();
});

app.get("/hourly", () => {
  return fetchHourly();
});

try {
  await app.listen({ port: 3000 });
  app.log.info(`
  🚀 Server ready at: http://localhost:3000
  `);
} catch (err) {
  console.error(err);
  process.exit(1);
}

try {
  app.log.info("Trying to fetch daily data...");
  // await initDatabase();
  app.log.info("Successfully fetched daily data.");
} catch (err) {
  console.error(err);
  process.exit(1);
}
