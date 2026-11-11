/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the pure `exchangeRates`
 * helper (web `src/lib/exchangeRates.ts`, class A) reaches the native app
 * through `@vitana/core/exchangeRates` and the wallet port. Deterministic
 * fields are asserted exactly; `lastUpdated` is `new Date()` on every call
 * (plan sparring R1-F4), so it is asserted with `expect.any(Date)`.
 */
import '../helpers/no-network';
import {
  EUR_PER_USD,
  calculateExchange,
  convertFromUsd,
  convertToUsd,
  formatCurrency,
  getCurrencySymbol,
  getCurrentExchangeRates,
  getExchangeRate,
} from '../../src/ports/wallet';

describe('exchangeRates through @vitana/core', () => {
  it('getCurrentExchangeRates: the fixed USD <-> CREDITS pair, lastUpdated a fresh Date', () => {
    expect(getCurrentExchangeRates()).toEqual([
      { from: 'USD', to: 'CREDITS', rate: 100, trend: 'stable', change24h: 0, lastUpdated: expect.any(Date) },
      { from: 'CREDITS', to: 'USD', rate: 0.01, trend: 'stable', change24h: 0, lastUpdated: expect.any(Date) },
    ]);
  });

  it('getExchangeRate matches case-insensitively and returns null for an unknown pair', () => {
    expect(getExchangeRate('usd', 'credits')).toMatchObject({ rate: 100 });
    expect(getExchangeRate('CREDITS', 'USD')).toMatchObject({ rate: 0.01 });
    expect(getExchangeRate('USD', 'VTNA')).toBeNull();
  });

  it('calculateExchange: no fees, rounded to cents; null for a non-positive amount or unknown pair', () => {
    expect(calculateExchange(12.345, 'usd', 'credits')).toEqual({
      fromAmount: 12.345,
      toAmount: 1234.5,
      rate: 100,
      fees: 0,
      total: 1234.5,
      fromCurrency: 'USD',
      toCurrency: 'CREDITS',
    });
    expect(calculateExchange(0, 'USD', 'CREDITS')).toBeNull();
    expect(calculateExchange(5, 'USD', 'EUR')).toBeNull();
  });

  it('convertFromUsd / convertToUsd: EUR uses the supplied rate (default EUR_PER_USD), USD is identity', () => {
    expect(EUR_PER_USD).toBe(0.92);
    expect(convertFromUsd(100, 'USD')).toBe(100);
    expect(convertFromUsd(100, 'EUR')).toBeCloseTo(92);
    expect(convertFromUsd(100, 'EUR', 0.5)).toBe(50);
    expect(convertToUsd(92, 'EUR')).toBeCloseTo(100);
    expect(convertToUsd(10, 'USD')).toBe(10);
  });

  it('getCurrencySymbol and formatCurrency', () => {
    expect(getCurrencySymbol('usd')).toBe('$');
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(getCurrencySymbol('CREDITS')).toBe('VTNA Credits');
    expect(getCurrencySymbol('VTNA')).toBe('VTNA Credits');
    expect(getCurrencySymbol('GBP')).toBe('GBP');
    expect(formatCurrency(3.5, 'usd')).toBe('$3.50');
    expect(formatCurrency(3.5, 'EUR')).toBe('€3.50');
    expect(formatCurrency(12, 'CREDITS')).toBe('12 VTNA Credits');
    expect(formatCurrency(7, 'XYZ')).toBe('7');
  });
});
