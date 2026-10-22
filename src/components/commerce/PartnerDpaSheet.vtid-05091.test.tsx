/**
 * VTID-05091 — the data processing agreement sheet: the text as the gateway
 * serves it, German binding, an unticked declaration, Sign only with name +
 * role + tick, the exact body sent, every refusal code with its own message,
 * a 409 reloads the text and clears the tick, signed and re-sign states.
 * The gateway is mocked (adminFetch); nothing is sent anywhere.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const adminFetch = vi.fn();
vi.mock('@/lib/admin-api', () => ({ adminFetch: (...a: unknown[]) => adminFetch(...a) }));

const notify = vi.fn();
const notifyError = vi.fn();
let appLocale = 'de-DE';
vi.mock('@/lib/i18n-toast', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n-toast')>('@/lib/i18n-toast');
  return {
    ...real,
    getI18nLocale: () => appLocale,
    notify: (...a: unknown[]) => notify(...a),
    notifyError: (...a: unknown[]) => notifyError(...a),
  };
});

import { PartnerDpaSheet } from './PartnerDpaSheet';
import { DPA_ERROR_KEYS, DPA_SIGN_ERRORS } from '@/lib/commerce-dpa';
import { t } from '@/lib/i18n-toast';

const TEXTS: Record<string, { title: string; body_md: string; signing_declaration: string | null }> = {
  de: { title: 'Auftragsverarbeitungsvertrag (AVV)', body_md: '## 1. Gegenstand\n\n1.1 Deutscher Text.\n\na) erster Punkt', signing_declaration: 'Ich bin berechtigt, für das Unternehmen zu unterschreiben.' },
  en: { title: 'Data Processing Agreement', body_md: '## 1. Subject\n\n1.1 English text.', signing_declaration: 'I am authorised to sign for the company.' },
  ar: { title: 'اتفاقية معالجة البيانات', body_md: '## 1. الموضوع\n\n1.1 نص عربي.', signing_declaration: null },
};
const AVAILABLE = ['de', 'en', 'ar'];
const APP_TO_DPA: Record<string, string> = { 'de-DE': 'de', de: 'de', 'en-US': 'en', en: 'en', 'ar-XA': 'ar', ar: 'ar' };

/** What GET /dpa answers for a requested locale (German fallback, German hash). */
function dpaAnswer(requested: string, over: Record<string, unknown> = {}, dpaOver: Record<string, unknown> = {}) {
  const locale = APP_TO_DPA[requested] ?? 'de';
  const text = TEXTS[locale];
  return {
    ok: true,
    required: true,
    published: true,
    signed: false,
    signed_at: null,
    signed_version: null,
    resign_required: false,
    dpa: {
      id: 'dv-1',
      version: '2026-11',
      published_at: '2026-11-01T00:00:00Z',
      content_sha256: 'german-hash',
      binding_locale: 'de',
      binding: TEXTS.de,
      locale,
      fallback: !APP_TO_DPA[requested],
      direction: locale === 'ar' ? 'rtl' : 'ltr',
      text,
      signing_declaration: text.signing_declaration,
      available_locales: AVAILABLE,
      shown_locale: locale,
      ...dpaOver,
    },
    ...over,
  };
}

let getAnswer: (locale: string) => unknown;
let signImpl: (body: unknown) => unknown;

beforeEach(() => {
  appLocale = 'de-DE';
  notify.mockReset();
  notifyError.mockReset();
  adminFetch.mockReset();
  getAnswer = (l) => dpaAnswer(l);
  signImpl = () => ({ ok: true, organization: {}, checklist: { steps: [] }, already_signed: false });
  adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') return signImpl(JSON.parse(String(init.body)));
    const locale = new URL(`https://x${path}`).searchParams.get('locale') ?? '';
    return getAnswer(locale);
  });
});

const signCalls = () => adminFetch.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

function open(onSigned = vi.fn(), onOpenChange = vi.fn()) {
  render(<PartnerDpaSheet open onOpenChange={onOpenChange} orgId="org-1" legalName="Labor Muster GmbH" onSigned={onSigned} />);
  return { onSigned, onOpenChange };
}

function fillAndTick() {
  fireEvent.change(screen.getByTestId('partner-dpa-name'), { target: { value: '  Erika Mustermann ' } });
  fireEvent.change(screen.getByTestId('partner-dpa-role'), { target: { value: ' Geschäftsführerin ' } });
  fireEvent.click(screen.getByTestId('partner-dpa-declaration'));
}

describe('VTID-05091 data processing agreement sheet', () => {
  it('nothing published: says it is being prepared, no form, no Sign', async () => {
    getAnswer = () => ({ ok: true, required: true, published: false, dpa: null, signed: false, signed_at: null, signed_version: null, resign_required: false });
    open();
    const none = await screen.findByTestId('partner-dpa-none');
    expect(none.textContent).toBe(t('screens.commerceportal.dpa.notPublished'));
    expect(screen.queryByTestId('partner-dpa-sign')).toBeNull();
    expect(screen.queryByTestId('partner-dpa-form')).toBeNull();
  });

  it('opens in the app language; German binding notice and the authored text, as plain text', async () => {
    open();
    const text = await screen.findByTestId('partner-dpa-text');
    expect(adminFetch).toHaveBeenCalledWith('/api/v1/partner-onboarding/org-1/dpa?locale=de-DE');
    expect(text.getAttribute('lang')).toBe('de');
    expect(text.textContent).toContain('Auftragsverarbeitungsvertrag (AVV)');
    expect(text.textContent).toContain('1.1 Deutscher Text.');
    expect(text.innerHTML).not.toContain('##');
    expect(screen.getByTestId('partner-dpa-binding-notice').textContent).toContain(t('screens.commerceportal.dpa.bindingNotice'));
    expect(screen.queryByTestId('partner-dpa-read-german')).toBeNull();
    // The declaration is the version's own wording.
    expect(screen.getByTestId('partner-dpa-declaration-text').textContent).toBe(TEXTS.de.signing_declaration);
  });

  it('Sign stays disabled until name, role and the tick are all there; the box starts unticked', async () => {
    open();
    await screen.findByTestId('partner-dpa-text');
    const sign = screen.getByTestId('partner-dpa-sign') as HTMLButtonElement;
    expect(screen.getByTestId('partner-dpa-declaration').getAttribute('data-state')).toBe('unchecked');
    expect(sign.disabled).toBe(true);
    fireEvent.click(screen.getByTestId('partner-dpa-declaration'));
    expect(sign.disabled).toBe(true); // tick alone
    fireEvent.change(screen.getByTestId('partner-dpa-name'), { target: { value: 'Erika Mustermann' } });
    expect(sign.disabled).toBe(true); // no role
    fireEvent.change(screen.getByTestId('partner-dpa-role'), { target: { value: '   ' } });
    expect(sign.disabled).toBe(true); // blank role
    fireEvent.change(screen.getByTestId('partner-dpa-role'), { target: { value: 'Geschäftsführerin' } });
    expect(sign.disabled).toBe(false);
    fireEvent.click(screen.getByTestId('partner-dpa-declaration'));
    expect(sign.disabled).toBe(true); // untick
  });

  it('signing sends exactly version, German hash, language on screen, trimmed name/role and the declaration', async () => {
    const { onSigned, onOpenChange } = open();
    await screen.findByTestId('partner-dpa-text');
    fillAndTick();
    fireEvent.click(screen.getByTestId('partner-dpa-sign'));
    await waitFor(() => expect(onSigned).toHaveBeenCalledTimes(1));
    const calls = signCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('/api/v1/partner-onboarding/org-1/dpa/sign');
    expect(JSON.parse(String((calls[0][1] as RequestInit).body))).toEqual({
      dpa_version: '2026-11',
      content_sha256: 'german-hash',
      shown_locale: 'de',
      signer_name: 'Erika Mustermann',
      signer_role: 'Geschäftsführerin',
      declaration_confirmed: true,
    });
    expect(notify).toHaveBeenCalledWith('screens.commerceportal.dpa.signed');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('switching language keeps the tick, never signs, and signs the same version + German hash with the language on screen', async () => {
    appLocale = 'en-US';
    open();
    await screen.findByTestId('partner-dpa-text');
    expect(screen.getByTestId('partner-dpa-text').getAttribute('lang')).toBe('en');
    // The binding German declaration is shown next to the translated one.
    expect(screen.getByTestId('partner-dpa-binding-declaration').textContent).toContain(TEXTS.de.signing_declaration!);
    fillAndTick();
    fireEvent.click(screen.getByTestId('partner-dpa-read-german'));
    await waitFor(() => expect(screen.getByTestId('partner-dpa-text').getAttribute('lang')).toBe('de'));
    expect(screen.getByTestId('partner-dpa-declaration').getAttribute('data-state')).toBe('checked');
    expect(signCalls()).toHaveLength(0);
    fireEvent.click(screen.getByTestId('partner-dpa-sign'));
    await waitFor(() => expect(signCalls()).toHaveLength(1));
    expect(JSON.parse(String((signCalls()[0][1] as RequestInit).body))).toMatchObject({ dpa_version: '2026-11', content_sha256: 'german-hash', shown_locale: 'de' });
  });

  it('Arabic reads right to left; without an authored declaration the catalogue fallback names the business', async () => {
    appLocale = 'ar-XA';
    open();
    const text = await screen.findByTestId('partner-dpa-text');
    expect(text.getAttribute('dir')).toBe('rtl');
    expect(text.getAttribute('lang')).toBe('ar');
    expect(screen.getByTestId('partner-dpa-declaration-text').textContent).toBe(
      t('screens.commerceportal.dpa.fallbackDeclaration', { legal_name: 'Labor Muster GmbH' }),
    );
    expect(screen.getByTestId('partner-dpa-binding-notice')).toBeTruthy();
  });

  it('a missing translation shows German with a note', async () => {
    appLocale = 'fr-FR';
    open();
    const text = await screen.findByTestId('partner-dpa-text');
    expect(text.getAttribute('lang')).toBe('de');
    expect(screen.getByTestId('partner-dpa-fallback')).toBeTruthy();
  });

  for (const code of ['DPA_VERSION_MISMATCH', 'DPA_CONTENT_MISMATCH']) {
    it(`409 ${code}: reloads the new text, clears the tick and says so`, async () => {
      open();
      await screen.findByTestId('partner-dpa-text');
      fillAndTick();
      signImpl = () => {
        throw new Error(code);
      };
      getAnswer = (l) => dpaAnswer(l, {}, { version: '2026-12', content_sha256: 'new-hash' });
      fireEvent.click(screen.getByTestId('partner-dpa-sign'));
      await screen.findByTestId('partner-dpa-updated');
      expect(screen.getByTestId('partner-dpa-version').textContent).toContain('2026-12');
      expect(screen.getByTestId('partner-dpa-declaration').getAttribute('data-state')).toBe('unchecked');
      expect((screen.getByTestId('partner-dpa-sign') as HTMLButtonElement).disabled).toBe(true);
      expect(notifyError).not.toHaveBeenCalled();
    });
  }

  for (const code of DPA_SIGN_ERRORS) {
    it(`${code}: its own message`, async () => {
      open();
      await screen.findByTestId('partner-dpa-text');
      fillAndTick();
      signImpl = () => {
        throw new Error(code);
      };
      fireEvent.click(screen.getByTestId('partner-dpa-sign'));
      await waitFor(() => expect(notifyError).toHaveBeenCalledWith(DPA_ERROR_KEYS[code]));
      // The message exists in German (not the raw key).
      expect(t(DPA_ERROR_KEYS[code])).not.toBe(DPA_ERROR_KEYS[code]);
    });
  }

  it('409 DPA_NOT_REQUIRED / DPA_COMPANY_INCOMPLETE: reloads and clears the tick', async () => {
    for (const code of ['DPA_NOT_REQUIRED', 'DPA_COMPANY_INCOMPLETE']) {
      const view = render(<PartnerDpaSheet open onOpenChange={() => {}} orgId="org-1" legalName="X" onSigned={() => {}} />);
      await screen.findByTestId('partner-dpa-text');
      fillAndTick();
      signImpl = () => {
        throw new Error(code);
      };
      const gets = adminFetch.mock.calls.length;
      fireEvent.click(screen.getByTestId('partner-dpa-sign'));
      await waitFor(() => expect(screen.getByTestId('partner-dpa-declaration').getAttribute('data-state')).toBe('unchecked'));
      expect(adminFetch.mock.calls.length).toBeGreaterThan(gets + 1);
      view.unmount();
    }
  });

  it('anything else (network, 5xx): a generic message, the tick is kept', async () => {
    open();
    await screen.findByTestId('partner-dpa-text');
    fillAndTick();
    signImpl = () => {
      throw new Error('HTTP 500');
    };
    fireEvent.click(screen.getByTestId('partner-dpa-sign'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('screens.commerceportal.dpa.signFailed'));
    expect(screen.getByTestId('partner-dpa-declaration').getAttribute('data-state')).toBe('checked');
  });

  it('signed: shows version and date, no form and no Sign', async () => {
    getAnswer = (l) => dpaAnswer(l, { signed: true, signed_at: '2026-11-03T10:00:00Z', signed_version: '2026-11' });
    open();
    const signed = await screen.findByTestId('partner-dpa-signed');
    expect(signed.textContent).toContain('2026-11');
    expect(signed.textContent).toContain('2026');
    expect(screen.queryByTestId('partner-dpa-sign')).toBeNull();
    expect(screen.queryByTestId('partner-dpa-form')).toBeNull();
  });

  it('re-sign required: says the agreement changed, the form is there and unticked', async () => {
    getAnswer = (l) => dpaAnswer(l, { resign_required: true });
    open();
    const resign = await screen.findByTestId('partner-dpa-resign');
    expect(resign.textContent).toContain('2026-11');
    expect(screen.getByTestId('partner-dpa-declaration').getAttribute('data-state')).toBe('unchecked');
    expect((screen.getByTestId('partner-dpa-sign') as HTMLButtonElement).disabled).toBe(true);
  });

  it('a read failure says so and offers nothing to sign', async () => {
    adminFetch.mockRejectedValue(new Error('NOT_ORG_ADMIN'));
    open();
    await screen.findByTestId('partner-dpa-load-failed');
    expect(screen.queryByTestId('partner-dpa-sign')).toBeNull();
  });
});
