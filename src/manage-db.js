import { app, prisma } from "../index.js";
import { fetchInterval, fetchNow } from "./fetch-data.js";

export const initDatabase = async () => {
  app.log.info("Fetching new daily pricepoints");
  const [latest] = await prisma.pricePointDaily.findMany({
    orderBy: {
      time: "desc",
    },
    take: 1,
  });

  const newDailyPricePoints = await fetchInterval("365", latest);

  await prisma.pricePointDaily.createMany({
    data: newDailyPricePoints,
  });

  const [latestHour] = await prisma.pricePointHourly.findMany({
    orderBy: {
      time: "desc",
    },
    take: 1,
  });

  app.log.info("Fetching new hourly pricepoints");
  const newHourlyPricePoints = await fetchInterval("30", latestHour);

  await prisma.pricePointHourly.createMany({
    data: newHourlyPricePoints,
  });
};

export const createHourlyPricePoint = async () => {
  app.log.info(" --- START Creating hourly price point...");
  try {
    const hour = await fetchNow();

    await prisma.pricePointToday.create({
      data: hour,
    });

    await updateDailyTable(hour);
  } catch (err) {
    app.log.error({ err }, "Failed to create hourly price point");
  }

  app.log.info(" --- END Creating hourly price point...");
};

const updateDailyTable = async (hour) => {
  app.log.info("Fetching latest hourly pricepoint...");

  const [latestHourly] = await prisma.pricePointHourly.findMany({
    orderBy: {
      time: "desc",
    },
    take: 1,
  });

  const hourAgo = new Date();
  hourAgo.setHours(hourAgo.getHours() - 1);

  // Do nothing if pricepoint exists for that hour
  if (latestHourly && latestHourly.time > hourAgo) {
    app.log.info("Price point already exists for this hour");
    return;
  }

  app.log.info("Creating new hourly price point...");
  await prisma.pricePointHourly.create({
    data: {
      date: hour.date,
      time: new Date(),
      value: hour.value,
    },
  });

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

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 32);

  app.log.info("Deleting over month old hourly and 'today' price points...");
  const { count: hourly } = await prisma.pricePointHourly.deleteMany({
    where: {
      time: {
        lte: oneMonthAgo,
      },
    },
  });

  const { count: hourlyToday } = await prisma.pricePointToday.deleteMany({
    where: {
      time: {
        lte: oneMonthAgo,
      },
    },
  });
  app.log.info(
    `Deleted ${hourly} hourly price points & ${hourlyToday} today price points`
  );
};
