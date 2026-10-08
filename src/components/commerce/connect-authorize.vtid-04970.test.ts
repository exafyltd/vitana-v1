/**
 * VTID-04970 — the consent screen tells the supplier where the assistant's
 * authorization code goes, and "Connect with ChatGPT" exists only once a
 * listing link is configured. Source pins, like the neighbouring commerce
 * tests: the pages need a live OAuth request to render.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const LOCALES = readdirSync(resolve(process.cwd(), 'src/i18n')).filter((d) => /^[a-z]{2}$/.test(d));

describe('consent screen redirect host', () => {
  const page = read('src/pages/CommerceConnectAuthorize.tsx');
  it('derives the host from the registered redirect and shows it before the decision buttons', () => {
    expect(page).toContain('redirectHostOf(view.details.redirectUri)');
    expect(page).toContain('data-testid="connect-redirect-host"');
    expect(page.indexOf('connect-redirect-host')).toBeLessThan(page.indexOf('connect-approve'));
  });
  it('has the sentence in every shipped locale, with the host placeholder', () => {
    expect(LOCALES.length).toBeGreaterThanOrEqual(11);
    for (const l of LOCALES) {
      const j = JSON.parse(read(`src/i18n/${l}/screens.json`));
      const s = j.screens?.commerceconnect?.redirectsTo ?? j.commerceconnect?.redirectsTo;
      expect(typeof s, l).toBe('string');
      expect(s, l).toContain('{{host}}');
    }
  });
});

describe('Connect with ChatGPT button', () => {
  const landing = read('src/components/commerce/CommerceGuestLanding.tsx');
  it('renders only when a listing link is configured, as an external link', () => {
    expect(landing).toContain('const chatgptUrl = chatgptPluginUrl();');
    expect(landing).toMatch(/\{chatgptUrl && \(/);
    expect(landing).toContain('rel="noopener noreferrer"');
    expect(landing).toContain('data-testid="guest-connect-chatgpt"');
  });
  it('keeps the manual connect path as the main button', () => {
    expect(landing).toContain("t('screens.commerceportal.mcpConnect.cta')");
  });
  it('has the label in every shipped locale', () => {
    for (const l of LOCALES) {
      const j = JSON.parse(read(`src/i18n/${l}/screens.json`));
      const s = j.screens?.commerceportal?.mcpConnect?.chatgptCta ?? j.commerceportal?.mcpConnect?.chatgptCta;
      expect(typeof s, l).toBe('string');
      expect(s.length, l).toBeGreaterThan(3);
    }
  });
});
