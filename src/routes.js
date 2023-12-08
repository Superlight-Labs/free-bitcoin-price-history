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
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    return prisma.pricePointHourly.findMany({
      where: {
        minute: 0,
        createdAt: {
          gte: lastWeek,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
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

  app.all("*", (request, reply) => {
    reply.status(404).send({ error: "Route does not exist" });
  });
};
