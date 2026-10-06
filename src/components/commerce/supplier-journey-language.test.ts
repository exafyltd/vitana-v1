/**
 * VTID-04796 — owner rule: the normal supplier journey never speaks in
 * technical terms. Connector/provider IDs, jurisdiction, OpenAPI, MCP,
 * mapping and sandbox belong under Advanced / Developer settings only.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const en = JSON.parse(read('../../i18n/en/screens.json')).screens.commerceportal;
const de = JSON.parse(read('../../i18n/de/screens.json')).screens.commerceportal;

const TECHNICAL = /connector|provider id|provider-id|jurisdiction|rechtsordnung|openapi|\bmcp\b|mapping|sandbox|kebab/i;

/** Copy a supplier sees on the main path (Developer-settings keys excluded on purpose). */
function journeyStrings(c: any): string[] {
  const pick = (o: any, keys?: string[]) =>
    Object.entries(o ?? {})
      .filter(([k, v]) => typeof v === 'string' && (!keys || keys.includes(k)))
      .map(([, v]) => v as string);
  return [
    ...pick(c, ['heroTitle', 'heroSubtitle', 'guestCta', 'guestCtaHint', 'howItWorksTitle', 'step1Title', 'step1Body', 'step2Title', 'step2Body', 'step3Title', 'step3Body', 'footNote', 'agentPromise', 'agentStatusDetail', 'forBusiness', 'forBusinessLabel']),
    ...pick(c.join),
    ...pick(c.setupHub),
    ...pick(c.setupChooser),
    ...pick(c.addOffer),
    ...pick(c.salesSetup),
    // VTID-04839: the AI setup sheet is the main path now.
    ...pick(c.aiSetup),
    ...pick(c.connect, ['title', 'intro', 'urlLabel', 'check', 'detected', 'detectedBody', 'detectedNoOrg', 'connect', 'notDetected', 'haveDocs', 'needHelp', 'customApi', 'created']),
    ...pick(c.orgOnboarding, ['wizardStep1Title', 'wizardStep2Title', 'create', 'website', 'websiteHint', 'country', 'successTitle', 'successBody', 'successCta', 'sectionTitle']),
  ];
}

describe('supplier journey language', () => {
  for (const [lang, c] of [['en', en], ['de', de]] as const) {
    it(`${lang}: no technical terms on the main path`, () => {
      const offenders = journeyStrings(c).filter((s) => TECHNICAL.test(s));
      expect(offenders).toEqual([]);
    });
  }

  // VTID-04894 — owner decision 2026-10-05: a narrow exception. The pre-login
  // Commerce landing (screens.commerceportal.guest.*) may say "MCP", because
  // prospective suppliers need to understand how the one-step setup works.
  // Developer terms stay banned there too; the onboarding flow above keeps
  // the full rule, MCP included.
  const GUEST_PAGE_TECHNICAL =
    /connector|provider id|provider-id|jurisdiction|rechtsordnung|openapi|oauth|\bscopes?\b|\btokens?\b|endpoint|api key|api-schlüssel|mapping|sandbox|kebab/i;
  const guestStrings = (c: any): string[] => Object.values(c.guest ?? {}).filter((v): v is string => typeof v === 'string');

  for (const [lang, c] of [['en', en], ['de', de]] as const) {
    it(`${lang}: the pre-login landing may name MCP, never developer terms`, () => {
      const strings = guestStrings(c);
      expect(strings.length).toBeGreaterThan(0);
      expect(strings.filter((s) => GUEST_PAGE_TECHNICAL.test(s))).toEqual([]);
      expect(strings.some((s) => /\bMCP\b/.test(s))).toBe(true);
    });

    it(`${lang}: the exception is narrow — MCP stays out of the onboarding flow`, () => {
      expect(journeyStrings(c).filter((s) => /\bmcp\b/i.test(s))).toEqual([]);
      expect(Object.keys(c.guest ?? {}).length).toBeGreaterThan(0);
      // The guest keys are not part of the onboarding set checked above.
      expect(journeyStrings(c)).not.toContain(c.guest.oneStepLead);
    });
  }

  it('connection cards show the platform name, never connector · provider IDs', () => {
    for (const f of ['./ConnectionCard.tsx', './ConnectionWorkbench.tsx']) {
      const src = read(f);
      expect(src).toContain('platformName(');
      expect(src).not.toMatch(/connector_id\} · \{\w+\.provider_id/);
    }
  });

  it('the MCP address and assistant steps sit behind the AI card’s Advanced toggle', () => {
    const src = read('./AgentConnectCard.tsx');
    const toggle = src.indexOf('{advancedOpen && (');
    expect(toggle).toBeGreaterThan(-1);
    expect(src.indexOf('{MCP_SERVER_URL}')).toBeGreaterThan(toggle);
    expect(src.indexOf('<Tabs defaultValue="claude"')).toBeGreaterThan(toggle);
  });

  it('every setup sheet names the business it is working on', () => {
    for (const f of ['./SetupChooser.tsx', './ManualConnectDialog.tsx']) expect(read(f)).toContain('<BusinessContext');
    expect(read('./SalesSetupSheet.tsx')).toContain('{org.display_name}');
    expect(read('./AddProductSheet.tsx')).toContain('addingToName');
  });
});
