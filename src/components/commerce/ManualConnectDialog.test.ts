/** VTID-04796 — "Connect your system": one URL first, technical fields under Developer settings. */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { parseOpenApi } from './ManualConnectDialog';

const src = readFileSync(resolve(__dirname, './ManualConnectDialog.tsx'), 'utf8');

describe('parseOpenApi', () => {
  it('empty means no document; an object is kept; anything else is refused', () => {
    expect(parseOpenApi('  ')).toBeNull();
    expect(parseOpenApi('{"openapi":"3.0.0"}')).toEqual({ openapi: '3.0.0' });
    expect(() => parseOpenApi('[1]')).toThrow();
    expect(() => parseOpenApi('not json')).toThrow();
  });
});

describe('ManualConnectDialog', () => {
  it('a detected platform connects to the registered business, which supplies name and jurisdiction', () => {
    expect(src).toContain('`${PARTNER_ONBOARDING_API}/${org.id}/connections`');
    expect(src).toContain('JSON.stringify({ connector_id, provider_id, ...(openapi_document ? { openapi_document } : {}) })');
  });

  it('keeps the original developer path for someone without a business', () => {
    expect(src).toContain('`${MY_PORTAL_API}/connections`');
    expect(src).toContain('jurisdiction: form.jurisdiction.trim() || undefined');
  });

  it('connector ID, provider ID and OpenAPI only appear inside Developer settings', () => {
    const dev = src.indexOf('ADVANCED / DEVELOPER SETTINGS');
    expect(dev).toBeGreaterThan(-1);
    for (const key of ['partnerportal.connectorId', 'partnerportal.providerId', 'connect.uploadOpenapi', 'connect.pasteOpenapi']) {
      expect(src.indexOf(key)).toBeGreaterThan(dev);
    }
    expect(src).toContain('{devOpen && (');
  });

  it('not recognised offers documentation or help, and is a full-screen sheet on phones', () => {
    expect(src).toContain("t('screens.commerceportal.connect.haveDocs')");
    expect(src).toContain('to="/support"');
    expect(src).toContain('<ResponsiveDialogContent fullscreenOnMobile');
    expect(src).not.toContain("from '@/components/ui/dialog'");
  });
});
