/**
 * VTID-05119 — `_shared/read-json-body.ts` is a strict body parser: it reports
 * an empty body, a JSON object, or an invalid body, and never substitutes a
 * default. `fetch-user-context` used a bare `await req.json()` that threw on
 * the bodyless call from `generate-enhanced-recommendations` and answered 500.
 */
import { describe, it, expect } from 'vitest';
import { readJsonBody } from '../../supabase/functions/_shared/read-json-body.ts';

const post = (body?: string) =>
  new Request('https://example.test/fn', { method: 'POST', body });

describe('VTID-05119 readJsonBody', () => {
  it('reports an empty body as empty', async () => {
    expect(await readJsonBody(post())).toEqual({ kind: 'empty' });
    expect(await readJsonBody(post(''))).toEqual({ kind: 'empty' });
  });

  it('reports a whitespace-only body as empty', async () => {
    expect(await readJsonBody(post('  \n\t '))).toEqual({ kind: 'empty' });
  });

  it('returns a JSON object with its values', async () => {
    expect(await readJsonBody(post('{"userId":"u1","forceRefresh":true}'))).toEqual({
      kind: 'json',
      value: { userId: 'u1', forceRefresh: true },
    });
  });

  for (const body of ['not json', '[1]', '"x"', '3', 'null']) {
    it(`reports ${JSON.stringify(body)} as invalid`, async () => {
      expect(await readJsonBody(post(body))).toEqual({ kind: 'invalid' });
    });
  }
});
