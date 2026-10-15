/**
 * VTID-05210 — where the Vitana cards sit on the own profile (/me/profile).
 * Source checks in the same style as `CommerceAcceptInvite.routing.test.ts`:
 * facts about EditProfilePage's layout, rather than a render test of a page
 * with dozens of providers. The browser check is the staging spec
 * `tests/e2e/staging/vtid-05210-profile-card-placement.staging.spec.ts`.
 *
 * Owner 2026-10-15: the member's profile comes first; the cards sit in the
 * enrich-your-profile zone next to the Cover Library tile — mobile in the
 * Posts tab after the Autopilot banner, desktop below <ProfileLayout>.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(resolve(__dirname, './EditProfilePage.tsx'), 'utf8');

// The page has an early-return mobile branch, then the desktop return.
const desktopStart = src.indexOf('// Desktop layout');
const mobile = src.slice(src.indexOf('if (isMobile) {'), desktopStart);
const desktop = src.slice(desktopStart);

const STACKED = '<EnrichmentCardStrip screen="profile" layout="stacked" only="features" />';
const CAROUSEL = '<EnrichmentCardStrip screen="profile" layout="carousel" maxCards={PROFILE_ENRICHMENT_CARDS.length} only="server" />';

function count(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

describe('EditProfilePage card placement (VTID-05210)', () => {
  it('splits into a mobile and a desktop branch the checks below rely on', () => {
    expect(desktopStart).toBeGreaterThan(0);
    expect(mobile).toContain('<MobileIdCardSwitcher');
    expect(desktop).toContain('<ProfileLayout');
  });

  it('mounts the two profile strips exactly once per layout, and nowhere else', () => {
    expect(count(mobile, STACKED)).toBe(1);
    expect(count(mobile, CAROUSEL)).toBe(1);
    expect(count(desktop, STACKED)).toBe(1);
    expect(count(desktop, CAROUSEL)).toBe(1);
    expect(count(src, '<EnrichmentCardStrip')).toBe(4);
  });

  it('mobile: the cards come after the ID card, the stats and the tabs — in the Posts tab, after the Autopilot banner, before the Cover Library tile and the posts', () => {
    const at = (s: string) => mobile.indexOf(s);
    const stacked = at(STACKED);
    expect(at('<MobileIdCardSwitcher')).toBeLessThan(stacked);
    expect(at('<MobileProfileStats')).toBeLessThan(stacked);
    expect(at('<MobileProfileTabs')).toBeLessThan(stacked);
    expect(at('mobileActiveTab === "posts"')).toBeLessThan(stacked);
    expect(at('<MobileAutopilotBanner')).toBeLessThan(stacked);
    // G1 first, then the carousel, then the Cover Library tile, then the posts.
    expect(stacked).toBeLessThan(at(CAROUSEL));
    expect(at(CAROUSEL)).toBeLessThan(at('setCoverLibraryDrawerOpen(true)}'));
    expect(at(CAROUSEL)).toBeLessThan(at('<ProfilePostsTab'));
    // Still inside the Posts tab: no other tab starts in between.
    expect(at(CAROUSEL)).toBeLessThan(at('mobileActiveTab === "about"'));
  });

  it('desktop: the cards come after the whole <ProfileLayout>, before the Cover Library tile', () => {
    const at = (s: string) => desktop.indexOf(s);
    const layoutEnd = desktop.indexOf('/>', at('<ProfileLayout'));
    expect(layoutEnd).toBeLessThan(at(STACKED));
    expect(at(STACKED)).toBeLessThan(at(CAROUSEL));
    expect(at(CAROUSEL)).toBeLessThan(at('setCoverLibraryDrawerOpen(true)}'));
  });
});
