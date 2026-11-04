/**
 * VTID-05422 — wallet exchange-rate helpers (src/lib/exchangeRates.ts). Pure,
 * IO-free, no imports: the fixed USD <-> VTNA Credits pair, exchange quotes,
 * currency symbols and the USD <-> EUR display conversion. The native wallet
 * hub and balance screens use them the same way the web does.
 */
export * from '@/lib/exchangeRates';
