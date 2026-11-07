/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the wallet exchange-rate
 * helpers through one port, from `@vitana/core/exchangeRates` (the pure web
 * `src/lib/exchangeRates.ts`). Screen files read these only through this
 * port, never from `@vitana/core` directly (tests/ports.test.ts).
 */
export {
  EUR_PER_USD,
  calculateExchange,
  convertFromUsd,
  convertToUsd,
  formatCurrency,
  getCurrencySymbol,
  getCurrentExchangeRates,
  getExchangeRate,
  type DisplayCurrency,
  type ExchangeCalculation,
  type ExchangeRate,
} from '@vitana/core/exchangeRates';
