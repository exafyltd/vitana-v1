// VTID-04895 — the supplier reads and accepts the partner terms on Vitanaland.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }));

import { acceptBody, isStaleTermsError, parseTermsStatus } from './commerce-terms';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const sheet = read('src/components/commerce/PartnerTermsSheet.tsx');
const hub = read('src/components/commerce/SetupHub.tsx');

// VTID-04909: German binding, one language at a time.
const TERMS = {
  id: 'tv-1',
  version: '2026-10',
  published_at: '2026-10-05T00:00:00Z',
  content_sha256: 'h1',
  binding_locale: 'de',
  binding: { title: 'Partnerbedingungen', body_md: 'Verbindlicher Text' },
  locale: 'pt-BR',
  text: { title: 'Termos de Parceria', body_md: 'Texto' },
  direction: 'ltr',
  fallback: false,
  available_locales: ['de', 'en', 'pt-BR', 'ar'],
  translation: { locale: 'pt-BR', title: 'Termos de Parceria', body_md: 'Texto' },
  shown_locale: 'pt-BR',
};

describe('reading the gateway answer', () => {
  it('nothing published', () => {
    expect(parseTermsStatus({ ok: true, published: false, terms: null })).toEqual({ kind: 'not_published' });
    expect(parseTermsStatus(null)).toEqual({ kind: 'not_published' });
  });

  it('pending, accepted, and re-acceptance after a material update', () => {
    expect(parseTermsStatus({ published: true, terms: TERMS, accepted: false, reacceptance_required: false })).toMatchObject({ kind: 'pending', reacceptance: false });
    expect(parseTermsStatus({ published: true, terms: TERMS, accepted: false, reacceptance_required: true })).toMatchObject({ kind: 'pending', reacceptance: true });
    expect(parseTermsStatus({ published: true, terms: TERMS, accepted: true, accepted_at: '2026-10-06T00:00:00Z' })).toMatchObject({
      kind: 'accepted',
      acceptedAt: '2026-10-06T00:00:00Z',
    });
  });

  it('keeps the binding German text and the language on screen apart (VTID-04909)', () => {
    const s = parseTermsStatus({ published: true, terms: TERMS, accepted: false });
    if (s.kind !== 'pending') throw new Error('expected pending');
    expect(s.terms.binding.title).toBe('Partnerbedingungen');
    expect(s.terms).toMatchObject({ locale: 'pt-BR', text: { title: 'Termos de Parceria' }, shown_locale: 'pt-BR' });
  });
});

describe('accepting', () => {
  it('sends exactly the version, the content hash and the languages shown', () => {
    const s = parseTermsStatus({ published: true, terms: TERMS });
    if (s.kind === 'not_published') throw new Error('expected terms');
    expect(acceptBody(s.terms)).toEqual({ terms_version: '2026-10', content_sha256: 'h1', shown_locale: 'pt-BR' });
  });

  it('recognises "the terms changed while open" answers', () => {
    expect(isStaleTermsError(new Error('TERMS_CONTENT_MISMATCH'))).toBe(true);
    expect(isStaleTermsError(new Error('TERMS_VERSION_MISMATCH'))).toBe(true);
    expect(isStaleTermsError(new Error('TERMS_ACCEPTANCE_REQUIRES_SUPPLIER'))).toBe(false);
  });
});

describe('the sheet', () => {
  it('Accept stays off until the box is ticked; the box starts unticked', () => {
    expect(sheet).toContain('const [agreed, setAgreed] = useState(false);');
    expect(sheet).toContain('disabled={!agreed || saving || switching}');
    expect(sheet).toContain('if (!terms || !agreed) return;');
  });

  it('a new version while open: reload, untick, say so', () => {
    const handler = sheet.slice(sheet.indexOf('if (isStaleTermsError(e))'), sheet.indexOf('notifyError(`${K}.acceptFailed`)'));
    expect(handler).toContain('setUpdated(true);');
    expect(handler).toContain('await load();');
    expect(sheet).toContain('setAgreed(false);'); // load() unticks
  });

  it('renders the terms as plain text, never as HTML', () => {
    expect(sheet).not.toContain('dangerouslySetInnerHTML');
    expect(sheet).toContain('termsBlocks(terms.text.body_md)');
  });
});

describe('the setup hub', () => {
  it('shows a terms row (accepted / to accept / re-accept) and opens the sheet', () => {
    expect(hub).toContain("terms && terms.kind !== 'not_published' && (");
    expect(hub).toContain("data-state={reaccept ? 'reaccept' : 'todo'}");
    expect(hub).toContain('<PartnerTermsSheet open={termsOpen}');
  });

  it('the readiness steps are unchanged', () => {
    expect(hub).toContain("id: 'profile' | 'products' | 'verification' | 'sales' | 'publish';");
  });
});

describe('copy', () => {
  const KEYS = [
    'title', 'loadFailed', 'notPublished', 'updated', 'version', 'bindingNotice', 'bindingShort', 'languageLabel', 'readGerman',
    'fallbackNotice', 'agree', 'agreeExplanation', 'close', 'accept',
    'accepted', 'acceptFailed', 'rowTitle', 'rowBody', 'rowAccepted', 'rowReacceptTitle', 'rowReacceptBody', 'rowCta', 'view',
  ];
  for (const loc of ['de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh', 'ar']) {
    it(`${loc}: every terms key`, () => {
      const c = JSON.parse(read(`src/i18n/${loc}/screens.json`)).screens.commerceportal.terms;
      for (const k of KEYS) expect(typeof c?.[k] === 'string' && c[k].length > 0).toBe(true);
      expect(c.bindingLabel).toBeUndefined();
      expect(c.translationLabel).toBeUndefined();
    });
  }

  it('de is du-form, except the contractual acceptance and binding notice (owner decision 2026-10-06)', () => {
    const de = JSON.parse(read('src/i18n/de/screens.json')).screens.commerceportal.terms;
    const formal = Object.entries(de).filter(([, v]) => /\b(Sie|Ihr|Ihre|Ihnen)\b/.test(v as string)).map(([k]) => k);
    expect(formal).toEqual(['agreeExplanation']);
  });
});
