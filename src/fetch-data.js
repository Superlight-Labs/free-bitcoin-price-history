import axios from "axios";
import { app } from "../index.js";

export const fetchInterval = async (days = 365, latest) => {
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=${days}&precision=2`
  );

  app.log.debug(
    { data: Object.keys(res.data), latest, days },
    "Fetching latest pricepoint..."
  );

  const priceData = res.data.prices;

  if (!priceData || priceData.length === 0) {
    app.log.warn({ data: res.data }, "No price data found");
    return [];
  }

  return priceData
    .slice(0, priceData.length - 1)
    .map(([timeInMs, value]) => {
      const time = new Date(timeInMs);
      return {
        date: time.toLocaleDateString("en-US"),
        value,
        time,
      };
    })
    .filter(({ time }) => !latest || time > latest.time);
};

export const fetchNow = async () => {
  const res = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&precision=2"
  );

  const { bitcoin } = res.data;

  const now = new Date();

  return {
    date: now.toLocaleDateString("en-US"),
    value: bitcoin.eur,
  };
};
