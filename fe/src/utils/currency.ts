const DEFAULT_USD_TO_VND_RATE = 25000;

export const getUsdToVndRate = (): number => {
  const raw = import.meta.env.VITE_USD_TO_VND_RATE;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_USD_TO_VND_RATE;
};

export const usdToVnd = (usdAmount: number, rate: number = getUsdToVndRate()): number => {
  const numeric = Number(usdAmount);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * rate);
};

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export const formatVnd = (amountVnd: number): string => {
  const numeric = Number(amountVnd);
  if (!Number.isFinite(numeric)) return vndFormatter.format(0);
  return vndFormatter.format(numeric);
};
