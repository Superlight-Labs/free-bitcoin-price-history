import { createHourlyPricePoint, initDatabase } from "./src/manage-db.js";

import fastifyEnv from "@fastify/env";
import { PrismaClient } from "@prisma/client";
import fastify from "fastify";
import fastifyCron from "fastify-cron";

export const prisma = new PrismaClient();
export const app = fastify({ logger: true });

const hourly = "0 * * * * *";
const thirtySeconds = "*/30 * * * * *";

await app.register(fastifyEnv, {
  dotenv: {
    path: ".env",
  },
  schema: {
    type: "object",
    required: ["ALPHA_VANTAGE_API_KEY", "NODE_ENV"],
  },
});

app.register(fastifyCron, {
  jobs: [
    {
      name: "fetch-new-price-data",
      cronTime:
        app.config["NODE_ENV"] === "development" ? thirtySeconds : hourly,
      onTick: async (_) => createHourlyPricePoint(),
    },
  ],
});

app.addHook("preHandler", (req, reply, done) => {
  reply.header("Content-Type", "application/json");
  reply.header("Cache-Control", "s-max-age=100, stale-while-revalidate");
  done();
});

app.get("/", () => {
  return { status: "ok" };
});

app.get("/health", () => {
  return { status: "ok" };
});

app.get("/total", () => {
  return prisma.$queryRaw`SELECT * FROM PricePointWeekly WHERE nr % 3 = 0 ORDER BY time asc`;
});

app.get("/year", () => {
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  return prisma.pricePointWeekly.findMany({
    where: {
      time: {
        gte: yearAgo,
      },
    },
    orderBy: {
      time: "asc",
    },
  });
});

app.get("/monthly", () => {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  return prisma.pricePointDaily.findMany({
    where: {
      time: {
        gte: monthAgo,
      },
    },
    orderBy: {
      time: "asc",
    },
  });
});

app.get("/weekly", () => {
  return prisma.$queryRaw`
    SELECT * FROM PricePointHourly 
    WHERE nr % 3 = 0 
      AND createdAt between date_sub(now(), INTERVAL 1 WEEK) and now()
    ORDER BY createdAt asc`;
});

app.get("/today", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return prisma.pricePointHourly.findMany({
    where: {
      createdAt: {
        gte: yesterday,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
});

try {
  await app.listen({ port: 3000 });
  app.log.info(
    { proc: app.config["NODE_ENV"] },
    `
  🚀 Server ready at: http://localhost:3000
  `
  );
} catch (err) {
  console.error(err);
  process.exit(1);
}

try {
  app.log.info("Trying to fetch daily data...");
  await initDatabase();
  app.log.info("Successfully fetched daily data.");
  app.cron.startAllJobs();
} catch (err) {
  console.error(err);
  process.exit(1);
}

process.on("uncaughtException", (err) => {
  app.log.error({ err }, "Uncaugh Exception");
  app.log.warn("Shutting down server because of uncaught exception");

  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  app.log.error(
    {
      error: reason,
    },
    "Unhandled Promise Rejection"
  );

  // need to log the promise without stringifying it to properly
  // display all rejection info
  app.log.warn({ promise });

  process.exit(1);
});
