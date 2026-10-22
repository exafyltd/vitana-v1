// VTID-05091 — the data processing agreement helpers, copy and RTL safety.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }));

import {
  DPA_ERROR_KEYS,
  DPA_SIGN_ERRORS,
  canSign,
  deriveDpaRow,
  dpaSignErrorCode,
  dpaStepOf,
  isStaleDpaError,
  parseDpaStatus,
  signBody,
} from './commerce-dpa';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const DPA = {
  id: 'dv-1',
  version: '2026-11',
  published_at: '2026-11-01T00:00:00Z',
  content_sha256: 'h1',
  binding_locale: 'de',
  binding: { title: 'AVV', body_md: 'Verbindlich', signing_declaration: 'Deutsche Erklärung' },
  locale: 'pt-BR',
  fallback: false,
  direction: 'ltr',
  text: { title: 'Contrato', body_md: 'Texto', signing_declaration: 'Declaração' },
  signing_declaration: 'Declaração',
  available_locales: ['de', 'en', 'pt-BR', 'xx'],
  shown_locale: 'pt-BR',
};

describe('reading GET /dpa', () => {
  it('nothing published (and garbage) → not_published, keeping `required`', () => {
    expect(parseDpaStatus({ ok: true, required: true, published: false, dpa: null })).toEqual({ kind: 'not_published', required: true });
    expect(parseDpaStatus(null)).toEqual({ kind: 'not_published', required: false });
    expect(parseDpaStatus({ published: true, dpa: { version: 1 } })).toMatchObject({ kind: 'not_published' });
  });

  it('unsigned, re-sign, signed', () => {
    expect(parseDpaStatus({ published: true, dpa: DPA, signed: false, resign_required: false })).toMatchObject({ kind: 'unsigned', resign: false });
    expect(parseDpaStatus({ published: true, dpa: DPA, signed: false, resign_required: true })).toMatchObject({ kind: 'unsigned', resign: true });
    expect(parseDpaStatus({ published: true, dpa: DPA, signed: true, signed_at: '2026-11-03T00:00:00Z', signed_version: '2026-10' })).toMatchObject({
      kind: 'signed',
      signedAt: '2026-11-03T00:00:00Z',
      signedVersion: '2026-10',
    });
  });

  it('keeps the binding German text and declaration apart from the language on screen; drops unknown locales', () => {
    const s = parseDpaStatus({ published: true, dpa: DPA });
    if (s.kind === 'not_published') throw new Error('expected a DPA');
    expect(s.dpa.binding).toEqual({ title: 'AVV', body_md: 'Verbindlich', signing_declaration: 'Deutsche Erklärung' });
    expect(s.dpa).toMatchObject({ locale: 'pt-BR', shown_locale: 'pt-BR', signing_declaration: 'Declaração', direction: 'ltr' });
    expect(s.dpa.available_locales).toEqual(['de', 'en', 'pt-BR']);
  });

  it('a version without a declaration → null (the sheet uses the catalogue fallback)', () => {
    const s = parseDpaStatus({ published: true, dpa: { ...DPA, signing_declaration: null, text: { title: 'x', body_md: 'y', signing_declaration: null } } });
    if (s.kind === 'not_published') throw new Error('expected a DPA');
    expect(s.dpa.signing_declaration).toBeNull();
  });

  it('Arabic → rtl', () => {
    const s = parseDpaStatus({ published: true, dpa: { ...DPA, locale: 'ar', shown_locale: 'ar', direction: 'rtl' } });
    if (s.kind === 'not_published') throw new Error('expected a DPA');
    expect(s.dpa.direction).toBe('rtl');
  });
});

describe('signing', () => {
  it('sends exactly the version, the German hash, the language on screen, trimmed name and role, and the declaration', () => {
    const s = parseDpaStatus({ published: true, dpa: DPA });
    if (s.kind === 'not_published') throw new Error('expected a DPA');
    expect(signBody(s.dpa, ' Ana Silva ', ' Diretora ')).toEqual({
      dpa_version: '2026-11',
      content_sha256: 'h1',
      shown_locale: 'pt-BR',
      signer_name: 'Ana Silva',
      signer_role: 'Diretora',
      declaration_confirmed: true,
    });
  });

  it('needs name (1–200), role (1–120) and the tick', () => {
    expect(canSign('A', 'B', true)).toBe(true);
    expect(canSign('A', 'B', false)).toBe(false);
    expect(canSign('  ', 'B', true)).toBe(false);
    expect(canSign('A', '', true)).toBe(false);
    expect(canSign('x'.repeat(200), 'y'.repeat(120), true)).toBe(true);
    expect(canSign('x'.repeat(201), 'B', true)).toBe(false);
    expect(canSign('A', 'y'.repeat(121), true)).toBe(false);
  });

  it('recognises the stale-text 409s and every refusal code', () => {
    expect(isStaleDpaError(new Error('DPA_CONTENT_MISMATCH'))).toBe(true);
    expect(isStaleDpaError(new Error('DPA_VERSION_MISMATCH'))).toBe(true);
    expect(isStaleDpaError(new Error('TERMS_CONTENT_MISMATCH'))).toBe(false);
    for (const c of DPA_SIGN_ERRORS) expect(dpaSignErrorCode(new Error(c))).toBe(c);
    expect(dpaSignErrorCode(new Error('HTTP 500'))).toBeNull();
    expect(dpaSignErrorCode('DPA_NOT_PUBLISHED')).toBeNull();
    expect(Object.keys(DPA_ERROR_KEYS).sort()).toEqual([...DPA_SIGN_ERRORS].sort());
  });
});

describe('the checklist step drives the hub row', () => {
  const steps = (dpa: Record<string, unknown> | null) => ({ steps: [{ key: 'terms', required: true, status: 'done' }, ...(dpa ? [{ key: 'dpa', ...dpa }] : [])] });

  it('finds the dpa step', () => {
    expect(dpaStepOf(null)).toBeNull();
    expect(dpaStepOf(steps(null))).toBeNull();
    expect(dpaStepOf(steps({ required: true, status: 'todo', missing: ['dpa_not_published'] }))).toEqual({
      required: true,
      status: 'todo',
      missing: ['dpa_not_published'],
      detail: undefined,
    });
  });

  it('not required → no row', () => {
    expect(deriveDpaRow(null, null)).toBeNull();
    expect(deriveDpaRow({ required: false, status: 'not_required' }, null)).toBeNull();
  });

  it('from the checklist alone', () => {
    expect(deriveDpaRow({ required: true, status: 'todo', missing: ['dpa_not_published'] }, null)).toEqual({ kind: 'pending_legal' });
    expect(deriveDpaRow({ required: true, status: 'todo', detail: { current_version: 'v2' } }, null)).toEqual({ kind: 'todo', version: 'v2' });
    expect(deriveDpaRow({ required: true, status: 'done' }, null)).toEqual({ kind: 'signed', version: null, signedAt: null });
  });

  it('the DPA read wins when it loaded', () => {
    const step = { required: true, status: 'todo' };
    expect(deriveDpaRow(step, { kind: 'not_published', required: true })).toEqual({ kind: 'pending_legal' });
    const s = parseDpaStatus({ published: true, dpa: DPA, resign_required: true });
    expect(deriveDpaRow(step, s)).toEqual({ kind: 'resign', version: '2026-11' });
    const signed = parseDpaStatus({ published: true, dpa: DPA, signed: true, signed_at: '2026-11-03T00:00:00Z', signed_version: '2026-11' });
    expect(deriveDpaRow(step, signed)).toEqual({ kind: 'signed', version: '2026-11', signedAt: '2026-11-03T00:00:00Z' });
  });
});

describe('RTL and rendering safety', () => {
  const sheet = read('src/components/commerce/PartnerDpaSheet.tsx');
  const hub = read('src/components/commerce/SetupHub.tsx');
  const dpaRow = hub.slice(hub.indexOf('function DpaRow('), hub.indexOf('function ProfileSheet('));

  it('no physical left/right classes in the sheet or the hub row', () => {
    const classes = (src: string) => [...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]).join(' ').split(/\s+/);
    const physical = /^(?:[\w-]+:)*(?:ml|mr|pl|pr|left|right|rounded-l|rounded-r|border-l|border-r|rounded-tl|rounded-tr|rounded-bl|rounded-br)-|^(?:[\w-]+:)*(?:text|float)-(?:left|right)$/;
    expect(classes(sheet).length).toBeGreaterThan(20);
    expect(classes(sheet).filter((c) => physical.test(c))).toEqual([]);
    expect(classes(dpaRow).filter((c) => physical.test(c))).toEqual([]);
    // The scan itself catches a physical class.
    expect(['ml-2', 'md:pr-4', 'text-left'].filter((c) => physical.test(c))).toHaveLength(3);
    expect(dpaRow).toContain('rtl:rotate-180');
  });

  it('the agreement text is plain-text blocks, never HTML; dir/lang follow the language shown', () => {
    expect(sheet).not.toContain('dangerouslySetInnerHTML');
    expect(sheet).toContain('dpaBlocks(dpa.text.body_md)');
    expect(sheet).toContain('lang={dpa.locale} dir={dpa.direction}');
  });

  it('the box is never pre-ticked; load() and a stale answer untick it', () => {
    expect(sheet).toContain('const [declared, setDeclared] = useState(false);');
    expect(sheet).toContain('disabled={!ready || saving || switching || loading}');
    const handler = sheet.slice(sheet.indexOf('if (isStaleDpaError(e))'), sheet.indexOf('const code = dpaSignErrorCode(e);'));
    expect(handler).toContain('setUpdated(true);');
    expect(handler).toContain('await load();');
  });
});

describe('copy', () => {
  const KEYS = [
    'title', 'loadFailed', 'notPublished', 'updated', 'resignNotice', 'signedNotice', 'signedNoticeNoDate', 'version', 'bindingNotice',
    'bindingShort', 'languageLabel', 'readGerman', 'fallbackNotice', 'nameLabel', 'roleLabel', 'fallbackDeclaration',
    'bindingDeclarationLabel', 'signerHint', 'close', 'sign', 'signed', 'signFailed', 'errorRequiresSupplier', 'errorNotPublished',
    'errorInvalidLocale', 'errorInvalidSignature', 'errorOrgNotFound', 'errorNotOrgAdmin', 'errorNotRequired', 'errorCompanyIncomplete',
    'errorAccountEmailRequired', 'rowTitle', 'rowBody', 'rowBodyNoVersion', 'rowPending', 'rowSigned', 'rowSignedNoDate', 'rowSignedPlain',
    'rowResignTitle', 'rowResignBody', 'rowCta', 'view',
  ];
  const de = JSON.parse(read('src/i18n/de/screens.json')).screens.commerceportal.dpa as Record<string, string>;
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

  for (const loc of ['de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh', 'ar']) {
    it(`${loc}: every DPA key, same placeholders as German`, () => {
      const c = JSON.parse(read(`src/i18n/${loc}/screens.json`)).screens.commerceportal.dpa as Record<string, string>;
      expect(Object.keys(c).sort()).toEqual([...KEYS].sort());
      for (const k of KEYS) {
        expect(typeof c[k] === 'string' && c[k].length > 0).toBe(true);
        expect(placeholders(c[k])).toEqual(placeholders(de[k]));
      }
    });
  }

  it('every refusal message key exists', () => {
    for (const key of Object.values(DPA_ERROR_KEYS)) expect(de[key.split('.').pop()!]).toBeTruthy();
  });

  it('de is du-form throughout', () => {
    const formal = Object.entries(de).filter(([, v]) => /\b(Sie|Ihr|Ihre|Ihnen)\b/.test(v)).map(([k]) => k);
    expect(formal).toEqual([]);
  });
});
