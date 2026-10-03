/**
 * VTID-04760 — Audiobook Phase 1: the first impression.
 *
 * Pins what a brand-new member sees and reads:
 *   - the welcome bubbles come from the i18n catalog (never hardcoded English)
 *     and no longer promise a "90-day journey";
 *   - the guided journey is named the Audiobook / Hörbuch everywhere it shows;
 *   - the welcome ends on one clear action, playing Episode 1.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const screens = (locale: string) =>
  JSON.parse(read(`src/i18n/${locale}/screens.json`)).screens as Record<string, Record<string, string>>;

const SPEECH_KEYS = [
  'speechWelcome',
  'speechNoRush',
  'speechAudiobook',
  'speechOrb',
  'speechNavigate',
  'speechActions',
  'speechGetToKnow',
];

describe('onboarding welcome bubbles', () => {
  it.each(['de', 'en'])('every bubble is a %s catalog entry without the 90-day promise', (locale) => {
    const onboarding = screens(locale).onboarding;
    for (const key of SPEECH_KEYS) {
      expect(onboarding[key], `${locale}.onboarding.${key}`).toBeTruthy();
      expect(onboarding[key]).not.toMatch(/90/);
    }
  });

  it('the German bubbles use du-form', () => {
    const onboarding = screens('de').onboarding;
    for (const key of SPEECH_KEYS) expect(onboarding[key]).not.toMatch(/\b(Sie|Ihr|Ihnen)\b/);
  });

  it('the component reads the catalog and carries no hardcoded English sentences', () => {
    const src = read('src/components/onboarding/OnboardingSpeech.tsx');
    for (const key of SPEECH_KEYS) expect(src).toContain(`screens.onboarding.${key}`);
    expect(src).not.toMatch(/90-day/);
    expect(src).not.toMatch(/Welcome to Maxina/);
  });
});

describe('the guided journey is the Audiobook', () => {
  it('names the view Hörbuch / Audiobook and its sessions Folge / Episode', () => {
    const de = screens('de');
    const en = screens('en');
    expect(de.guidedMode.guidedLabel).toBe('Hörbuch');
    expect(en.guidedMode.guidedLabel).toBe('Audiobook');
    expect(de.guidedCatalog.sessionN).toBe('Folge {n}');
    expect(en.guidedCatalog.sessionN).toBe('Episode {n}');
    expect(de.home.longevityJourneyEyebrow).toMatch(/HÖRBUCH/);
    expect(en.home.longevityJourneyEyebrow).toMatch(/AUDIOBOOK/);
  });

  it('voice navigation knows "open my audiobook" means My Journey', () => {
    const registry = JSON.parse(read('src/navigation/registry/screens.json'));
    const journey = registry.screens.find((s: { id: string }) => s.id === 'AUTOPILOT.MY_JOURNEY');
    expect(journey.aliases).toEqual(expect.arrayContaining(['audiobook', 'hoerbuch']));
    expect(journey.i18n.en.phrasings).toContain('open my audiobook');
    expect(journey.i18n.de.phrasings).toContain('öffne mein Hörbuch');
  });
});

describe('the welcome ends on Play Episode 1', () => {
  it('offers Play Episode 1 (into the Audiobook player) and Later after the name form', () => {
    const src = read('src/pages/onboarding/OnboardingWelcome.tsx');
    expect(src).toContain("'/autopilot?audiobook=play'");
    expect(src).toContain('screens.onboarding.playEpisodeOne');
    expect(src).toContain('screens.onboarding.audiobookLater');
    expect(src).toMatch(/setPhase\('start'\)/);
  });

  it('the desktop Journey page shows the episodes', () => {
    const src = read('src/pages/AutopilotDashboard.tsx');
    expect(src).toContain('data-testid="desktop-audiobook"');
  });
});
