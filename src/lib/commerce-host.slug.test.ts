import { describe, expect, it } from 'vitest';
import { slugifyOrgKey } from './commerce-host';

describe('slugifyOrgKey (VTID-03989)', () => {
  it('lowercases and hyphenates a plain business name', () => {
    expect(slugifyOrgKey('Dr. Box Labor GmbH')).toBe('dr-box-labor-gmbh');
  });

  it('strips diacritics and expands ß so the key stays [a-z0-9-]', () => {
    expect(slugifyOrgKey('Müller & Söhne Praxis')).toBe('muller-sohne-praxis');
    expect(slugifyOrgKey('Straßenlabor')).toBe('strassenlabor');
  });

  it('trims leading/trailing separators and collapses runs', () => {
    expect(slugifyOrgKey('  --Vita  Lab__ ')).toBe('vita-lab');
    expect(slugifyOrgKey('')).toBe('');
    expect(slugifyOrgKey('!!!')).toBe('');
  });

  it('caps the length without leaving a dangling hyphen', () => {
    const long = 'a'.repeat(47) + ' b';
    expect(slugifyOrgKey(long)).toBe('a'.repeat(47));
    expect(slugifyOrgKey(long).length).toBeLessThanOrEqual(48);
  });
});
