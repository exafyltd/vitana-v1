/**
 * VTID-04945 — the public connector docs: every string exists in German (the
 * source of truth) and English, German keeps the du-form, and the page lists
 * exactly the tools the gateway serves.
 */
import { describe, expect, it } from 'vitest';
import { COMMERCE_MCP_TOOL_NAMES } from '@/lib/commerce-mcp';
import deCatalog from '@/i18n/de/commerceConnect.json';
import enCatalog from '@/i18n/en/commerceConnect.json';

// The translation automation adds `_pending_review` markers; they are not strings.
const strings = (c: Record<string, unknown>) => Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith('_'))) as Record<string, string>;
const de = strings(deCatalog.commerceConnect);
const en = strings(enCatalog.commerceConnect);

describe('commerceConnect catalog', () => {
  it('has the same keys in German and English, none empty', () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
    for (const [k, v] of [...Object.entries(de), ...Object.entries(en)]) expect(v.trim(), k).not.toBe('');
  });

  it('describes every tool the page lists, in both languages', () => {
    for (const name of COMMERCE_MCP_TOOL_NAMES) {
      expect(de[`tool_${name}`], `de tool_${name}`).toBeTruthy();
      expect(en[`tool_${name}`], `en tool_${name}`).toBeTruthy();
    }
    const described = Object.keys(en).filter((k) => k.startsWith('tool_')).map((k) => k.slice(5)).sort();
    expect(described).toEqual([...COMMERCE_MCP_TOOL_NAMES].sort());
  });

  it('keeps the German du-form (no Sie/Ihr/Ihnen)', () => {
    for (const [k, v] of Object.entries(de)) expect(v, k).not.toMatch(/\b(Sie|Ihr|Ihre|Ihren|Ihnen)\b/);
  });

  it('promises nothing the connector does not do', () => {
    // No payments, no passwords, drafts only, terms accepted on Vitanaland.
    expect(en.stays4).toMatch(/no payments/i);
    expect(en.step2Body).toMatch(/never give Claude a password/i);
    expect(en.stays3).toMatch(/hidden draft/i);
    expect(en.stays1).toMatch(/Partner Terms/);
  });
});
