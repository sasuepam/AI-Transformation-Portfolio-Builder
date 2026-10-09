export type Currency = 'USD' | 'GBP' | 'EUR';

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { code: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  { code: 'EUR', label: 'Euro (EUR)', symbol: '€' },
];

// Approximate rates vs USD — clearly approximate, no live FX
const USD_TO: Record<Currency, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
};

export function symbolFor(c: Currency): string {
  return CURRENCIES.find((x) => x.code === c)?.symbol ?? '$';
}

/** Convert a USD amount to the target currency */
export function fromUSD(amount: number, to: Currency): number {
  return Math.round(amount * USD_TO[to]);
}

export const CURRENCY_STORAGE_KEY = 'aiPortfolio_currency';

export function loadCurrency(): Currency | null {
  try {
    const v = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (v === 'USD' || v === 'GBP' || v === 'EUR') return v;
  } catch {}
  return null;
}

export function saveCurrency(c: Currency) {
  try { localStorage.setItem(CURRENCY_STORAGE_KEY, c); } catch {}
}
