// Exchange rate utilities and mock data
export interface ExchangeRate {
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

// Vitana System exchange rates - VTNA tokens are growing with system adoption
export const getCurrentExchangeRates = (): ExchangeRate[] => [
  {
    from: 'USD',
    to: 'VTNA', 
    rate: 100, // 1 USD = 100 VTNA
    trend: 'up',
    change24h: 2.5, // VTNA growing due to system adoption
    lastUpdated: new Date()
  },
  {
    from: 'VTNA',
    to: 'USD',
    rate: 0.01, // 1 VTNA = 0.01 USD
    trend: 'up', 
    change24h: 2.5, // VTNA appreciating
    lastUpdated: new Date()
  },
  {
    from: 'VTNA',
    to: 'CREDITS',
    rate: 1.0, // 1 VTNA = 1 Credit (perfect parity)
    trend: 'up',
    change24h: 1.8, // VTNA trending up
    lastUpdated: new Date()
  },
  {
    from: 'CREDITS',
    to: 'VTNA', 
    rate: 1.0, // 1 Credit = 1 VTNA (perfect parity)
    trend: 'up',
    change24h: 1.8, // Following VTNA growth
    lastUpdated: new Date()
  },
  {
    from: 'USD',
    to: 'CREDITS',
    rate: 100, // 1 USD = 100 Credits
    trend: 'up',
    change24h: 2.2, // Credits growing with USD/VTN
    lastUpdated: new Date()
  },
  {
    from: 'CREDITS',
    to: 'USD',
    rate: 0.01, // 1 Credit = 0.01 USD
    trend: 'up',
    change24h: 2.2,
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
    case 'VTNA':
      return `${amount.toFixed(0)} VTNA`; // Vitana Tokens
    case 'CREDITS':
      return `${amount.toFixed(0)} Credits`;
    default:
      return `${amount}`;
  }
};

export const getCurrencySymbol = (currency: string): string => {
  switch (currency.toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'VTNA': return 'VTNA'; // Vitana Tokens
    case 'CREDITS': return 'Credits';
    default: return currency;
  }
};

// Cash display currencies the wallet can toggle between. Balances are stored
// in USD; EUR is a presentation-only conversion using the fixed rate below.
export type DisplayCurrency = 'USD' | 'EUR';

// Fixed EUR per 1 USD used for the wallet's display toggle. This is a static
// display rate (not a live market quote) — update here when it should change,
// or swap for a real FX feed later.
export const EUR_PER_USD = 0.92;

// Convert a USD-denominated amount into the chosen display currency.
export const convertFromUsd = (usdAmount: number, to: DisplayCurrency): number =>
  to === 'EUR' ? usdAmount * EUR_PER_USD : usdAmount;