export const register = (app, prisma) => {
  app.get("/", () => {
    return { status: "ok" };
  });

  app.get("/health", () => {
    return { status: "ok" };
  });

  app.get("/total", () => {
    return prisma.pricePointDaily.findMany({
      orderBy: {
        time: "asc",
      },
    });
  });

  app.get("/year", () => {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    return prisma.pricePointDaily.findMany({
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

    return prisma.$queryRaw`
    SELECT * FROM PricePointHourly 
    WHERE nr % 3 = 0 
      AND time between date_sub(now(), INTERVAL 1 MONTH) and now()
    ORDER BY time asc`;
  });

  app.get("/weekly", () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    return prisma.pricePointHourly.findMany({
      where: {
        time: {
          gte: lastWeek,
        },
      },
      orderBy: {
        time: "asc",
      },
    });
  });

  app.get("/today", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return prisma.pricePointHourly.findMany({
      where: {
        time: {
          gte: yesterday,
        },
      },
      orderBy: {
        time: "asc",
      },
    });
  });

  app.all("*", (request, reply) => {
    reply.status(404).send({ error: "Route does not exist" });
  });
};
