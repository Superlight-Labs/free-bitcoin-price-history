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

  app.get("/total-graph", async () => {
    const total = await prisma.pricePointDaily.findMany({
      orderBy: {
        time: "asc",
      },
    });

    const delta = Math.floor(total.length / 200);
    const res = [];
    for (let i = 0; i < total.length; i = i + delta) {
      res.push(total[i]);
    }

    return res;
  });

  app.get("/5y-graph", async () => {
    const fiveYAgo = new Date();
    fiveYAgo.setFullYear(fiveYAgo.getFullYear() - 5);

    const total = await prisma.pricePointDaily.findMany({
      where: {
        time: {
          gte: fiveYAgo,
        },
      },
      orderBy: {
        time: "asc",
      },
    });

    const delta = Math.floor(total.length / 200);
    const res = [];
    for (let i = 0; i < total.length; i = i + delta) {
      res.push(total[i]);
    }

    return res;
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
    SELECT * FROM "PricePointHourly" 
    WHERE nr % 3 = 0 
      AND time >= (CURRENT_DATE - INTERVAL '1 month')
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

    return prisma.pricePointToday.findMany({
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
