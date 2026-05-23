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

function parseCanliDoviz(html) {
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

    const joinedOriginal = cells.join(" ");
    const joined = joinedOriginal.toLowerCase();

    const numbers = getNumbersFromCells(cells);

    // CanlıDöviz Halkbank altın sayfasında Gram Altın satırı: GA Gram Altın ...
    if (
      (joined.includes("gram altın") ||
        joined.includes("gram altin") ||
        joined.includes(" ga ")) &&
      numbers.length >= 2
    ) {
      goldBuy = numbers[0];
      goldSell = numbers[1];
    }

    // CanlıDöviz Halkbank altın sayfasında Gümüş satırı: GAG Gümüş ...
    if (
      (joined.includes("gümüş") || joined.includes("gumus")) &&
      numbers.length >= 2
    ) {
      silverBuy = numbers[0];
      silverSell = numbers[1];
    }
  });

  if (!silverBuy || !silverSell || !goldBuy || !goldSell) {
    throw new Error(
      "CanlıDöviz Halkbank sayfasından gümüş/altın fiyatları okunamadı."
    );
  }

  return {
    silverBuy,
    silverSell,
    goldBuy,
    goldSell,
    source: "halkbank-live",
    provider: "canlidoviz-halkbank",
    updatedAt: new Date().toISOString(),
  };
}

app.get("/api/halkbank", async (req, res) => {
  try {
    const response = await axios.get(CANLI_DOVIZ_HALKBANK_ALTIN_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
      timeout: 10000,
    });

    const prices = parseCanliDoviz(response.data);
    res.json(prices);
  } catch (error) {
    console.error("CanlıDöviz veri hatası:", error.message);

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