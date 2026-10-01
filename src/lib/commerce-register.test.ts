/** VTID-04793 — registration without a short-name field. */
import { describe, expect, it } from 'vitest';
import { isValidWebsite, normalizeWebsite, orgKeyCandidate, registerBusiness, MAX_KEY_ATTEMPTS } from './commerce-register';

const input = { displayName: 'Müller & Söhne GmbH', category: 'general_commerce', commerceVertical: 'general' as const, website: 'mueller.de', country: 'DE' };

describe('website', () => {
  it('adds https:// to a bare domain and keeps blank blank', () => {
    expect(normalizeWebsite('mueller.de')).toBe('https://mueller.de');
    expect(normalizeWebsite(' http://a.example ')).toBe('http://a.example');
    expect(normalizeWebsite('   ')).toBe('');
  });
  it('accepts what the gateway accepts (http/https), optional', () => {
    expect(isValidWebsite('')).toBe(true);
    expect(isValidWebsite('shop.example.com')).toBe(true);
    expect(isValidWebsite('not a site')).toBe(false);
    expect(isValidWebsite('ftp://a.example')).toBe(false);
  });
});

describe('orgKeyCandidate', () => {
  it('is the slug of the name first, then the slug with a suffix', () => {
    expect(orgKeyCandidate('Müller & Söhne GmbH', 0)).toBe('muller-sohne-gmbh');
    expect(orgKeyCandidate('Müller & Söhne GmbH', 1, () => 'x7k2')).toBe('muller-sohne-gmbh-x7k2');
  });
  it('a name without Latin letters still gets a valid key', () => {
    expect(orgKeyCandidate('متجر الصحة', 0, () => 'ab12')).toBe('business-ab12');
  });
});

describe('registerBusiness', () => {
  it('sends name, category, vertical, country and the normalized website in one call', async () => {
    const calls: any[] = [];
    await registerBusiness('/api/v1/partner-orgs', input, async (path, init) => {
      calls.push([path, JSON.parse(String(init.body))]);
      return { organization: { id: 'o1' } };
    });
    expect(calls).toEqual([[
      '/api/v1/partner-orgs/register',
      { org_key: 'muller-sohne-gmbh', display_name: 'Müller & Söhne GmbH', org_type: 'general_commerce', commerce_vertical: 'general', country: 'DE', website: 'https://mueller.de' },
    ]]);
  });

  it('retries a short-name clash with a new key, and only that', async () => {
    const keys: string[] = [];
    const res = await registerBusiness('/x', input, async (_p, init) => {
      const key = JSON.parse(String(init.body)).org_key;
      keys.push(key);
      if (keys.length < 3) throw new Error('org_key already taken');
      return { organization: { id: 'o1', org_key: key } };
    }, () => 'z9z9');
    expect(keys).toEqual(['muller-sohne-gmbh', 'muller-sohne-gmbh-z9z9', 'muller-sohne-gmbh-z9z9']);
    expect(res.organization.id).toBe('o1');
  });

  it('gives up after a few clashes and surfaces any other error at once', async () => {
    let n = 0;
    await expect(registerBusiness('/x', input, async () => { n++; throw new Error('org_key already taken'); })).rejects.toThrow('already taken');
    expect(n).toBe(MAX_KEY_ATTEMPTS);
    n = 0;
    await expect(registerBusiness('/x', input, async () => { n++; throw new Error('website must be an http(s) URL'); })).rejects.toThrow('website');
    expect(n).toBe(1);
  });

  it('omits the website when none was given', async () => {
    let body: any;
    await registerBusiness('/x', { ...input, website: '' }, async (_p, init) => { body = JSON.parse(String(init.body)); return {}; });
    expect('website' in body).toBe(false);
  });
});
