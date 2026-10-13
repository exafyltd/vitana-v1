// VTID-05157 — the generated native catalog map mirrors the shard files on disk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generate, listShards } from '../gen-i18n-map.mjs';
import { tree } from './fixture.mjs';

test('lists exactly the shard files on disk, without _audit.json, in sorted order', () => {
  const fx = tree({
    'src/i18n/de/b.json': '{"b":{}}',
    'src/i18n/de/a.json': '{"a":{}}',
    'src/i18n/de/_audit.json': '{}',
    'src/i18n/en/a.json': '{"a":{}}',
    'src/i18n/en/en_audit.json': '{}',
    'src/i18n/index.ts': '// not a locale',
    'src/i18n/empty/.keep': '',
  });
  try {
    assert.deepEqual(listShards(join(fx.root, 'src/i18n')), { de: ['a.json', 'b.json'], en: ['a.json'] });
    const out = join(fx.root, 'apps/mobile/src/i18n/catalog-map.generated.ts');
    const r = generate({ i18nDir: join(fx.root, 'src/i18n'), out });
    assert.deepEqual(r.locales, ['de', 'en']);
    assert.equal(r.files, 3);
    const text = readFileSync(out, 'utf8');
    assert.ok(text.includes('require("../../../../src/i18n/de/a.json")'));
    assert.ok(text.includes('require("../../../../src/i18n/de/b.json")'));
    assert.ok(!/_audit\.json"/.test(text), 'no audit file is listed or required');
    assert.ok(text.indexOf('de/a.json') < text.indexOf('de/b.json'));
    const again = generate({ i18nDir: join(fx.root, 'src/i18n'), out });
    assert.equal(again.changed, false);
    assert.equal(readFileSync(out, 'utf8'), text, 'a second run writes the same bytes');
  } finally { fx.cleanup(); }
});
