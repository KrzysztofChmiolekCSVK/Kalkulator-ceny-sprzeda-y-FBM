const AMAZON_FEE_RATE = 0.15;
const FR_DIGITAL_SERVICES_FEE_RATE = 0.03;
const DIGITAL_SERVICES_FEE_MARKETS = new Set(["FR", "IT", "ES"]);

const VAT_RATES = {
  DE: 0.19,
  FR: 0.2,
  IT: 0.22,
  ES: 0.21,
  NL: 0.21,
  BE: 0.21,
  IE: 0.23,
  UK: 0.2,
  PL: 0.23,
  SE: 0.25,
};

const SHIPPING_RATES = {
  FR: { currency: "EUR", rates: { 1: 5.65, 2: 5.87, 3: 6.31, 5: 9.2, 10: 11.82, 15: 12.85, 25: 12.85, 30: 15.75, 40: 16.54 } },
  ES: { currency: "EUR", rates: { 1: 5.99, 2: 5.99, 3: 6.81, 5: 8.1, 10: 14.73, 15: 19.94, 25: 20.88, 30: 21.34, 40: 29.14 } },
  NL: { currency: "EUR", rates: { 1: 5.0, 2: 5.0, 3: 5.0, 5: 8.07, 10: 8.44, 15: 10.46, 25: 11.8, 30: 12.38, 40: 15.87 } },
  DE: { currency: "EUR", rates: { 1: 3.8, 2: 4.1, 3: 4.1, 5: 5.6, 10: 5.89, 15: 7.18, 25: 7.18, 30: 7.18, 40: 7.18 } },
  SE: { currency: "PLN", rates: { 1: 20.96, 3: 20.96, 5: 24.24, 10: 31.34, 20: 40.4, 30: 46.33 } },
  IT: { currency: "EUR", rates: { 1: 6.21, 2: 6.21, 3: 6.35, 5: 10.41, 10: 10.68, 15: 12.37, 25: 12.37, 30: 12.37, 40: 19.49 } },
  BE: { currency: "EUR", rates: { 1: 4.76, 2: 4.76, 3: 4.76, 5: 8.07, 10: 8.44, 15: 10.46, 25: 11.8, 30: 12.38, 40: 15.87 } },
  IE: { currency: "PLN", rates: { 1: 28.36, 3: 28.36, 5: 28.36, 10: 32.26, 20: 40.77, 30: 47.4 } },
  UK: { currency: "PLN", rates: { 1: 55.46, 3: 55.46, 5: 55.46, 10: 65.18, 20: 79.06, 30: 90.72 } },
  PL: { currency: "PLN", rates: { 1: 10, 2: 10, 3: 10, 5: 10, 10: 10, 15: 10, 20: 10, 25: 10, 30: 10, 40: 10 } },
};

const MARKET_INFO = [
  { code: "DE", name: "Niemcy", currency: "EUR" },
  { code: "FR", name: "Francja", currency: "EUR" },
  { code: "IT", name: "Włochy", currency: "EUR" },
  { code: "ES", name: "Hiszpania", currency: "EUR" },
  { code: "NL", name: "Niderlandy", currency: "EUR" },
  { code: "BE", name: "Belgia", currency: "EUR" },
  { code: "IE", name: "Irlandia", currency: "EUR" },
  { code: "UK", name: "Wielka Brytania", currency: "GBP" },
  { code: "PL", name: "Polska", currency: "PLN" },
  { code: "SE", name: "Szwecja", currency: "SEK" },
];

const WEIGHT_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40];

const inputs = {
  calculationMode: document.querySelector("#calculationMode"),
  targetValue: document.querySelector("#targetValue"),
  weightTier: document.querySelector("#weightTier"),
  productCostPln: document.querySelector("#productCostPln"),
  packingCostPln: document.querySelector("#packingCostPln"),
  otherCostPln: document.querySelector("#otherCostPln"),
  eurRate: document.querySelector("#eurRate"),
  gbpRate: document.querySelector("#gbpRate"),
  sekRate: document.querySelector("#sekRate"),
  upsFuelSurcharge: document.querySelector("#upsFuelSurcharge"),
  upsDeliveryFeePln: document.querySelector("#upsDeliveryFeePln"),
};

const UPS_FUEL_MARKETS = new Set(["UK", "IE", "SE"]);

const resultsBody = document.querySelector("#resultsBody");
const baseCostValue = document.querySelector("#baseCostValue");
const selectedWeightValue = document.querySelector("#selectedWeightValue");
const targetValueLabel = document.querySelector("#targetValueLabel");
const goalSummaryLabel = document.querySelector("#goalSummaryLabel");
const goalSummaryValue = document.querySelector("#goalSummaryValue");

function populateWeightOptions() {
  WEIGHT_OPTIONS.forEach((weight) => {
    const option = document.createElement("option");
    option.value = String(weight);
    option.textContent = `do ${weight} kg`;
    inputs.weightTier.append(option);
  });
  inputs.weightTier.value = "1";
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyForGrossPrice(value, currency, marketCode) {
  if (!Number.isFinite(value)) {
    return "Brak wyniku";
  }

  if (marketCode === "IE" || marketCode === "UK") {
    const symbol = currency === "GBP" ? "GBP" : currency;
    return `${value.toFixed(2)} ${symbol}`;
  }

  return formatCurrency(value, currency);
}

function formatNumberForCopy(value, marketCode) {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (marketCode === "IE" || marketCode === "UK") {
    return value.toFixed(2);
  }
  return value.toFixed(2).replace(".", ",");
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2).replace(".", ",")}%`;
}

function roundUpToX99(value) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }
  const floor = Math.floor(value);
  const candidates = [floor + 0.49, floor + 0.99, floor + 1 + 0.49, floor + 1 + 0.99];
  return candidates.find((candidate) => candidate >= value - Number.EPSILON) ?? Number.NaN;
}

function getNumericValue(input, fallback = 0) {
  const parsed = Number.parseFloat(input.value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function convertPlnToCurrency(plnValue, currency) {
  if (currency === "PLN") {
    return plnValue;
  }
  if (currency === "EUR") {
    return plnValue / getNumericValue(inputs.eurRate, 4.25);
  }
  if (currency === "GBP") {
    return plnValue / getNumericValue(inputs.gbpRate, 4.9);
  }
  if (currency === "SEK") {
    return plnValue / getNumericValue(inputs.sekRate, 0.39);
  }
  return plnValue;
}

function convertCurrency(value, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return value;
  }

  let valueInPln = value;
  if (fromCurrency === "EUR") {
    valueInPln = value * getNumericValue(inputs.eurRate, 4.25);
  } else if (fromCurrency === "GBP") {
    valueInPln = value * getNumericValue(inputs.gbpRate, 4.9);
  } else if (fromCurrency === "SEK") {
    valueInPln = value * getNumericValue(inputs.sekRate, 0.39);
  }

  if (toCurrency === "PLN") {
    return valueInPln;
  }
  if (toCurrency === "EUR") {
    return valueInPln / getNumericValue(inputs.eurRate, 4.25);
  }
  if (toCurrency === "GBP") {
    return valueInPln / getNumericValue(inputs.gbpRate, 4.9);
  }
  if (toCurrency === "SEK") {
    return valueInPln / getNumericValue(inputs.sekRate, 0.39);
  }

  return value;
}

function convertEurToCurrency(eurValue, currency) {
  if (currency === "EUR") {
    return eurValue;
  }
  if (currency === "GBP") {
    return eurValue * getNumericValue(inputs.eurRate, 4.25) / getNumericValue(inputs.gbpRate, 4.9);
  }
  if (currency === "PLN") {
    return eurValue * getNumericValue(inputs.eurRate, 4.25);
  }
  if (currency === "SEK") {
    return (eurValue * getNumericValue(inputs.eurRate, 4.25)) / getNumericValue(inputs.sekRate, 0.39);
  }
  return eurValue;
}

function resolveShippingRate(marketCode, weight) {
  const rateConfig = SHIPPING_RATES[marketCode];
  const availableWeights = Object.keys(rateConfig.rates)
    .map(Number)
    .sort((a, b) => a - b);

  const matchedWeight = availableWeights.find((tier) => weight <= tier);
  if (matchedWeight === undefined) {
    return {
      matchedWeight: null,
      amount: Number.NaN,
      currency: rateConfig.currency,
    };
  }

  let amount = rateConfig.rates[matchedWeight];
  if (UPS_FUEL_MARKETS.has(marketCode)) {
    const fuelRate = getNumericValue(inputs.upsFuelSurcharge, 31.75) / 100;
    const deliveryFeePln = getNumericValue(inputs.upsDeliveryFeePln, 1.15);
    amount = amount + (amount * fuelRate) + deliveryFeePln;
  }

  return {
    matchedWeight,
    amount,
    currency: rateConfig.currency,
  };
}

function calculateMarketRow(market, globalInputs) {
  const vatRate = VAT_RATES[market.code];
  const shipping = resolveShippingRate(market.code, globalInputs.weightTier);
  if (!Number.isFinite(shipping.amount)) {
    return {
      ...market,
      vatRate,
      shippingAmount: Number.NaN,
      shippingTier: shipping.matchedWeight,
      totalCost: Number.NaN,
      grossPrice: Number.NaN,
      netPrice: Number.NaN,
      vatAmount: Number.NaN,
      amazonFee: Number.NaN,
      profit: Number.NaN,
      margin: Number.NaN,
      targetProfit: Number.NaN,
    };
  }

  const baseCostsInMarketCurrency = convertPlnToCurrency(globalInputs.baseCostPln, market.currency);
  const shippingAmountInMarketCurrency = convertCurrency(shipping.amount, shipping.currency, market.currency);
  const totalCost = baseCostsInMarketCurrency + shippingAmountInMarketCurrency;
  const referralFeeRate = AMAZON_FEE_RATE;
  const digitalServicesFeeRate = DIGITAL_SERVICES_FEE_MARKETS.has(market.code)
    ? referralFeeRate * FR_DIGITAL_SERVICES_FEE_RATE
    : 0;
  const totalFeeRate = referralFeeRate + digitalServicesFeeRate;
  const denominatorForProfit = (1 / (1 + vatRate)) - totalFeeRate;
  const denominatorForMargin = ((1 - globalInputs.marginRate) / (1 + vatRate)) - totalFeeRate;
  const denominator = globalInputs.calculationMode === "profit" ? denominatorForProfit : denominatorForMargin;

  if (denominator <= 0) {
    return {
      ...market,
      vatRate,
      shippingAmount: shippingAmountInMarketCurrency,
      shippingTier: shipping.matchedWeight,
      totalCost,
      grossPrice: Number.NaN,
      netPrice: Number.NaN,
      vatAmount: Number.NaN,
      amazonFee: Number.NaN,
      profit: Number.NaN,
      margin: Number.NaN,
    };
  }

  const targetProfit = globalInputs.calculationMode === "profit"
    ? convertEurToCurrency(globalInputs.targetValue, market.currency)
    : 0;
  const rawGrossPrice = (totalCost + targetProfit) / denominator;
  const grossPrice = roundUpToX99(rawGrossPrice);
  const netPrice = grossPrice / (1 + vatRate);
  const vatAmount = grossPrice - netPrice;
  const referralFee = grossPrice * referralFeeRate;
  const digitalServicesFee = grossPrice * digitalServicesFeeRate;
  const amazonFee = referralFee + digitalServicesFee;
  const profit = netPrice - amazonFee - totalCost;
  const margin = netPrice === 0 ? 0 : profit / netPrice;

  return {
    ...market,
    vatRate,
    shippingAmount: shippingAmountInMarketCurrency,
      shippingTier: shipping.matchedWeight,
      totalCost,
      grossPrice,
      netPrice,
      vatAmount,
      amazonFee,
      digitalServicesFee,
      profit,
      margin,
      targetProfit,
    };
}

function renderRows(rows) {
  resultsBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const profitClass = row.profit >= 0 ? "profit-positive" : "profit-negative";
    const marginClass = row.margin >= 0 ? "margin-positive" : "margin-negative";
    const safeValue = (value) => (Number.isFinite(value) ? formatCurrency(value, row.currency) : "Brak wyniku");
    const safePercent = Number.isFinite(row.margin) ? formatPercent(row.margin) : "Brak wyniku";
    const shippingLabel = Number.isFinite(row.shippingAmount)
      ? `${safeValue(row.shippingAmount)} <span class="inline-hint">(do ${row.shippingTier} kg)</span>`
      : "Brak stawki";
    const grossDisplay = Number.isFinite(row.grossPrice)
      ? formatCurrencyForGrossPrice(row.grossPrice, row.currency, row.code)
      : "Brak wyniku";
    const grossCopyValue = formatNumberForCopy(row.grossPrice, row.code);
    const copyButton = Number.isFinite(row.grossPrice)
      ? `<button class="copy-price-button" type="button" data-copy-value="${grossCopyValue}" aria-label="Kopiuj cenę brutto" title="Kopiuj cenę brutto">Copy</button>`
      : "";

    tr.innerHTML = `
      <td class="market-cell"><strong>${row.name}</strong><span>${row.code}</span></td>
      <td>${row.currency}</td>
      <td>${formatPercent(row.vatRate)}</td>
      <td>${shippingLabel}</td>
      <td>${safeValue(row.totalCost)}</td>
      <td>${safeValue(row.netPrice)}</td>
      <td>${safeValue(row.vatAmount)}</td>
      <td class="gross-price-cell"><div class="gross-price-content"><span class="gross-price-value">${grossDisplay}</span>${copyButton}</div></td>
      <td>${safeValue(row.amazonFee)}</td>
      <td class="${profitClass}">${safeValue(row.profit)}</td>
      <td class="${marginClass}">${safePercent}</td>
    `;

    resultsBody.append(tr);
  });
}

function updateSummary(globalInputs) {
  baseCostValue.textContent = formatCurrency(globalInputs.baseCostPln, "PLN");
  selectedWeightValue.textContent = `do ${globalInputs.weightTier} kg`;
  if (globalInputs.calculationMode === "profit") {
    targetValueLabel.textContent = "Docelowy zysk (EUR)";
    goalSummaryLabel.textContent = "Cel kalkulacji";
    goalSummaryValue.textContent = `${formatCurrency(globalInputs.targetValue, "EUR")} zysku`;
  } else {
    targetValueLabel.textContent = "Docelowa marża (%)";
    goalSummaryLabel.textContent = "Cel kalkulacji";
    goalSummaryValue.textContent = formatPercent(globalInputs.marginRate);
  }
}

function render() {
  const globalInputs = {
    calculationMode: inputs.calculationMode.value,
    targetValue: getNumericValue(inputs.targetValue, 10),
    marginRate: getNumericValue(inputs.targetValue, 25) / 100,
    weightTier: getNumericValue(inputs.weightTier, 1),
    baseCostPln:
      getNumericValue(inputs.productCostPln) +
      getNumericValue(inputs.packingCostPln) +
      getNumericValue(inputs.otherCostPln),
  };

  updateSummary(globalInputs);

  const rows = MARKET_INFO.map((market) => calculateMarketRow(market, globalInputs));
  renderRows(rows);
}

populateWeightOptions();
Object.values(inputs).forEach((input) => {
  input.addEventListener("input", render);
  input.addEventListener("change", render);
});

resultsBody.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-price-button");
  if (!button) {
    return;
  }

  const value = button.dataset.copyValue ?? "";
  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    const originalText = button.textContent;
    button.textContent = "Skopiowano";
    setTimeout(() => {
      button.textContent = originalText;
    }, 1200);
  } catch {
    button.textContent = "Blad";
    setTimeout(() => {
      button.textContent = "Kopiuj";
    }, 1200);
  }
});

render();
