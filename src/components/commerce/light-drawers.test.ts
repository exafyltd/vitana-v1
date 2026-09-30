/**
 * VTID-04752 — the drawers and cards opened from the light Commerce Portal
 * follow its light design. "Add a product" (and everything rendered inside
 * it), the connection cards and the org dialogs used hardcoded dark slate
 * literals, so they opened as a dark panel over the light portal. Pins theme
 * tokens instead, the same source-check pattern as the sibling commerce suites.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const FILES = [
  'AddProductSheet',
  'ProductForm',
  'VerticalFieldInput',
  'ProductImageField',
  'ListingStrength',
  'ConnectionCard',
  'ConnectionProgress',
  'PartnerOrgRoster',
  'RegisterOrgDialog',
].map((n) => `src/components/commerce/${n}.tsx`);

describe('commerce drawers and cards use light theme tokens (VTID-04752)', () => {
  it.each(FILES)('%s has no hardcoded slate colour classes', (file) => {
    const classes = read(file).match(/className=(?:"[^"]*"|\{`[^`]*`\})|'[^']*slate-[^']*'/g) ?? [];
    expect(classes.filter((c) => /\b(?:bg|text|border|placeholder:text|hover:bg|hover:text)-slate-\d/.test(c))).toEqual([]);
  });

  it('the Add product sheet takes the portal skin, like the other commerce sheets', () => {
    const src = read('src/components/commerce/AddProductSheet.tsx');
    expect(src).toContain('const { portalClass } = useCommerceSkin();');
    expect(src).toContain('className={`w-full overflow-y-auto sm:max-w-xl ${portalClass}`}');
    expect(src).not.toContain('bg-slate-950');
  });

  it('primary actions use the portal amber-700 button, not the old dark-theme amber-500', () => {
    for (const file of ['ProductForm', 'PartnerOrgRoster', 'RegisterOrgDialog']) {
      const src = read(`src/components/commerce/${file}.tsx`);
      expect(src).not.toContain('bg-amber-500 font-semibold text-slate-950');
      expect(src).toContain('bg-amber-700 font-semibold text-white hover:bg-amber-800');
    }
  });
});
