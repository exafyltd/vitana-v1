/**
 * VTID-04055 — source-check for the Commerce Portal light redesign. Owner
 * feedback on two staging screenshots: cluttered, dark, CTAs blended with
 * explanatory text. Pins the structural decisions a browser test can't
 * cheaply assert (theme tokens vs. hardcoded dark literals, CTA hierarchy,
 * that VTID-03989's returning-member org hoist survived the restructure).
 * Same source-check pattern as the sibling commerce/drawer suites.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('CommerceShell is light, not dark, and easily revertible (VTID-04055)', () => {
  const src = read('src/components/commerce/CommerceShell.tsx');

  it('drops the dark wrapper and renders the portal branch in theme tokens', () => {
    expect(src).toContain('<div className="min-h-screen bg-background text-foreground">');
    expect(src).not.toContain('className="dark');
    expect(src).not.toContain('bg-slate-950');
    expect(src).not.toContain('text-slate-100');
  });

  it('portalClass is unconditionally empty, kept as a named export for a future revert', () => {
    expect(src).toContain("return { inApp, portalClass: '' };");
  });

  it('the in-app (MAXINA phone) branch is untouched', () => {
    expect(src).toContain('<AppLayout>');
    expect(src).toContain('<div className="mx-auto w-full max-w-5xl px-4 pb-24">{children}</div>');
  });

  it('VTID-04079: the desktop/host container is max-w-7xl, matching every other full page in the app (Home/Discover/Health/Wallet/AI), not the narrower max-w-6xl it shipped with', () => {
    expect(src).not.toContain('max-w-6xl');
    expect(src).toContain('max-w-7xl items-center gap-2.5 px-4 py-3.5');
    expect(src).toContain('max-w-7xl px-4 pb-20');
  });
});

describe('AgentConnectCard is a light elevated card with a loud CTA (VTID-04055)', () => {
  const src = read('src/components/commerce/AgentConnectCard.tsx');

  it('uses theme tokens for the card surface, not hardcoded dark literals', () => {
    expect(src).toContain('bg-card p-5');
    expect(src).not.toContain('bg-slate-900');
    expect(src).not.toContain('text-slate-100');
  });

  it('carries a "Recommended" badge distinct from the status pill', () => {
    expect(src).toContain("t('screens.commerceportal.agentConnect.recommendedBadge')");
    expect(src).toContain("t('screens.commerceportal.agentStatusPill')");
  });

  it('the copy-URL button is the loud, solid element on the card', () => {
    expect(src).toContain('bg-amber-700 px-5 font-semibold text-white');
  });
});

describe('CommercePortal hero: two real, distinct CTAs, nothing blended with text (VTID-04055)', () => {
  const src = read('src/pages/CommercePortal.tsx');
  // Skip the file's own doc comment, which quotes these markers in prose.
  const jsxStart = src.indexOf('return (\n    <CommerceShell>');
  const heroCopyStart = src.indexOf('const heroCopy = (twoColumn: boolean) => (');
  const agentCardFnStart = src.indexOf('const agentCard = (className: string) => (');
  // heroCopy/agentCard are defined once, above `return (`, and called from
  // inside the hero JSX below — the buttons/card live in these two function
  // bodies, not inlined at each call site.
  const heroCopyFn = src.slice(heroCopyStart, agentCardFnStart);
  const heroStart = src.indexOf('{/* HERO', jsxStart);
  const heroEnd = src.indexOf('{hasOrgs && orgsSection}', jsxStart);
  const heroJsx = src.slice(heroStart, heroEnd);
  const hoistedOrgs = heroEnd;
  const standaloneAgentCard = src.indexOf("agentCard('mx-auto mt-8 max-w-3xl scroll-mt-24 md:mt-10')", jsxStart);
  const originalOrgs = src.indexOf('{!hasOrgs && orgsSection}', jsxStart);

  it('markers are all present and in the VTID-03989 order (returning members see their org before the pitch)', () => {
    expect(jsxStart).toBeGreaterThan(-1);
    expect(heroCopyStart).toBeGreaterThan(-1);
    expect(agentCardFnStart).toBeGreaterThan(heroCopyStart);
    expect(heroStart).toBeGreaterThan(-1);
    expect(hoistedOrgs).toBeGreaterThan(-1);
    expect(standaloneAgentCard).toBeGreaterThan(-1);
    expect(originalOrgs).toBeGreaterThan(-1);
    // The returning-member card still renders AFTER the hoisted org section,
    // i.e. below it in the page, same order VTID-03989 established.
    expect(hoistedOrgs).toBeLessThan(standaloneAgentCard);
    expect(originalOrgs).toBeGreaterThan(standaloneAgentCard);
    // And it's gated on hasOrgs, not unconditional — a returning member
    // never sees it duplicated from the hero above.
    expect(src.slice(standaloneAgentCard - 20, standaloneAgentCard)).toContain('hasOrgs &&');
  });

  it('the hero copy renders exactly the two real CTA buttons and no eyebrow pill any more', () => {
    expect((heroCopyFn.match(/<Button/g) ?? []).length).toBe(2);
    expect(heroCopyFn).toContain("t('screens.commerceportal.agentConnect.title')");
    expect(heroCopyFn).toContain("t('screens.commerceportal.orgOnboarding.registerCta')");
    expect(heroCopyFn).not.toContain('<AgentConnectCard');
    expect(src).not.toContain("t('screens.commerceportal.portalEyebrow')");
  });

  it('VTID-04079: a first-time visitor (!hasOrgs) gets the agent card embedded beside the hero copy at lg:, a returning member (hasOrgs) does not', () => {
    expect(heroJsx).toContain('hasOrgs ? (');
    expect(heroJsx).toContain('heroCopy(false)');
    expect(heroJsx).toContain('heroCopy(true)');
    expect(heroJsx).toContain("agentCard('mt-10 hidden scroll-mt-24 lg:mt-0 lg:block')");
    // The card call sits inside the `!hasOrgs` branch of the ternary, i.e.
    // after the `) : (` — not unconditional.
    const ternaryElse = heroJsx.indexOf(') : (');
    const cardCallInHero = heroJsx.indexOf("agentCard('mt-10");
    expect(cardCallInHero).toBeGreaterThan(ternaryElse);
  });

  it('the primary CTA scrolls to the agent card instead of duplicating its state', () => {
    expect(src).toContain('agentCardRef.current?.scrollIntoView');
    expect(src).toContain('ref={agentCardRef}');
    expect(heroCopyFn).toContain('onClick={scrollToAgentCard}');
  });

  it('"your organizations" is no longer lost on a narrow desktop/host window when the visitor has no org yet', () => {
    // Previously nested inside the lg:-only merchant-integration block, so a
    // first-time visitor on a <1024px browser window saw no register CTA at
    // all. Now renders unconditionally, same as the hasOrgs===true branch
    // already did.
    const lgOnlyBlockEnd = src.indexOf('</div>\n\n      {!hasOrgs && orgsSection}');
    expect(lgOnlyBlockEnd).toBeGreaterThan(-1);
    expect(originalOrgs).toBeGreaterThan(lgOnlyBlockEnd);
  });
});

describe('CommercePortal manual-options card: two equal real buttons, not a solid button next to a ghost link (VTID-04055)', () => {
  const src = read('src/pages/CommercePortal.tsx');
  const start = src.indexOf('PREFER TO DO IT YOURSELF');
  const end = src.indexOf('YOUR CONNECTIONS');
  const section = src.slice(start, end);

  it('renders two real buttons for Add products / Connect via API', () => {
    expect(start).toBeGreaterThan(-1);
    expect((section.match(/<Button/g) ?? []).length).toBe(2);
    expect(section).not.toContain('variant="ghost"');
    expect(section).toContain("t('screens.commerceportal.addProduct')");
    expect(section).toContain("t('screens.commerceportal.manualCta')");
  });
});

describe('ManualConnectDialog and ConnectionWorkbench follow the shell into theme tokens (VTID-04055)', () => {
  it('neither file references a hardcoded dark slate literal anymore', () => {
    const manual = read('src/components/commerce/ManualConnectDialog.tsx');
    const workbench = read('src/components/commerce/ConnectionWorkbench.tsx');
    expect(manual).not.toContain('slate-');
    expect(workbench).not.toContain('slate-');
    expect(manual).toContain('border-border bg-card text-foreground');
    expect(workbench).toContain("const panelClass = 'rounded-2xl border border-border bg-card p-4';");
  });
});
