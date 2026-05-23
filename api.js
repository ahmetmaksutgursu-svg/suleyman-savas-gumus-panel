const API = (() => {
  const LOCAL_API_URL = "/api/halkbank";

  function parseTrNum(str) {
    if (!str) return null;

    const cleaned = String(str)
      .replace(/₺/g, "")
      .replace(/TL/g, "")
      .replace(/\s/g, "")
      .trim();

    if (cleaned.includes(",")) {
      return Number(cleaned.replace(/\./g, "").replace(",", "."));
    }

    return Number(cleaned);
  }

  async function fetchPrices() {
    const response = await fetch(LOCAL_API_URL + "?t=" + Date.now(), {
      method: "GET",
      cache: "no-store",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error("Backend üzerinden fiyat verisi alınamadı.");
    }

    const data = await response.json();

    console.log("Gelen veri:", data);

    if (
      data.error ||
      !Number.isFinite(Number(data.silverBuy)) ||
      !Number.isFinite(Number(data.silverSell)) ||
      !Number.isFinite(Number(data.goldBuy)) ||
      !Number.isFinite(Number(data.goldSell)) ||
      !Number.isFinite(Number(data.usdBuy)) ||
      !Number.isFinite(Number(data.usdSell)) ||
      !Number.isFinite(Number(data.eurBuy)) ||
      !Number.isFinite(Number(data.eurSell))
    ) {
      throw new Error("Eksik veya hatalı fiyat verisi geldi.");
    }

    return {
      silverBuy: Number(data.silverBuy),
      silverSell: Number(data.silverSell),
      goldBuy: Number(data.goldBuy),
      goldSell: Number(data.goldSell),

      usdBuy: Number(data.usdBuy),
      usdSell: Number(data.usdSell),
      eurBuy: Number(data.eurBuy),
      eurSell: Number(data.eurSell),

      source: "halkbank-live",
      provider: data.provider || "canlidoviz-halkbank",
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  const GOLD_BUY_FEB_2026 = 7215.04;

  return {
    fetchPrices,
    GOLD_BUY_FEB_2026,
    parseTrNum,
  };
})();
