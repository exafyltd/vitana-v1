// VTID-04839 — "Set up with AI": the review card's rules and the apply body.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import {
  applyPayload,
  centsToText,
  draftErrorKey,
  fetchAiSetupEnabled,
  newSetupKey,
  reviewFromDraft,
  reviewProblem,
  textToCents,
  type SetupDraft,
} from './commerce-ai-setup';

const DRAFT: SetupDraft = {
  website: 'https://kraeuter.example/',
  business: { display_name: 'Kräuterhaus', category: 'supplements_nutrition', country: null, description: null, currency: 'EUR' },
  products: [
    { title: 'Kamillentee', description: null, price_cents: 490, currency: null, url: 'https://kraeuter.example/p/k', image: null, kind: 'product' },
    { title: 'Beratung', description: null, price_cents: null, currency: null, url: null, image: null, kind: 'service' },
  ],
  source: 'website',
  notes: [],
};

describe('prices', () => {
  it('round-trips cents and accepts comma decimals', () => {
    expect(centsToText(490)).toBe('4.90');
    expect(centsToText(null)).toBe('');
    expect(textToCents('4.90')).toBe(490);
    expect(textToCents('4,9')).toBe(490);
    expect(textToCents(' 12 ')).toBe(1200);
    expect(textToCents('')).toBeNull();
    expect(textToCents('free')).toBeNull();
  });
});

describe('review', () => {
  it('starts with every product included, missing country from the fallback', () => {
    const r = reviewFromDraft(DRAFT, 'DE');
    expect(r.country).toBe('DE');
    expect(r.products.map((p) => [p.include, p.priceText])).toEqual([[true, '4.90'], [true, '']]);
  });

  it('cannot be created while an included product has no price, a name or a country is missing', () => {
    const r = reviewFromDraft(DRAFT, 'DE');
    expect(reviewProblem(r)).toBe('price');
    r.products[1].include = false;
    expect(reviewProblem(r)).toBeNull();
    expect(reviewProblem({ ...r, displayName: ' ' })).toBe('name');
    expect(reviewProblem({ ...r, country: '' })).toBe('country');
  });

  it('applies only the kept products, with the business currency where a product has none', () => {
    const r = reviewFromDraft(DRAFT, 'DE');
    r.products[1].priceText = '30';
    const body = applyPayload(DRAFT, r, 'ai-setup:k1', null) as any;
    expect(body).toEqual({
      setup_key: 'ai-setup:k1',
      website: 'https://kraeuter.example/',
      business: { display_name: 'Kräuterhaus', category: 'supplements_nutrition', country: 'DE' },
      products: [
        { title: 'Kamillentee', description: null, price_cents: 490, currency: 'EUR', url: 'https://kraeuter.example/p/k', image: null, kind: 'product' },
        { title: 'Beratung', description: null, price_cents: 3000, currency: 'EUR', url: null, image: null, kind: 'service' },
      ],
    });
    r.products[0].include = false;
    expect((applyPayload(DRAFT, r, 'ai-setup:k1', 'org-1') as any).org_id).toBe('org-1');
    expect((applyPayload(DRAFT, r, 'ai-setup:k1', 'org-1') as any).products).toHaveLength(1);
  });

  it('a setup key is fresh per draft', () => {
    expect(newSetupKey(() => 'abc-123-def')).toBe('ai-setup:abc-123-def');
  });
});

describe('status and errors', () => {
  it('treats any failure to read the status as "not switched on"', async () => {
    expect(await fetchAiSetupEnabled(async () => ({ ok: true, enabled: true }))).toBe(true);
    expect(await fetchAiSetupEnabled(async () => ({ ok: true, enabled: false }))).toBe(false);
    expect(await fetchAiSetupEnabled(async () => { throw new Error('AI_SETUP_DISABLED'); })).toBe(false);
  });

  it('maps gateway errors to plain messages', () => {
    expect(draftErrorKey('site_unreachable')).toBe('screens.commerceportal.aiSetup.errorUnreachable');
    expect(draftErrorKey('invalid_url')).toBe('screens.commerceportal.aiSetup.errorUrl');
    expect(draftErrorKey('RATE_LIMITED')).toBe('screens.commerceportal.aiSetup.errorRateLimited');
    expect(draftErrorKey('llm_unavailable')).toBe('screens.commerceportal.aiSetup.errorGeneric');
  });
});

describe('portal and sheet wiring', () => {
  const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
  const portal = read('../pages/CommercePortal.tsx');
  const sheet = read('../components/commerce/AiSetupSheet.tsx');

  it('the portal leads with AI only once the gateway reports it switched on', () => {
    expect(portal).toContain('fetchAiSetupEnabled(adminFetch).then(setAiReady)');
    expect(portal).toContain("variant={aiReady ? 'default' : 'outline'}");
    expect(portal).toContain("t('screens.commerceportal.aiSetup.cta')");
    expect(portal).toContain("t('screens.commerceportal.aiSetup.manualCta')");
    expect(portal).toContain("if (aiReady) setAiSetupOpen(true);");
    expect(portal).toContain('<AiSetupSheet');
  });

  it('only the "Create my business" tap writes; manual stays one tap away', () => {
    expect(sheet.match(/applyDraft\(/g)).toHaveLength(1);
    expect(sheet.slice(sheet.indexOf('const create = async'), sheet.indexOf('const patch ='))).toContain('applyDraft(');
    expect(sheet).toContain('data-testid="ai-create"');
    expect(sheet).toContain('data-testid="ai-prefer-manual"');
    expect(sheet).toContain('<BusinessContext');
  });
});
