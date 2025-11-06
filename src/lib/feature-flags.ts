interface FeatureFlags {
  enableHorizontalCardsV2: boolean;
  enableHorizontalCardsReminder: boolean;
  enableHorizontalCardsTimeline: boolean;
  enableHorizontalCardsAIFeed: boolean;
  enableHorizontalCardsSharing: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  enableHorizontalCardsV2: true, // Master flag
  enableHorizontalCardsReminder: true, // Pilot 1 - enabled for testing
  enableHorizontalCardsTimeline: true, // Pilot 2 - enabled for testing
  enableHorizontalCardsAIFeed: false, // Wave 2
  enableHorizontalCardsSharing: false, // Wave 2
};

let testsPassed = true; // Default true for development

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  if (!testsPassed && process.env.NODE_ENV === 'production') {
    console.warn(`[Feature Gate] ${flag} blocked - tests not passed`);
    return false;
  }
  
  return FEATURE_FLAGS[flag] && FEATURE_FLAGS.enableHorizontalCardsV2;
}

// Force enable for development (bypasses tests)
export function forceEnableForDev(flag: keyof FeatureFlags) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[DEV ONLY] Force enabling ${flag}`);
    FEATURE_FLAGS[flag] = true;
    testsPassed = true;
  }
}

export function setTestsPassed(passed: boolean) {
  testsPassed = passed;
}
