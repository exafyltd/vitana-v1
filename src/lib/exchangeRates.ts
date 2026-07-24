// Exchange rate utilities and mock data
export interface ExchangeRate {
  // 'VTNA' kept in the union for historical transaction rows written before
  // the VTNA/Credits merge — no live rate pair uses it below.
  from: 'USD' | 'VTNA' | 'CREDITS';
  to: 'USD' | 'VTNA' | 'CREDITS';
  rate: number;
  trend: 'up' | 'down' | 'stable';
  change24h: number; // percentage
  lastUpdated: Date;
}

export interface ExchangeCalculation {
  fromAmount: number;
  toAmount: number;
  rate: number;
  fees: number;
  total: number;
  fromCurrency: string;
  toCurrency: string;
}

// Vitana System exchange rates. VTNA Credits is a closed-loop, non-withdrawable
// utility balance — fixed 1:1-with-USD-cents parity, no appreciation/trend
// narrative (that framing previously triggered an Apple 3.1.5(iii) rejection
// for looking like a speculative token; see DATABASE_SCHEMA.md wallet section).
export const getCurrentExchangeRates = (): ExchangeRate[] => [
  {
    from: 'USD',
    to: 'CREDITS',
    rate: 100, // 1 USD = 100 VTNA Credits
    trend: 'stable',
    change24h: 0,
    lastUpdated: new Date()
  },
  {
    from: 'CREDITS',
    to: 'USD',
    rate: 0.01, // 1 VTNA Credit = 0.01 USD
    trend: 'stable',
    change24h: 0,
    lastUpdated: new Date()
  }
];

export const getExchangeRate = (from: string, to: string): ExchangeRate | null => {
  const rates = getCurrentExchangeRates();
  return rates.find(rate => 
    rate.from === from.toUpperCase() && rate.to === to.toUpperCase()
  ) || null;
};

export const calculateExchange = (
  fromAmount: number,
  fromCurrency: string, 
  toCurrency: string
): ExchangeCalculation | null => {
  const rate = getExchangeRate(fromCurrency, toCurrency);
  
  if (!rate || fromAmount <= 0) {
    return null;
  }
  
  const toAmount = fromAmount * rate.rate;
  const fees = 0; // No fees in Vitana System
  const total = toAmount; // No fee deduction
  
  return {
    fromAmount,
    toAmount: Math.round(total * 100) / 100,
    rate: rate.rate,
    fees: Math.round(fees * 100) / 100,
    total: Math.round(total * 100) / 100,
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase()
  };
};

export const formatCurrency = (amount: number, currency: string): string => {
  switch (currency.toUpperCase()) {
    case 'USD':
      return `$${amount.toFixed(2)}`;
    case 'EUR':
      return `€${amount.toFixed(2)}`;
    // Legacy VTNA transaction rows display the same way as VTNA Credits.
    case 'VTNA':
    case 'CREDITS':
      return `${amount.toFixed(0)} VTNA Credits`;
    default:
      return `${amount}`;
  }
};

export const getCurrencySymbol = (currency: string): string => {
  switch (currency.toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'VTNA':
    case 'CREDITS': return 'VTNA Credits';
    default: return currency;
  }
};

// Cash display currencies the wallet can toggle between. Balances are stored
// in USD; EUR is a presentation-only conversion using the live FX rate (see
// useEurUsdRate), falling back to EUR_PER_USD when no live rate is available.
export type DisplayCurrency = 'USD' | 'EUR';

// Fallback EUR per 1 USD, used only when the live FX rate hasn't loaded yet or
// the FX request fails. Keep roughly in line with recent market rates.
export const EUR_PER_USD = 0.92;

// Convert a USD-denominated amount into the chosen display currency, using the
// supplied EUR/USD rate (defaults to the static fallback above).
export const convertFromUsd = (
  usdAmount: number,
  to: DisplayCurrency,
  eurPerUsd: number = EUR_PER_USD,
): number => (to === 'EUR' ? usdAmount * eurPerUsd : usdAmount);

// Inverse of convertFromUsd: turn an amount entered in the display currency
// back into USD (the currency balances are actually stored in).
export const convertToUsd = (
  amount: number,
  from: DisplayCurrency,
  eurPerUsd: number = EUR_PER_USD,
): number => (from === 'EUR' ? amount / eurPerUsd : amount);