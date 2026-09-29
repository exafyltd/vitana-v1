/**
 * VTID-04745 — CSV catalogue import (Commerce Portal).
 *
 * The screen shows the gateway's verdict, never its English sentences: every
 * code the gateway (VTID-04746) can return must have a translation in DE and
 * EN, an unknown code must fall back to a generic message, and the gateway's
 * answers must map onto the right screen state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import de from '@/i18n/de/screens.json';
import en from '@/i18n/en/screens.json';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } } }) } },
}));

import {
  CSV_TEMPLATE,
  FILE_ERROR_CODES,
  LOCAL_ERROR_CODES,
  ROW_ERROR_CODES,
  checkCsvFile,
  errorMessageKey,
  importCatalogueCsv,
  toOutcome,
} from './catalogue-import';

const at = (tree: any, key: string) => key.split('.').reduce((node, part) => node?.[part], tree);

describe('catalogue import: every message is translated', () => {
  it.each([...FILE_ERROR_CODES, ...LOCAL_ERROR_CODES])('file/local code %s has DE and EN text', (code) => {
    const key = errorMessageKey(code, 'file');
    expect(key).toBe(`screens.commerceportal.catalogueImport.errors.${code}`);
    expect(typeof at(de, key)).toBe('string');
    expect(typeof at(en, key)).toBe('string');
  });

  it.each([...ROW_ERROR_CODES])('row code %s has DE and EN text', (code) => {
    const key = errorMessageKey(code, 'row');
    expect(typeof at(de, key)).toBe('string');
    expect(typeof at(en, key)).toBe('string');
  });

  it('an unknown or missing code falls back to a generic translated message (older gateway, new code)', () => {
    expect(errorMessageKey('something_new', 'file')).toBe('screens.commerceportal.catalogueImport.errors.file_generic');
    expect(errorMessageKey(undefined, 'row')).toBe('screens.commerceportal.catalogueImport.errors.invalid_value');
    expect(typeof at(de, errorMessageKey(undefined, 'file'))).toBe('string');
  });

  it('German copy is du-form', () => {
    const text = JSON.stringify(at(de, 'screens.commerceportal.catalogueImport'));
    expect(text).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen)\b/);
  });
});

describe('catalogue import: file checks and template', () => {
  it('accepts a .csv within the limit, rejects other files and oversize ones', () => {
    expect(checkCsvFile({ name: 'products.CSV', size: 1024 })).toBeNull();
    expect(checkCsvFile({ name: 'products.xlsx', size: 1024 })).toBe('not_csv');
    expect(checkCsvFile({ name: 'big.csv', size: 5_000_000 })).toBe('file_too_large');
  });

  it('the template carries every required column and one row per product', () => {
    const [header, ...rows] = CSV_TEMPLATE.split('\n');
    const cols = header.split(',');
    for (const c of ['title', 'price', 'currency', 'affiliate_url', 'origin_country']) expect(cols).toContain(c);
    for (const r of rows) expect(r.split(',')).toHaveLength(cols.length);
  });
});

describe('catalogue import: gateway answers map onto the screen', () => {
  it.each([
    [200, { ok: true, dry_run: true, valid_rows: 3, errors: [] }, true, { kind: 'report', validRows: 3, errors: [] }],
    [201, { ok: true, imported: 3 }, false, { kind: 'imported', imported: 3 }],
    [400, { ok: false, error: 'invalid_csv', code: 'unknown_columns', params: { columns: 'x' } }, true,
      { kind: 'file_error', code: 'unknown_columns', params: { columns: 'x' } }],
    [400, { ok: false, error: 'invalid_csv', message: 'the file is empty' }, true, { kind: 'file_error', code: '', params: {} }],
    [400, { ok: false, error: 'invalid_rows', valid_rows: 1, errors: [{ line: 3, code: 'required' }] }, false,
      { kind: 'row_errors', validRows: 1, errors: [{ line: 3, code: 'required' }] }],
    [409, { ok: false, error: 'CATALOGUE_LOCKED' }, true, { kind: 'locked' }],
    [500, { ok: false, error: 'boom' }, true, { kind: 'failed' }],
  ])('%i %j', (status, body, dryRun, expected) => {
    expect(toOutcome(status as number, body, dryRun as boolean)).toEqual(expected);
  });
});

describe('importCatalogueCsv', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  const reply = (status: number, body: unknown) => ({ status, json: async () => body });

  it('sends the file with dry_run to the org import route', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { ok: true, dry_run: true, valid_rows: 2, errors: [] }));
    const r = await importCatalogueCsv('org-1', 'a,b', true);
    expect(r).toEqual({ kind: 'report', validRows: 2, errors: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/partner-onboarding\/org-1\/catalogue\/products\/import$/);
    expect(JSON.parse(init.body)).toEqual({ csv: 'a,b', dry_run: true });
    expect(init.headers.Authorization).toBe('Bearer t');
  });

  it('creates the org merchant from its registration when there is none yet, then retries once', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(409, { ok: false, error: 'NO_MERCHANT' }))
      .mockResolvedValueOnce(reply(200, { ok: true }))
      .mockResolvedValueOnce(reply(200, { ok: true, dry_run: true, valid_rows: 1, errors: [] }));
    const r = await importCatalogueCsv('org-1', 'a', true);
    expect(r.kind).toBe('report');
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/partner-onboarding\/org-1\/catalogue\/merchant$/);
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('a merchant that cannot be created fails without retrying the import', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(409, { ok: false, error: 'NO_MERCHANT' }))
      .mockResolvedValueOnce(reply(400, { ok: false, error: 'invalid_merchant' }));
    expect(await importCatalogueCsv('org-1', 'a', true)).toEqual({ kind: 'failed' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
