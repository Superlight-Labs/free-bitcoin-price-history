import { app, prisma } from "../index.js";
import { fetchDaily, fetchHourly } from "./fetch-data.js";

export const initDatabase = async () => {
  app.log.info("Fetching new daily pricepoints");
  const newDailyPricePoints = await fetchDaily();

  await prisma.pricePointDaily.createMany({
    data: newDailyPricePoints,
  });
};

export const createHourlyPricePoint = async () => {
  app.log.info(" --- START Creating hourly price point...");
  try {
    const hour = await fetchHourly();

    await prisma.pricePointHourly.create({
      data: hour,
    });

    await updateDailyTable(hour);
  } catch (err) {
    app.log.error({ err }, "Failed to create hourly price point");
  }

  app.log.info(" --- END Creating hourly price point...");
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
  if (latestDaily && latestDaily.date === hour.date) {
    app.log.info("Price point already exists for today");
    return;
  }

  app.log.info("Creating new daily price point...");
  await prisma.pricePointDaily.create({
    data: {
      date: hour.date,
      time: new Date(),
      value: hour.value,
    },
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  app.log.info("Deleting week old hourly price point...");
  const { count } = await prisma.pricePointHourly.deleteMany({
    where: {
      createdAt: {
        lte: oneWeekAgo,
      },
    },
  });
  app.log.info(`Deleted ${count} hourly price points.`);
};
