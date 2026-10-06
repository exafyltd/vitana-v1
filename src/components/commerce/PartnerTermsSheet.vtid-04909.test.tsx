/**
 * VTID-04909 — the partner terms sheet: German binding, one language at a
 * time, switchable without changing what is accepted, Arabic right to left.
 * The gateway is mocked; nothing is sent anywhere.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fetchPartnerTerms = vi.fn();
const acceptPartnerTerms = vi.fn();
vi.mock('@/lib/commerce-terms', async () => {
  const real = await vi.importActual<typeof import('@/lib/commerce-terms')>('@/lib/commerce-terms');
  return {
    ...real,
    fetchPartnerTerms: (...a: unknown[]) => fetchPartnerTerms(...a),
    acceptPartnerTerms: (...a: unknown[]) => acceptPartnerTerms(...a),
  };
});

import { parseTermsStatus, termsBlocks, TERMS_LANGUAGE_NAMES, TERMS_LOCALES } from '@/lib/commerce-terms';
import { PartnerTermsSheet } from './PartnerTermsSheet';

const TEXTS: Record<string, { title: string; body_md: string }> = {
  de: { title: 'Partnerbedingungen VITANALAND Commerce', body_md: '## 1. Geltungsbereich\n\n1.1 Deutscher Text.\n\na) erster Punkt' },
  en: { title: 'Partner Terms VITANALAND Commerce', body_md: '## 1. Scope\n\n1.1 English text.' },
  ar: { title: 'شروط الشركاء VITANALAND Commerce', body_md: '## 1. النطاق\n\n1.1 نص عربي يذكر Supplier ID.' },
};
const AVAILABLE = ['de', 'en', 'ar'];

/** What the gateway answers for a requested locale (German fallback, German hash). */
function answer(requested: string, over: Record<string, unknown> = {}) {
  const map: Record<string, string> = { 'de-DE': 'de', de: 'de', 'en-US': 'en', en: 'en', 'ar-XA': 'ar', ar: 'ar' };
  const locale = map[requested] ?? 'de';
  return parseTermsStatus({
    ok: true,
    published: true,
    accepted: false,
    terms: {
      id: 'tv-1',
      version: '2026-10',
      published_at: '2026-10-06T00:00:00Z',
      content_sha256: 'german-hash',
      binding_locale: 'de',
      binding: TEXTS.de,
      locale,
      text: TEXTS[locale],
      direction: locale === 'ar' ? 'rtl' : 'ltr',
      fallback: !map[requested],
      available_locales: AVAILABLE,
      shown_locale: locale,
      ...over,
    },
  });
}

let appLocale = 'de-DE';
vi.mock('@/lib/i18n-toast', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n-toast')>('@/lib/i18n-toast');
  return { ...real, getI18nLocale: () => appLocale, notify: vi.fn(), notifyError: vi.fn() };
});

const open = () => render(<PartnerTermsSheet open onOpenChange={() => {}} orgId="org-1" onAccepted={() => {}} />);

beforeEach(() => {
  appLocale = 'de-DE';
  fetchPartnerTerms.mockReset();
  acceptPartnerTerms.mockReset();
  fetchPartnerTerms.mockImplementation(async (_org: string, locale: string) => answer(locale));
  acceptPartnerTerms.mockResolvedValue(undefined);
});

describe('VTID-04909 partner terms sheet', () => {
  it('opens in the app language; German by default; binding notice always visible', async () => {
    open();
    await screen.findByTestId('partner-terms-text');
    expect(fetchPartnerTerms).toHaveBeenCalledWith('org-1', 'de-DE');
    expect(screen.getByTestId('partner-terms-text').getAttribute('lang')).toBe('de');
    expect(screen.getByTestId('partner-terms-text').textContent).toContain('Partnerbedingungen VITANALAND Commerce');
    expect(screen.getByTestId('partner-terms-binding-notice').textContent).toContain('Die deutsche Fassung dieser Partnerbedingungen ist die rechtsverbindliche');
    // Already German: no "read German" link.
    expect(screen.queryByTestId('partner-terms-read-german')).toBeNull();
  });

  it('checkbox starts unticked; Accept is disabled until it is ticked', async () => {
    open();
    await screen.findByTestId('partner-terms-text');
    const accept = screen.getByTestId('partner-terms-accept') as HTMLButtonElement;
    expect(screen.getByTestId('partner-terms-agree').getAttribute('data-state')).toBe('unchecked');
    expect(accept.disabled).toBe(true);
    fireEvent.click(screen.getByTestId('partner-terms-agree'));
    expect(accept.disabled).toBe(false);
    expect(screen.getByTestId('partner-terms-agree-explanation').textContent).toContain('bestätigen Sie, dass Sie berechtigt sind');
  });

  it('VTID-04925: the tick and Accept sit together in the footer, outside the scrolling terms', async () => {
    open();
    await screen.findByTestId('partner-terms-text');
    const footer = screen.getByTestId('partner-terms-footer');
    expect(footer.contains(screen.getByTestId('partner-terms-agree'))).toBe(true);
    expect(footer.contains(screen.getByTestId('partner-terms-accept'))).toBe(true);
    const body = screen.getByTestId('partner-terms-text').closest('[data-terms-body]');
    expect(body).not.toBeNull();
    expect(body!.contains(screen.getByTestId('partner-terms-agree'))).toBe(false);
  });

  it('Arabic reads right to left; the binding notice stays; one tap back to German', async () => {
    appLocale = 'ar-XA';
    open();
    const text = await screen.findByTestId('partner-terms-text');
    expect(text.getAttribute('dir')).toBe('rtl');
    expect(text.getAttribute('lang')).toBe('ar');
    expect(text.textContent).toContain('Supplier ID');
    expect(screen.getByTestId('partner-terms-binding-notice')).toBeTruthy();
    fireEvent.click(screen.getByTestId('partner-terms-read-german'));
    await waitFor(() => expect(screen.getByTestId('partner-terms-text').getAttribute('lang')).toBe('de'));
    expect(screen.getByTestId('partner-terms-text').getAttribute('dir')).toBe('ltr');
    expect(fetchPartnerTerms).toHaveBeenLastCalledWith('org-1', 'de');
  });

  it('switching language keeps the tick and accepts the same version + German hash, with the language on screen', async () => {
    appLocale = 'en-US';
    open();
    await screen.findByTestId('partner-terms-text');
    fireEvent.click(screen.getByTestId('partner-terms-agree'));
    fireEvent.click(screen.getByTestId('partner-terms-read-german'));
    await waitFor(() => expect(screen.getByTestId('partner-terms-text').getAttribute('lang')).toBe('de'));
    expect(screen.getByTestId('partner-terms-agree').getAttribute('data-state')).toBe('checked');
    // Switching never accepts.
    expect(acceptPartnerTerms).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('partner-terms-accept'));
    await waitFor(() => expect(acceptPartnerTerms).toHaveBeenCalledTimes(1));
    const [, terms] = acceptPartnerTerms.mock.calls[0];
    expect(terms).toMatchObject({ version: '2026-10', content_sha256: 'german-hash', shown_locale: 'de' });
  });

  it('a missing translation shows German with a note, never English', async () => {
    appLocale = 'fr-FR';
    open();
    const text = await screen.findByTestId('partner-terms-text');
    expect(text.getAttribute('lang')).toBe('de');
    expect(screen.getByTestId('partner-terms-fallback')).toBeTruthy();
  });

  it('a new version found while switching unticks and says so', async () => {
    appLocale = 'en-US';
    open();
    await screen.findByTestId('partner-terms-text');
    fireEvent.click(screen.getByTestId('partner-terms-agree'));
    fetchPartnerTerms.mockImplementation(async (_o: string, l: string) => answer(l, { version: '2026-11', content_sha256: 'new-hash' }));
    fireEvent.click(screen.getByTestId('partner-terms-read-german'));
    await screen.findByTestId('partner-terms-updated');
    expect(screen.getByTestId('partner-terms-agree').getAttribute('data-state')).toBe('unchecked');
    expect((screen.getByTestId('partner-terms-accept') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('VTID-04909 terms helpers', () => {
  it('the 11 languages, in owner order, each with its own name', () => {
    expect([...TERMS_LOCALES]).toEqual(['de', 'en', 'es', 'sr', 'fr', 'pt-BR', 'ru', 'pl', 'ar', 'zh-CN', 'tr']);
    for (const l of TERMS_LOCALES) expect(TERMS_LANGUAGE_NAMES[l]).toBeTruthy();
    expect(TERMS_LANGUAGE_NAMES['pt-BR']).toBe('Português (Brasil)');
    expect(TERMS_LANGUAGE_NAMES['zh-CN']).toBe('简体中文');
  });

  it('defaults to German when the gateway names no language', () => {
    const s = parseTermsStatus({ published: true, terms: { id: 'x', version: 'v', content_sha256: 'h', binding: TEXTS.de } });
    if (s.kind === 'not_published') throw new Error('expected terms');
    expect(s.terms).toMatchObject({ binding_locale: 'de', locale: 'de', shown_locale: 'de', available_locales: ['de'], text: TEXTS.de });
  });

  it('renders headings, list items, markers and paragraphs as plain text blocks', () => {
    expect(termsBlocks('## 1. Titel\n\n1.1 Satz eins\nweiter.\n\na) Punkt\nFINAL LEGAL COUNSEL REVIEW REQUIRED BEFORE PUBLICATION\n\n<b>x</b>')).toEqual([
      { kind: 'heading', text: '1. Titel' },
      { kind: 'paragraph', text: '1.1 Satz eins weiter.' },
      { kind: 'item', label: 'a)', text: 'Punkt' },
      { kind: 'marker', text: 'FINAL LEGAL COUNSEL REVIEW REQUIRED BEFORE PUBLICATION' },
      { kind: 'paragraph', text: '<b>x</b>' },
    ]);
  });
});
