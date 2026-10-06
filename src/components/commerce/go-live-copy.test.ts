/**
 * VTID-04769 — products a supplier adds appear in Discover once the business
 * is activated (a database gate in vitana-platform, migration
 * 20261001120000). The portal used to promise a per-product review that does
 * not exist; this pins the copy to what actually happens, in DE (source of
 * truth) and EN.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const portal = (loc: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), `src/i18n/${loc}/screens.json`), 'utf8')).screens.commerceportal;

describe('Commerce Portal go-live copy matches the go-live gate (VTID-04769)', () => {
  it.each([
    ['de', /Discover/, /freigeschaltet/],
    ['en', /Discover/, /activated/],
  ])('%s: product form and CSV import say products appear once the business is activated', (loc, discover, activated) => {
    const c = portal(loc);
    for (const text of [c.productForm.reviewNote, c.catalogueImport.subtitle, c.catalogueImport.done, c.catalogueImport.entrySubtitle]) {
      expect(text).toMatch(discover);
      expect(text).toMatch(activated);
    }
  });

  it('no longer promises a per-product review or drafts', () => {
    const de = portal('de');
    const en = portal('en');
    expect(`${de.catalogueImport.subtitle} ${de.catalogueImport.done}`).not.toMatch(/Entw(u|ü)rf/);
    expect(`${en.catalogueImport.subtitle} ${en.catalogueImport.done}`).not.toMatch(/draft|reviewed/i);
  });

  it('keeps du-form in German', () => {
    const de = portal('de');
    for (const text of [de.productForm.reviewNote, de.catalogueImport.subtitle, de.catalogueImport.done]) {
      expect(text).not.toMatch(/\b(Sie|Ihr|Ihnen)\b/);
    }
  });
});
