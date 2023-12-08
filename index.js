import { createHourlyPricePoint, initDatabase } from "./src/manage-db.js";

import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import fastify from "fastify";
import fastifyCron from "fastify-cron";
import { register } from "./src/routes.js";

export const prisma = new PrismaClient();
export const app = fastify({
  logger: {
    level: "debug",
  },
});

const fiveMinutes = "*/5 * * * *";
const thirtySeconds = "*/30 * * * * *";

app.register(fastifyCron, {
  jobs: [
    {
      name: "fetch-new-price-data",
      cronTime:
        process.env["NODE_ENV"] === "development" ? thirtySeconds : fiveMinutes,
      onTick: async (_) => createHourlyPricePoint(),
    },
  ],
});

app.addHook("preHandler", (req, reply, done) => {
  reply.header("Content-Type", "application/json");
  reply.header("Cache-Control", "s-max-age=100, stale-while-revalidate");
  done();
});

register(app, prisma);

const port = process.env.PORT || 3000;
const host = process.env.HOST || "localhost";

const start = async () => {
  try {
    await app.listen({ port, host });
    app.log.info(`🚀 Server ready at: http://${host}:${port}`);
    await initDatabase();
    app.log.info("Successfully fetched daily data.");
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError) {
      app.log.warn({ err }, "Failed to run init Database script");
      return;
    }

    app.log.error({ err }, "Error starting server");
    process.exit(1);
  }
};

await start();

app.log.info("Starting cron jobs");
app.cron.startAllJobs();

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
