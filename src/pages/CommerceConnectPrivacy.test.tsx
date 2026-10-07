/**
 * VTID-04945 — the connector privacy notice is German or English only: any
 * other app language gets English, ?lang= wins, and no machine-translated
 * text is shown (owner decision 2026-10-07).
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

let selected = 'fr-FR';
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ selectedLanguage: selected }) }));
vi.mock('@/components/SEO', () => ({ default: () => null }));

import CommerceConnectPrivacy from './CommerceConnectPrivacy';
import { privacyLang } from '@/lib/commerce-connect-lang';
import { ensureCatalog } from '@/i18n';
import deCatalog from '@/i18n/de/commerceConnect.json';
import enCatalog from '@/i18n/en/commerceConnect.json';

describe('privacyLang', () => {
  it('?lang wins; German app language → de; every other language → en', () => {
    expect(privacyLang('de', 'fr-FR')).toBe('de');
    expect(privacyLang('en', 'de-DE')).toBe('en');
    expect(privacyLang(null, 'de-DE')).toBe('de');
    for (const l of ['fr-FR', 'tr-TR', 'zh-CN', 'ar-SA', 'es-ES', 'sr-RS', 'pt-PT', 'ru-RU', 'pl-PL', 'en-US']) expect(privacyLang(null, l)).toBe('en');
    expect(privacyLang('xx', 'tr-TR')).toBe('en');
  });
});

describe('CommerceConnectPrivacy', () => {
  const at = (url: string) => render(<MemoryRouter initialEntries={[url]}><CommerceConnectPrivacy /></MemoryRouter>);

  it('shows English for a French app language and German with ?lang=de', async () => {
    selected = 'fr-FR';
    // The English catalog loads lazily (the app's LanguageProvider re-renders
    // when it lands; this test has no provider, so load it first).
    await ensureCatalog('en-US');
    const en = at('/commerce/connect/privacy');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(enCatalog.commerceConnect.privacyTitle));
    en.unmount();
    at('/commerce/connect/privacy?lang=de');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(deCatalog.commerceConnect.privacyTitle));
  });
});
