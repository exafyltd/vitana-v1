/**
 * Dev Hub Configuration & Feature Flags
 * Phase 1: Read-only shell with graceful degradation
 */

export const DEV_HUB_CONFIG = {
  // Feature flags
  enabled: import.meta.env.VITE_DEV_HUB_ENABLED !== 'false', // Default true
  readonly: import.meta.env.VITE_DEV_HUB_READONLY !== 'false', // Default true (Phase 1)

  // Gateway configuration (single source of truth)
  gatewayBase: import.meta.env.VITE_GATEWAY_BASE || null,

  // Polling intervals (ms)
  eventsRefreshInterval: 10000, // 10 seconds
  vtidRefreshInterval: 30000, // 30 seconds
  oasisRefreshInterval: 10000, // 10 seconds
  governanceRefreshInterval: 30000, // 30 seconds
  workersRefreshInterval: 15000, // 15 seconds
  cicdRefreshInterval: 30000, // 30 seconds
  gatewayLogsRefreshInterval: 15000, // 15 seconds
  telemetryRefreshInterval: 30000, // 30 seconds
  llmRefreshInterval: 60000, // 60 seconds

  // UI limits
  maxRecentEvents: 25,
  maxRecentVTIDs: 25,
  maxOasisEvents: 100,
  maxGatewayLogs: 100,
} as const;

/**
 * Build Command Hub URL with proper trailing slash normalization
 * Returns null if gatewayBase is not configured
 */
export const getCommandHubUrl = (): string | null => {
  const base = DEV_HUB_CONFIG.gatewayBase;
  if (!base) return null;
  
  // Normalize: remove trailing slashes from base, then append /command-hub/
  const normalizedBase = base.replace(/\/+$/, '');
  return `${normalizedBase}/command-hub/`;
};

export type DevHubConfig = typeof DEV_HUB_CONFIG;
