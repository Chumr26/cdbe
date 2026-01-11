const DEFAULT_USD_TO_VND_RATE = 25000;

function getUsdToVndRate() {
  const raw = process.env.USD_TO_VND_RATE;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_USD_TO_VND_RATE;
}

function usdToVnd(usdAmount, rate = getUsdToVndRate()) {
  const numeric = Number(usdAmount);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * rate);
}

module.exports = {
  getUsdToVndRate,
  usdToVnd,
};
