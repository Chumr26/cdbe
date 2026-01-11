import i18n from '../i18n';

export type CurrencyCode = 'USD' | 'VND';

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

export const vndToUsd = (vndAmount: number, rate: number = getUsdToVndRate()): number => {
  const numeric = Number(vndAmount);
  if (!Number.isFinite(numeric)) return 0;
  return numeric / rate;
};

const localeFromLanguage = (lng?: string): string => {
  const lang = (lng ?? i18n.language ?? 'vi').toLowerCase();
  if (lang.startsWith('vi')) return 'vi-VN';
  if (lang.startsWith('en')) return 'en-US';
  return lang;
};

// Product prices are stored in USD (backend convention), but carts/orders are stored in VND.
// We display currency based on UI language: English => USD, otherwise => VND.
export const getDisplayCurrency = (lng?: string): CurrencyCode => {
  const lang = (lng ?? i18n.language ?? 'vi').toLowerCase();
  return lang.startsWith('en') ? 'USD' : 'VND';
};

export const convertCurrency = (
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number = getUsdToVndRate()
): number => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 0;
  if (from === to) return numeric;
  if (from === 'USD' && to === 'VND') return usdToVnd(numeric, rate);
  if (from === 'VND' && to === 'USD') return vndToUsd(numeric, rate);
  return numeric;
};

const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (locale: string, currency: CurrencyCode) => {
  const key = `${locale}|${currency}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  });
  formatterCache.set(key, formatter);
  return formatter;
};

export const formatMoney = (
  amount: number,
  fromCurrency: CurrencyCode,
  opts?: { lng?: string; toCurrency?: CurrencyCode; rate?: number }
): string => {
  const toCurrency = opts?.toCurrency ?? getDisplayCurrency(opts?.lng);
  const locale = localeFromLanguage(opts?.lng);
  const rate = opts?.rate ?? getUsdToVndRate();
  const converted = convertCurrency(amount, fromCurrency, toCurrency, rate);
  const formatter = getFormatter(locale, toCurrency);
  return formatter.format(converted);
};

// Backward-compatible helper: formats a VND amount as VND (no conversion).
const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export const formatVnd = (amountVnd: number): string => {
  const numeric = Number(amountVnd);
  if (!Number.isFinite(numeric)) return vndFormatter.format(0);
  return vndFormatter.format(numeric);
};
