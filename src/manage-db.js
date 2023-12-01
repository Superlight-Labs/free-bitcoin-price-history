import { app, prisma } from "../index.js";
import { fetchDaily, fetchHourly } from "./fetch-data.js";

export const initDatabase = async () => {
  app.log.info("Fetching new weekly pricepoints");
  const newDailyPricePoints = await fetchDaily();

  let count = 1;

  for (const day of newDailyPricePoints) {
    app.log.info(`Creating new daily pricepoint...`);
    await prisma.pricePointDaily.create({
      data: day,
    });

    if (count % 7 === 0) {
      app.log.info(`Creating new weekly pricepoint...`);
      await prisma.pricePointWeekly.create({
        data: day,
      });
    }

    count++;
  }
};

export const createHourlyPricePoint = async () => {
  app.log.info(" --- START Creating hourly price point...");
  const hour = await fetchHourly();

  await prisma.pricePointHourly.create({
    data: hour,
  });

  await updateWeeklyTable(hour);
  await updateDailyTable(hour);
  app.log.info(" --- END Creating hourly price point...");
};

const updateWeeklyTable = async (hour) => {
  app.log.info("Fetching latest weekly pricepoint...");
  const [latestWeekly] = await prisma.pricePointWeekly.findMany({
    orderBy: {
      time: "desc",
    },
    take: 1,
  });

  const now = new Date();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);

  if (!latestWeekly || latestWeekly.time < oneWeekAgo) {
    app.log.info("Creating new weekly price point...");
    await prisma.pricePointWeekly.create({
      data: {
        date: hour.date,
        time: now,
        value: hour.value,
      },
    });

    app.log.info("Deleting week old hourly price point...");
    const { count } = await prisma.pricePointHourly.deleteMany({
      where: {
        createdAt: {
          lte: oneWeekAgo,
        },
      },
    });
    app.log.info(`Deleted ${count} hourly price points.`);
  } else {
    app.log.info("Price point already exists for this week...");
  }
};

const updateDailyTable = async (hour) => {
  app.log.info("Fetching latest daily pricepoint...");

  const [latestDaily] = await prisma.pricePointDaily.findMany({
    orderBy: {
      time: "desc",
    },
    take: 1,
  });

  // Do nothing if pricepoint exists for that day
  if (!latestDaily || latestDaily.date !== hour.date) {
    app.log.info("Creating new daily price point...");
    await prisma.pricePointDaily.create({
      data: {
        date: hour.date,
        time: new Date(),
        value: hour.value,
      },
    });
  } else {
    app.log.info("Price point already exists for today");
  }
};
