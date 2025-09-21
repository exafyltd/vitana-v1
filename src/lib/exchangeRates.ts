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

// Mock exchange rates - in real app this would come from an API
export const getCurrentExchangeRates = (): ExchangeRate[] => [
  {
    from: 'USD',
    to: 'VTN', 
    rate: 2.45, // 1 USD = 2.45 VTN
    trend: 'up',
    change24h: 1.2,
    lastUpdated: new Date()
  },
  {
    from: 'VTN',
    to: 'USD',
    rate: 0.408, // 1 VTN = 0.408 USD
    trend: 'up', 
    change24h: -1.2,
    lastUpdated: new Date()
  },
  {
    from: 'VTN',
    to: 'CREDITS',
    rate: 1.05, // 1 VTN = 1.05 Credits (5% bonus)
    trend: 'stable',
    change24h: 0,
    lastUpdated: new Date()
  },
  {
    from: 'CREDITS',
    to: 'VTN', 
    rate: 0.952, // 1 Credit = 0.952 VTN
    trend: 'stable',
    change24h: 0,
    lastUpdated: new Date()
  },
  {
    from: 'USD',
    to: 'CREDITS',
    rate: 2.57, // 1 USD = 2.57 Credits (via VTN conversion)
    trend: 'up',
    change24h: 1.2,
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
  const fees = fromAmount * 0.01; // 1% fee
  const total = toAmount - (fees * rate.rate); // Convert fee to target currency
  
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
      return `${amount.toFixed(0)} VTN`;
    case 'CREDITS':
      return `${amount.toFixed(0)} Credits`;
    default:
      return `${amount}`;
  }
};

export const getCurrencySymbol = (currency: string): string => {
  switch (currency.toUpperCase()) {
    case 'USD': return '$';
    case 'VTN': return 'VTN';
    case 'CREDITS': return 'Credits';
    default: return currency;
  }
};