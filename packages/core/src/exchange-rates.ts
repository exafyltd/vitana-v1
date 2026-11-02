/**
 * VTID-05511 — exchange-rate helpers (src/lib/exchangeRates.ts). Pure, IO-free:
 * the fixed CREDITS/USD rate table, getExchangeRate and formatCurrency. The
 * native BookingPaymentFlow twin (provider booking) prices the Credits and USD
 * wallet options with them exactly as the web dialog does.
 */
export * from '@/lib/exchangeRates';
