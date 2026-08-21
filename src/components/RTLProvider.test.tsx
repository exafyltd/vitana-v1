/**
 * BOOTSTRAP-AR-ZH-EXPANSION — direction must follow the selected language.
 *
 * The bug these guard against was not a missing feature. `RTLProvider` was
 * fully written, mounted, and consumed — and held `isRTL` in `useState(false)`
 * mutated only by a `toggleRTL()` that nothing ever called. It could not
 * become true. Arabic rendered left-to-right, `documentElement.dir` stayed
 * "ltr", and every `dir={isRTL ? 'rtl' : 'ltr'}` in the UI resolved to `ltr`.
 *
 * A test asserting "the provider renders" would have passed throughout. So
 * these assert the two things that were actually false: that an RTL language
 * produces `isRTL === true`, and that the DOM attribute the whole app keys off
 * actually changes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RTLProvider, useRTL, isRtlLanguage } from './RTLProvider';

// Drive the provider through the real `useLanguage` seam it consumes.
let mockLanguage = 'de-DE';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ selectedLanguage: mockLanguage }),
}));

function Probe() {
  const { isRTL } = useRTL();
  return <span data-testid="dir">{isRTL ? 'rtl' : 'ltr'}</span>;
}

beforeEach(() => {
  mockLanguage = 'de-DE';
  document.documentElement.dir = '';
  document.documentElement.classList.remove('rtl');
});

describe('isRtlLanguage', () => {
  it('recognises Arabic in every regional form the app stores', () => {
    // languageOptions uses 'ar-XA'; stored stt_language has carried others.
    for (const tag of ['ar', 'ar-XA', 'ar-SA', 'ar_EG', 'AR-xa']) {
      expect(isRtlLanguage(tag)).toBe(true);
    }
  });

  it('does not claim RTL for the LTR locales this app ships', () => {
    for (const tag of ['de-DE', 'en-US', 'es-ES', 'sr-RS', 'fr-FR', 'pt-BR', 'ru-RU', 'pl-PL', 'zh-CN']) {
      expect(isRtlLanguage(tag)).toBe(false);
    }
  });

  it('treats null/undefined/empty as LTR rather than throwing', () => {
    expect(isRtlLanguage(null)).toBe(false);
    expect(isRtlLanguage(undefined)).toBe(false);
    expect(isRtlLanguage('')).toBe(false);
  });
});

describe('RTLProvider', () => {
  it('reports RTL for Arabic — the case that was permanently false before', () => {
    mockLanguage = 'ar-XA';
    render(<RTLProvider><Probe /></RTLProvider>);
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
  });

  it('reports LTR for German', () => {
    mockLanguage = 'de-DE';
    render(<RTLProvider><Probe /></RTLProvider>);
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
  });

  it('sets documentElement.dir to rtl for Arabic', () => {
    mockLanguage = 'ar-XA';
    render(<RTLProvider><Probe /></RTLProvider>);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.classList.contains('rtl')).toBe(true);
  });

  it('sets documentElement.dir to ltr for Chinese — zh is NOT right-to-left', () => {
    // Worth pinning explicitly: zh ships alongside ar in this expansion, and
    // "non-Latin script" is not the same axis as "right-to-left".
    mockLanguage = 'zh-CN';
    render(<RTLProvider><Probe /></RTLProvider>);
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.classList.contains('rtl')).toBe(false);
  });

  it('clears the rtl class when moving from Arabic back to an LTR language', () => {
    mockLanguage = 'ar-XA';
    const { unmount } = render(<RTLProvider><Probe /></RTLProvider>);
    expect(document.documentElement.classList.contains('rtl')).toBe(true);
    unmount();

    mockLanguage = 'en-US';
    render(<RTLProvider><Probe /></RTLProvider>);
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.classList.contains('rtl')).toBe(false);
  });

  it('exposes no manual override — direction is derived, so it cannot drift from language', () => {
    mockLanguage = 'ar-XA';
    let ctx: unknown;
    function Capture() {
      ctx = useRTL();
      return null;
    }
    render(<RTLProvider><Capture /></RTLProvider>);
    // `toggleRTL` is deliberately gone. A manual setter beside a derived value
    // is exactly how the two would come to disagree again.
    expect(Object.keys(ctx as object)).toEqual(['isRTL']);
  });
});
