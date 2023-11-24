import { PrismaClient } from "@prisma/client";
import { bitcoinDataMax } from "./seeds/bitcoin-max.js";

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ${bitcoinDataMax.length} rows ...`);
  for (const row of bitcoinDataMax) {
    await prisma.pricePointWeekly.create({
      data: {
        date: row.x,
        time: new Date(row.x),
        value: row.y,
      },
    });
  }
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
