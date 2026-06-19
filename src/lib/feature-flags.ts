import { runHorizontalCardsA11yTests } from '@/tests/horizontal-cards-a11y.test';
import { runHorizontalCardsRTLTests } from '@/tests/horizontal-cards-rtl.test';

interface FeatureFlags {
  enableHorizontalCardsV2: boolean;
  enableHorizontalCardsReminder: boolean;
  enableHorizontalCardsTimeline: boolean;
  enableHorizontalCardsAIFeed: boolean;
  enableHorizontalCardsSharing: boolean;
  enableUnifiedHorizontalLists: boolean; // Unified list patterns for AI Feed
}

export const FEATURE_FLAGS: FeatureFlags = {
  enableHorizontalCardsV2: true, // Master flag
  enableHorizontalCardsReminder: true, // Pilot 1 - Permanently enabled
  enableHorizontalCardsTimeline: true, // Pilot 2 - Permanently enabled
  enableHorizontalCardsAIFeed: false, // Wave 2
  enableHorizontalCardsSharing: false, // Wave 2
  enableUnifiedHorizontalLists: true, // Unified patterns enabled everywhere
};

let testsPassed = true; // Default true for development

// Run tests before allowing feature flags
export async function validateHorizontalCardsTests(): Promise<boolean> {
  if (testsPassed) return true;

  console.log('[Feature Gate] Running acceptance tests...');

  const a11yPassed = await runHorizontalCardsA11yTests();
  const rtlPassed = await runHorizontalCardsRTLTests();

  testsPassed = a11yPassed && rtlPassed;

  if (testsPassed) {
    console.log('[Feature Gate] ✓ All tests passed. Feature flags can be enabled.');
  } else {
    console.error('[Feature Gate] ✗ Tests failed. Feature flags BLOCKED.');
  }

  return testsPassed;
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  if (!testsPassed && import.meta.env.PROD) {
    console.warn(`[Feature Gate] ${flag} blocked - tests not passed`);
    return false;
  }
  
  return FEATURE_FLAGS[flag] && FEATURE_FLAGS.enableHorizontalCardsV2;
}

// Force enable for development (bypasses tests)
export function forceEnableForDev(flag: keyof FeatureFlags) {
  if (import.meta.env.DEV) {
    console.warn(`[DEV ONLY] Force enabling ${flag}`);
    FEATURE_FLAGS[flag] = true;
    testsPassed = true;
  }
}

export function setTestsPassed(passed: boolean) {
  testsPassed = passed;
}

/**
 * VTID-03319 — unified "All News" home feed (feed v2). Standalone, env-driven
 * flag (independent of the horizontal-cards gate above). Defaults ON so it can
 * be exercised on staging; set VITE_FEED_V2_ENABLED="false" to fall back to the
 * timestamp-merged legacy feed.
 */
export function isFeedV2Enabled(): boolean {
  return import.meta.env.VITE_FEED_V2_ENABLED !== "false";
}
