// VTID-04894 — the pre-login Commerce landing tells the story; the
// getting-started steps live there and only there (owner decision 2026-10-05).
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const portal = read('src/pages/CommercePortal.tsx');
const landing = read('src/components/commerce/CommerceGuestLanding.tsx');
const LOCALES = ['de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh', 'ar'];
const GUEST_KEYS = [
  'heroTitle', 'heroSubtitle', 'heroTagline', 'whyTitle',
  'why1Title', 'why1Body', 'why2Title', 'why2Body', 'why3Title', 'why3Body',
  'oneStepTitle', 'oneStepLead', 'oneStepBody', 'oneStepWorksWith', 'oneStepControl',
  'flow1', 'flow2', 'flow3', 'flow4', 'whatIsMcp', 'whatIsMcpBody', 'closingTitle', 'closingBody',
];

describe('the steps belong to the pre-login landing only', () => {
  it('is rendered once, handed to the guest landing — not in the signed-in block', () => {
    const uses = portal.split('whatHappensNextSection').length - 1;
    expect(uses).toBe(2); // the definition and the guest landing's `steps` prop
    expect(portal).toContain('steps={whatHappensNextSection}');
    const signedIn = portal.slice(portal.indexOf('<div className="hidden lg:block">'));
    expect(signedIn).not.toContain('{whatHappensNextSection}');
  });
});

describe('the guest hero opens the story', () => {
  const hero = portal.slice(portal.indexOf('{!user ? ('), portal.indexOf(') : hasOrgs || aiReady || mcpReady ? ('));

  it('uses guest-only copy, so the signed-in hero keeps heroTitle/heroSubtitle', () => {
    expect(hero).toContain("t('screens.commerceportal.guest.heroTitle')");
    expect(hero).toContain("t('screens.commerceportal.guest.heroSubtitle')");
    expect(hero).not.toContain("t('screens.commerceportal.heroSubtitle')");
    expect(portal).toContain("t('screens.commerceportal.heroSubtitle')"); // still the signed-in hero
  });

  it('the tagline and "Connect your AI agent" appear only once the connection is live; still one button', () => {
    expect(hero).toContain("{mcpReady && (");
    expect(hero).toContain("t('screens.commerceportal.guest.heroTagline')");
    expect(hero).toContain("mcpReady ? t('screens.commerceportal.mcpConnect.cta') : t('screens.commerceportal.guestCta')");
    expect((hero.match(/<Button/g) ?? []).length).toBe(1);
  });

  it('guests check readiness in their own effect; the signed-in effect is unchanged', () => {
    expect(portal).toContain('if (user) return;\n    void fetchMcpReady().then(setMcpReady);\n  }, [user]);');
    expect(portal).toContain('if (!user) return;\n    void load();');
  });
});

describe('the landing sections', () => {
  it('runs why → one step (only when live) → steps → closing', () => {
    const order = ['data-testid="guest-why"', '{mcpReady && (', 'data-testid="guest-one-step"', '{steps}', 'data-testid="guest-closing"'];
    const at = order.map((s) => landing.indexOf(s));
    at.forEach((i) => expect(i).toBeGreaterThan(-1));
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('explains the four-step flow and "What is MCP?", collapsed, without showing the address', () => {
    for (const k of ['flow1', 'flow2', 'flow3', 'flow4']) expect(landing).toContain(`\`\${K}.${k}\``);
    expect(landing).toContain('aria-expanded={whatIsOpen}');
    expect(landing).toContain('const [whatIsOpen, setWhatIsOpen] = useState(false);');
    expect(landing).not.toContain('COMMERCE_MCP_URL');
  });

  it('is laid out with logical properties (RTL)', () => {
    expect(landing).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(landing).toContain('rtl:rotate-180');
  });
});

describe('copy in every shipped locale', () => {
  for (const loc of LOCALES) {
    it(`${loc}: every guest key is present and non-empty`, () => {
      const c = JSON.parse(read(`src/i18n/${loc}/screens.json`)).screens.commerceportal;
      for (const k of GUEST_KEYS) expect(typeof c.guest?.[k] === 'string' && c.guest[k].length > 0).toBe(true);
    });
  }

  it('de is du-form', () => {
    const de = JSON.parse(read('src/i18n/de/screens.json')).screens.commerceportal.guest;
    expect(Object.values(de).filter((v) => /\b(Sie|Ihr|Ihre|Ihnen)\b/.test(v as string))).toEqual([]);
  });
});
