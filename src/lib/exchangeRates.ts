// Exchange rate utilities and mock data
export interface ExchangeRate {
  from: 'USD' | 'VTN' | 'CREDITS';
  to: 'USD' | 'VTN' | 'CREDITS';
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

// Vitana System exchange rates - VTN is growing with system adoption
export const getCurrentExchangeRates = (): ExchangeRate[] => [
  {
    from: 'USD',
    to: 'VTN', 
    rate: 100, // 1 USD = 100 VTN
    trend: 'up',
    change24h: 2.5, // VTN growing due to system adoption
    lastUpdated: new Date()
  },
  {
    from: 'VTN',
    to: 'USD',
    rate: 0.01, // 1 VTN = 0.01 USD
    trend: 'up', 
    change24h: 2.5, // VTN appreciating
    lastUpdated: new Date()
  },
  {
    from: 'VTN',
    to: 'CREDITS',
    rate: 1.0, // 1 VTN = 1 Credit (perfect parity)
    trend: 'up',
    change24h: 1.8, // VTN trending up
    lastUpdated: new Date()
  },
  {
    from: 'CREDITS',
    to: 'VTN', 
    rate: 1.0, // 1 Credit = 1 VTN (perfect parity)
    trend: 'up',
    change24h: 1.8, // Following VTN growth
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
    case 'VTN':
      return `${amount.toFixed(0)} VTN`; // Vitana Tokens
    case 'CREDITS':
      return `${amount.toFixed(0)} Credits`;
    default:
      return `${amount}`;
  }
};

export const getCurrencySymbol = (currency: string): string => {
  switch (currency.toUpperCase()) {
    case 'USD': return '$';
    case 'VTN': return 'VTN'; // Vitana Tokens
    case 'CREDITS': return 'Credits';
    default: return currency;
  }
};