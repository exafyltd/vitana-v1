import { describe, it, expect, vi, beforeEach } from 'vitest';

// format-money reads the active locale from the i18n singleton; mock it so
// this test exercises the pure formatting logic deterministically.
const getI18nLocale = vi.fn<[], string | undefined>();
vi.mock('@/lib/i18n-toast', () => ({
  getI18nLocale: () => getI18nLocale(),
}));

import { formatMoneyMinor, toMinorUnits, toMajorUnits } from './format-money';

describe('formatMoneyMinor', () => {
  beforeEach(() => {
    getI18nLocale.mockReset();
  });

  it('formats EUR minor units in the German locale', () => {
    getI18nLocale.mockReturnValue('de-DE');
    // de-DE uses a comma decimal separator and trailing € (non-breaking space)
    expect(formatMoneyMinor(1234, 'EUR').replace(/ /g, ' ')).toBe('12,34 €');
  });

  it('formats USD minor units in the en-US locale', () => {
    getI18nLocale.mockReturnValue('en-US');
    expect(formatMoneyMinor(99999, 'USD')).toBe('$999.99');
  });

  it('defaults to de-DE when no locale is active', () => {
    getI18nLocale.mockReturnValue(undefined);
    expect(formatMoneyMinor(100, 'EUR').replace(/ /g, ' ')).toBe('1,00 €');
  });

  it('treats null/undefined amounts as zero', () => {
    getI18nLocale.mockReturnValue('de-DE');
    expect(formatMoneyMinor(undefined as unknown as number, 'EUR')).toContain('0,00');
  });
});

describe('minor/major unit conversion', () => {
  it('round-trips values', () => {
    expect(toMinorUnits(12.34)).toBe(1234);
    expect(toMajorUnits(1234)).toBe(12.34);
    expect(toMajorUnits(toMinorUnits(0.1) + toMinorUnits(0.2))).toBe(0.3);
  });

  it('rounds fractional cents', () => {
    expect(toMinorUnits(0.005)).toBe(1);
    expect(toMinorUnits(10.999)).toBe(1100);
  });

  it('handles nullish minor amounts', () => {
    expect(toMajorUnits(null as unknown as number)).toBe(0);
  });
});
