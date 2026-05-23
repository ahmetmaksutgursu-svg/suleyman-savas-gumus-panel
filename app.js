/**
 * ═══════════════════════════════════════════════════
 * app.js – Ana Uygulama Mantığı
 * Süleyman Savaş Gümüş Yatırım Takip Paneli
 * ═══════════════════════════════════════════════════
 */

/* ══════════════════════════════════════════
   1. SABİT YATIRIM BİLGİLERİ
   ══════════════════════════════════════════ */
const INVESTMENT = {
  silverGrams:    20_000,
  silverBuyPrice: 156.00,
  totalCost:      3_120_000,
  buyDate:        '1 Şubat 2026',
  goldBuyFeb:     API.GOLD_BUY_FEB_2026,

  // 1 Şubat 2026 tarihinde döviz alınsaydı kullanılacak satış fiyatları
  usdBuyFeb:      43.42,
  eurBuyFeb:      51.92,
};

// 1 Şub 2026'da 3.120.000 TL ile alınan altın gramı
const GOLD_GRAMS_BOUGHT = INVESTMENT.totalCost / INVESTMENT.goldBuyFeb;
const USD_BOUGHT = INVESTMENT.totalCost / INVESTMENT.usdBuyFeb;
const EUR_BOUGHT = INVESTMENT.totalCost / INVESTMENT.eurBuyFeb;

/* ══════════════════════════════════════════
   2. DURUM (STATE)
   ══════════════════════════════════════════ */
const State = {
  prices:         null,
  countdown:      10,
  intervalId:     null,
  countdownId:    null,
  donutChart:     null,
  barChart:       null,
  lastFetchOk:    null,
  fetchCount:     0,
};

/* ══════════════════════════════════════════
   3. YARDIMCI FONKSİYONLAR
   ══════════════════════════════════════════ */

/** Türkçe para formatı: 3.120.000,00 ₺ */
function fmtTL(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + ' ₺';
}

/** Türkçe sayı: 20.000 */
function fmtNum(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Yüzde formatı: +12,45% */
function fmtPct(value) {
  if (value == null || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return sign + fmtNum(value) + '%';
}

/** Kâr/Zarar CSS sınıfı */
function plClass(value) {
  if (value > 0)  return 'profit';
  if (value < 0)  return 'loss';
  return 'neutral';
}

/** Kâr/Zarar ok simgesi */
function plArrow(value) {
  if (value > 0)  return '▲';
  if (value < 0)  return '▼';
  return '●';
}

/** DOM elementi getir */
const $ = id => document.getElementById(id);

/** Animasyonlu değer güncelleme */
function animateUpdate(el) {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth; // reflow
  el.classList.add('flash');
}

/** Kart shimmer efekti */
function shimmerCard(cardId) {
  const card = $(cardId);
  if (!card) return;
  card.classList.remove('updating');
  void card.offsetWidth;
  card.classList.add('updating');
  setTimeout(() => card.classList.remove('updating'), 700);
}

/** Toast bildirimi */
function showToast(msg, duration = 3000) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/** Kart kâr/zarar rengi güncelle */
function updateCardPL(cardId, value) {
  const card = $(cardId);
  if (!card) return;
  card.classList.remove('card--profit', 'card--loss', 'card--neutral');
  if (value > 0)       card.classList.add('card--profit');
  else if (value < 0)  card.classList.add('card--loss');
}

/* ══════════════════════════════════════════
   4. HESAPLAMA MOTORU
   ══════════════════════════════════════════ */
function calculate(prices) {
  const silverBuy  = prices.silverBuy;
const silverSell = prices.silverSell || prices.silverBuy * 1.045;
const goldBuy    = prices.goldBuy;
const goldSell   = prices.goldSell   || prices.goldBuy   * 1.038;

const usdBuy     = prices.usdBuy;
const usdSell    = prices.usdSell;
const eurBuy     = prices.eurBuy;
const eurSell    = prices.eurSell;

  // ── GÜMÜŞ ──
  const silverCurrentValue = silverBuy * INVESTMENT.silverGrams;
  const silverPL           = silverCurrentValue - INVESTMENT.totalCost;
  const silverPLPct        = (silverPL / INVESTMENT.totalCost) * 100;

  // ── ALTIN ──
  const goldCurrentValue   = goldBuy * GOLD_GRAMS_BOUGHT;
  const goldPL             = goldCurrentValue - INVESTMENT.totalCost;
  const goldPLPct          = (goldPL / INVESTMENT.totalCost) * 100;
   // ── DOLAR ──
const usdCurrentValue = usdBuy * USD_BOUGHT;
const usdPL = usdCurrentValue - INVESTMENT.totalCost;
const usdPLPct = (usdPL / INVESTMENT.totalCost) * 100;

// ── EURO ──
const eurCurrentValue = eurBuy * EUR_BOUGHT;
const eurPL = eurCurrentValue - INVESTMENT.totalCost;
const eurPLPct = (eurPL / INVESTMENT.totalCost) * 100;

  return {
    
  silverBuy, silverSell,
  goldBuy,   goldSell,
  usdBuy,    usdSell,
  eurBuy,    eurSell,

  silverCurrentValue, silverPL, silverPLPct,
  goldCurrentValue,   goldPL,   goldPLPct,

  usdCurrentValue, usdPL, usdPLPct,
  eurCurrentValue, eurPL, eurPLPct,

  goldGramsBought: GOLD_GRAMS_BOUGHT,
  usdAmountBought: USD_BOUGHT,
  eurAmountBought: EUR_BOUGHT,
};
}

/* ══════════════════════════════════════════
   5. KARTLARI GÜNCELLE
   ══════════════════════════════════════════ */
function updateCards(c) {

  // ── Gümüş Değeri ──
  shimmerCard('cardCurrentValue');
  const cvEl = $('currentValue');
  if (cvEl) { cvEl.textContent = fmtTL(c.silverCurrentValue, 0); animateUpdate(cvEl); }
  const cpEl = $('currentValuePerGram');
  if (cpEl) cpEl.textContent = `Gram fiyatı: ${fmtTL(c.silverBuy)} (alış)`;

  // ── Kâr/Zarar ──
  updateCardPL('cardProfitLoss', c.silverPL);
  shimmerCard('cardProfitLoss');
  const plEl = $('profitLossValue');
  if (plEl) {
    plEl.textContent = (c.silverPL >= 0 ? '+' : '') + fmtTL(c.silverPL, 0);
    plEl.className   = `card-value card-value--${plClass(c.silverPL)}`;
    animateUpdate(plEl);
  }
  const plIcon = $('plIcon');
  if (plIcon) plIcon.textContent = plArrow(c.silverPL);
  const plPctEl = $('profitLossPct');
  if (plPctEl) {
    plPctEl.textContent = fmtPct(c.silverPLPct);
    plPctEl.className = c.silverPL >= 0 ? 'text-profit' : 'text-loss';
  }

  // ── Yüzde Kartı ──
  updateCardPL('cardProfitPct', c.silverPL);
  shimmerCard('cardProfitPct');
  const pctBig = $('profitPctBig');
  if (pctBig) {
    pctBig.textContent = fmtPct(c.silverPLPct);
    pctBig.className   = `card-value card-value--${plClass(c.silverPL)}`;
    animateUpdate(pctBig);
  }

  // ── Gümüş Alış/Satış ──
  ['cardSilverBuy', 'cardSilverSell'].forEach(id => shimmerCard(id));
  const sbEl = $('silverBuyPrice');
  if (sbEl) { sbEl.textContent = fmtTL(c.silverBuy); animateUpdate(sbEl); }
  const ssEl = $('silverSellPrice');
  if (ssEl) { ssEl.textContent = fmtTL(c.silverSell); animateUpdate(ssEl); }

  // ── Altın Bölümü ──
  const gaEl = $('goldAmount');
  if (gaEl) {
    gaEl.textContent = fmtNum(c.goldGramsBought, 2) + ' gr';
    animateUpdate(gaEl);
  }
  const gbpEl = $('goldBuyPriceAtDate');
  if (gbpEl) gbpEl.textContent = `Alış fiyatı: ${fmtTL(INVESTMENT.goldBuyFeb)} (1 Şub 2026)`;

  const gcvEl = $('goldCurrentValue');
  if (gcvEl) { gcvEl.textContent = fmtTL(c.goldCurrentValue, 0); animateUpdate(gcvEl); }
  const gcpEl = $('goldCurrentPricePerGram');
  if (gcpEl) gcpEl.textContent = `Güncel altın: ${fmtTL(c.goldBuy)}/gr`;

  // Altın kâr/zarar
  updateCardPL('cardGoldPL', c.goldPL);
  shimmerCard('cardGoldPL');
  const gplEl = $('goldProfitLoss');
  if (gplEl) {
    gplEl.textContent = (c.goldPL >= 0 ? '+' : '') + fmtTL(c.goldPL, 0);
    gplEl.className   = `card-value card-value--${plClass(c.goldPL)}`;
    animateUpdate(gplEl);
  }
  const gpplEl = $('goldProfitPct');
  if (gpplEl) {
    gpplEl.textContent = fmtPct(c.goldPLPct);
    gpplEl.className = c.goldPL >= 0 ? 'text-profit' : 'text-loss';
  }
  const gpiEl = $('goldPlIcon');
  if (gpiEl) gpiEl.textContent = plArrow(c.goldPL);
// ── Dolar Bölümü ──
updateCardPL('cardUsdPL', c.usdPL);
shimmerCard('cardUsdPL');

const usdValEl = $('usdCurrentValue');
if (usdValEl) {
  usdValEl.textContent = fmtTL(c.usdCurrentValue, 0);
  usdValEl.className = `card-value card-value--${plClass(c.usdPL)}`;
  animateUpdate(usdValEl);
}

const usdAmountEl = $('usdAmount');
if (usdAmountEl) {
  usdAmountEl.textContent =
    `${fmtNum(c.usdAmountBought, 2)} USD alındı | Güncel alış: ${fmtTL(c.usdBuy)}`;
}

const usdPlEl = $('usdProfitLoss');
if (usdPlEl) {
  usdPlEl.textContent =
    `Kâr/Zarar: ${(c.usdPL >= 0 ? '+' : '')}${fmtTL(c.usdPL, 0)} (${fmtPct(c.usdPLPct)})`;
  usdPlEl.className = c.usdPL >= 0 ? 'text-profit' : 'text-loss';
}

// ── Euro Bölümü ──
updateCardPL('cardEurPL', c.eurPL);
shimmerCard('cardEurPL');

const eurValEl = $('eurCurrentValue');
if (eurValEl) {
  eurValEl.textContent = fmtTL(c.eurCurrentValue, 0);
  eurValEl.className = `card-value card-value--${plClass(c.eurPL)}`;
  animateUpdate(eurValEl);
}

const eurAmountEl = $('eurAmount');
if (eurAmountEl) {
  eurAmountEl.textContent =
    `${fmtNum(c.eurAmountBought, 2)} EUR alındı | Güncel alış: ${fmtTL(c.eurBuy)}`;
}

const eurPlEl = $('eurProfitLoss');
if (eurPlEl) {
  eurPlEl.textContent =
    `Kâr/Zarar: ${(c.eurPL >= 0 ? '+' : '')}${fmtTL(c.eurPL, 0)} (${fmtPct(c.eurPLPct)})`;
  eurPlEl.className = c.eurPL >= 0 ? 'text-profit' : 'text-loss';
}
  // ── Kazanan ──
  updateWinner(c);

  // ── Karşılaştırma Tablosu ──
  updateTable(c);
}

/* ══════════════════════════════════════════
   6. KAZANAN BÖLÜMÜ
   ══════════════════════════════════════════ */
function updateWinner(c) {
  const wName = $('winnerName');
  const wDiff = $('winnerDiff');
  if (!wName || !wDiff) return;

  const investments = [
    {
      name: 'Gümüş',
      icon: '⬡',
      profit: c.silverPL,
      className: 'silver-win',
    },
    {
      name: 'Altın',
      icon: '✦',
      profit: c.goldPL,
      className: 'gold-win',
    },
    {
      name: 'Dolar',
      icon: '$',
      profit: c.usdPL,
      className: 'silver-win',
    },
    {
      name: 'Euro',
      icon: '€',
      profit: c.eurPL,
      className: 'gold-win',
    },
  ];

  investments.sort((a, b) => b.profit - a.profit);

  const winner = investments[0];
  const second = investments[1];
  const diff = winner.profit - second.profit;

  wName.textContent = `${winner.icon} ${winner.name}`;
  wName.className = `winner-name ${winner.className}`;

  if (Math.abs(diff) < 100) {
    wDiff.textContent = 'Yatırımlar birbirine çok yakın performans gösteriyor';
  } else {
    wDiff.textContent = `En yakın alternatife göre ${fmtTL(diff, 0)} daha fazla kâr`;
  }
}

/* ══════════════════════════════════════════
   7. TABLO GÜNCELLEME
   ══════════════════════════════════════════ */
function updateTable(c) {
  const set = (id, val, pClass) => {
    const el = $(id);
    if (!el) return;
    el.textContent = val;
    if (pClass) {
      el.classList.remove('text-profit', 'text-loss', 'text-neutral');
      el.classList.add(pClass === 'profit' ? 'text-profit' : pClass === 'loss' ? 'text-loss' : '');
    }
  };

  set('tblGoldGrams',         fmtNum(c.goldGramsBought, 2) + ' gr');
  set('tblGoldBuyPrice',      fmtTL(INVESTMENT.goldBuyFeb));
  set('tblSilverCurrentPrice',fmtTL(c.silverBuy));
  set('tblGoldCurrentPrice',  fmtTL(c.goldBuy));
  set('tblSilverCurrentValue',fmtTL(c.silverCurrentValue, 0));
  set('tblGoldCurrentValue',  fmtTL(c.goldCurrentValue, 0));

  const splText = (c.silverPL >= 0 ? '+' : '') + fmtTL(c.silverPL, 0);
  const gplText = (c.goldPL   >= 0 ? '+' : '') + fmtTL(c.goldPL,   0);
  set('tblSilverPL',  splText, plClass(c.silverPL));
  set('tblGoldPL',    gplText, plClass(c.goldPL));
  set('tblSilverPct', fmtPct(c.silverPLPct), plClass(c.silverPL));
  set('tblGoldPct',   fmtPct(c.goldPLPct),   plClass(c.goldPL));
}

/* ══════════════════════════════════════════
   8. DURUM ÇUBUĞU
   ══════════════════════════════════════════ */
function updateStatus(prices, ok) {
  const dot   = $('statusDot');
  const label = $('statusLabel');
  const upd   = $('lastUpdate');
  const src   = $('dataSourceStatus');

  const now = new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  if (!ok) {
    if (dot)   { dot.className = 'status-dot offline'; }
    if (label) label.textContent = 'Veri alınamadı';
    if (src)   src.textContent = 'Veri alınamadı, tekrar deneniyor...';
    return;
  }

  const sourceLabels = {
    'halkbank-live': { dot: 'online',  label: 'Canlı Bağlantı',  src: 'Halkbank – Canlı veri' },
    'simulated':     { dot: 'loading', label: 'Simülasyon Modu', src: '⚠ Proxy ulaşılamadı – simülasyon aktif' },
  };
  const info = sourceLabels[prices.source] || { dot: 'loading', label: 'Önbellekten', src: 'Önbellek verisi' };

  if (prices.stale)     info.src = '⚠ Önbellekten (güncel veri alınamadı)';
  if (prices.fromCache) info.src = 'Halkbank – Önbellekten (güncel)';

  if (dot)   dot.className = `status-dot ${info.dot}`;
  if (label) label.textContent = info.label;
  if (upd)   upd.textContent  = `Son güncelleme: ${now}`;
  if (src)   src.textContent  = info.src;

  State.lastFetchOk = new Date();
}

/* ══════════════════════════════════════════
   9. GRAFİKLER
   ══════════════════════════════════════════ */
const CHART_DEFAULTS = {
  responsive:          true,
  maintainAspectRatio: true,
  animation:           { duration: 500, easing: 'easeInOutQuart' },
  plugins: {
    legend: {
      labels: { color: '#7d8fa3', font: { family: 'Inter', size: 12 } }
    },
    tooltip: {
      backgroundColor: 'rgba(5,12,26,0.95)',
      borderColor:     'rgba(255,255,255,0.1)',
      borderWidth:     1,
      titleColor:      '#e8ecf0',
      bodyColor:       '#b8c4d0',
      padding:         12,
      callbacks: {
        label: ctx => {
          const val = ctx.parsed.y ?? ctx.parsed;
          if (typeof val === 'number') {
            return ' ' + val.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';
          }
          return val;
        }
      }
    }
  }
};

function initDonutChart() {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;

  State.donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Maliyet', 'Kâr/Zarar'],
      datasets: [{
        data:            [INVESTMENT.totalCost, 0],
        backgroundColor: ['rgba(192,202,214,0.15)', 'rgba(0,229,160,0.4)'],
        borderColor:     ['rgba(192,202,214,0.3)',  'rgba(0,229,160,0.7)'],
        borderWidth:     2,
        hoverOffset:     6,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      cutout:          '72%',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: ctx => {
              const val = ctx.parsed;
              return ' ' + val.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';
            }
          }
        }
      }
    }
  });
}

function initBarChart() {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;

  State.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Gümüş', 'Altın'],
      datasets: [{
        label:           'Kâr / Zarar (₺)',
        data:            [0, 0],
        backgroundColor: [
          'rgba(192,202,214,0.3)',
          'rgba(245,200,66,0.3)',
        ],
        borderColor: [
          'rgba(192,202,214,0.8)',
          'rgba(245,200,66,0.8)',
        ],
        borderWidth:  2,
        borderRadius: 8,
        hoverBackgroundColor: [
          'rgba(192,202,214,0.5)',
          'rgba(245,200,66,0.5)',
        ],
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      aspectRatio: 2.5,
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: { color: '#7d8fa3', font: { family: 'Inter', size: 12 } }
        },
        y: {
          grid:  { color: 'rgba(255,255,255,0.06)', drawBorder: false },
          ticks: {
            color: '#7d8fa3',
            font:  { family: 'Inter', size: 11 },
            callback: val => val.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺'
          }
        }
      },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: false },
      }
    }
  });
}

function updateCharts(c) {
  // Halka grafik
  if (State.donutChart) {
    const profit = Math.abs(c.silverPL);
    const isLoss = c.silverPL < 0;

    State.donutChart.data.datasets[0].data = [
      INVESTMENT.totalCost,
      profit,
    ];
    State.donutChart.data.datasets[0].backgroundColor[1] = isLoss
      ? 'rgba(255,77,106,0.4)'
      : 'rgba(0,229,160,0.4)';
    State.donutChart.data.datasets[0].borderColor[1] = isLoss
      ? 'rgba(255,77,106,0.7)'
      : 'rgba(0,229,160,0.7)';
    State.donutChart.update();

    // Merkez metin
    const dvEl = $('donutValue');
    if (dvEl) {
      dvEl.textContent = fmtPct(c.silverPLPct);
      dvEl.className   = 'donut-value ' + (isLoss ? 'text-loss' : 'text-profit');
    }
  }

  // Bar grafik
  if (State.barChart) {
    const isLossS = c.silverPL < 0;
    const isLossG = c.goldPL   < 0;

    State.barChart.data.datasets[0].data = [c.silverPL, c.goldPL];
    State.barChart.data.datasets[0].backgroundColor = [
      isLossS ? 'rgba(255,77,106,0.3)'  : 'rgba(192,202,214,0.3)',
      isLossG ? 'rgba(255,77,106,0.3)'  : 'rgba(245,200,66,0.3)',
    ];
    State.barChart.data.datasets[0].borderColor = [
      isLossS ? 'rgba(255,77,106,0.8)'  : 'rgba(192,202,214,0.8)',
      isLossG ? 'rgba(255,77,106,0.8)'  : 'rgba(245,200,66,0.8)',
    ];
    State.barChart.update();
  }
}

/* ══════════════════════════════════════════
   10. GERİ SAYIM SAYACI
   ══════════════════════════════════════════ */
function startCountdown() {
  State.countdown = 10;
  updateCountdownDisplay();

  clearInterval(State.countdownId);
  State.countdownId = setInterval(() => {
    State.countdown--;
    updateCountdownDisplay();
    if (State.countdown <= 0) {
      State.countdown = 10;
    }
  }, 1000);
}

function updateCountdownDisplay() {
  const el = $('countdown');
  if (el) el.textContent = State.countdown;
}

/* ══════════════════════════════════════════
   11. ANA VERİ GÜNCELLEME DÖNGÜSÜ
   ══════════════════════════════════════════ */
async function refresh() {
  State.fetchCount++;

  let prices, ok;
  try {
    prices = await API.fetchPrices();
    ok     = true;
  } catch (err) {
    console.error('[App] Veri çekme hatası:', err);
    ok = false;
  }

  updateStatus(prices, ok);

  if (ok && prices) {
    State.prices = prices;
    const calc = calculate(prices);
    updateCards(calc);
    updateCharts(calc);

    if (prices.simulated && State.fetchCount === 1) {
      showToast('⚠ Halkbank\'a ulaşılamadı. Gerçekçi simülasyon verisi kullanılıyor.');
    } else if (prices.source === 'halkbank-live' && State.fetchCount === 1) {
      showToast('✓ Halkbank verileri başarıyla yüklendi.');
    }
  }

  startCountdown();
}

/* ══════════════════════════════════════════
   12. UYGULAMA BAŞLATMA
   ══════════════════════════════════════════ */
function init() {
  // Grafikleri başlat
  initDonutChart();
  initBarChart();

  // İlk veri çekimi
  refresh();

  // 10 saniyede bir otomatik yenileme
  State.intervalId = setInterval(refresh, 10_000);

  // Sekme odaklanınca yenile
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
}

// DOM hazır olduğunda başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
