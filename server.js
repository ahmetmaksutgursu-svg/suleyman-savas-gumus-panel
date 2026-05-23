const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3001;

const CANLI_DOVIZ_HALKBANK_ALTIN_URL =
  "https://canlidoviz.com/altin-fiyatlari/halkbank";

const CANLI_DOVIZ_HALKBANK_DOVIZ_URL =
  "https://canlidoviz.com/doviz-kurlari/halkbank";

function parseTrNum(str) {
  if (!str) return null;

  const cleaned = String(str)
    .replace(/₺/g, "")
    .replace(/TL/g, "")
    .replace(/TRY/g, "")
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }

  return Number(cleaned);
}

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function getNumbersFromCells(cells) {
  return cells
    .map(parseTrNum)
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseAltinGumus(html) {
  const $ = cheerio.load(html);

  let goldBuy = null;
  let goldSell = null;
  let silverBuy = null;
  let silverSell = null;

  $("tr").each((i, row) => {
    const cells = [];

    $(row)
      .find("td, th")
      .each((j, cell) => {
        cells.push(cleanText($(cell).text()));
      });

    const joined = cells.join(" ").toLowerCase();
    const numbers = getNumbersFromCells(cells);

    if (
      (joined.includes("gram altın") ||
        joined.includes("gram altin") ||
        joined.includes(" ga ")) &&
      numbers.length >= 2
    ) {
      goldBuy = numbers[0];
      goldSell = numbers[1];
    }

    if (
      (joined.includes("gümüş") || joined.includes("gumus")) &&
      numbers.length >= 2
    ) {
      silverBuy = numbers[0];
      silverSell = numbers[1];
    }
  });

  if (!silverBuy || !silverSell || !goldBuy || !goldSell) {
    throw new Error("Altın/gümüş fiyatları okunamadı.");
  }

  return {
    silverBuy,
    silverSell,
    goldBuy,
    goldSell,
  };
}

function parseDolarEuro(html) {
  const $ = cheerio.load(html);

  let usdBuy = null;
  let usdSell = null;
  let eurBuy = null;
  let eurSell = null;

  $("tr").each((i, row) => {
    const cells = [];

    $(row)
      .find("td, th")
      .each((j, cell) => {
        cells.push(cleanText($(cell).text()));
      });

    const joined = cells.join(" ").toLowerCase();
    const numbers = getNumbersFromCells(cells);

    if (
      !usdBuy &&
      (joined.includes("amerikan doları") ||
        joined.includes("abd doları") ||
        joined.includes("usd") ||
        joined.includes("dolar")) &&
      numbers.length >= 2
    ) {
      usdBuy = numbers[0];
      usdSell = numbers[1];
    }

    if (
      !eurBuy &&
      (joined.includes("euro") ||
        joined.includes("avro") ||
        joined.includes("eur")) &&
      numbers.length >= 2
    ) {
      eurBuy = numbers[0];
      eurSell = numbers[1];
    }
  });

  if (!usdBuy || !usdSell || !eurBuy || !eurSell) {
    throw new Error("Dolar/euro fiyatları okunamadı.");
  }

  return {
    usdBuy,
    usdSell,
    eurBuy,
    eurSell,
  };
}

app.get("/api/halkbank", async (req, res) => {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    };

    const [altinResponse, dovizResponse] = await Promise.all([
      axios.get(CANLI_DOVIZ_HALKBANK_ALTIN_URL, {
        headers,
        timeout: 10000,
      }),
      axios.get(CANLI_DOVIZ_HALKBANK_DOVIZ_URL, {
        headers,
        timeout: 10000,
      }),
    ]);

    const metalPrices = parseAltinGumus(altinResponse.data);
    const currencyPrices = parseDolarEuro(dovizResponse.data);

    res.json({
      ...metalPrices,
      ...currencyPrices,
      source: "halkbank-live",
      provider: "canlidoviz-halkbank",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Veri hatası:", error.message);

    res.status(500).json({
      error: true,
      message: "CanlıDöviz Halkbank verisi alınamadı.",
      detail: error.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Site çalışıyor: http://localhost:${PORT}`);
  console.log(`API çalışıyor: http://localhost:${PORT}/api/halkbank`);
});
