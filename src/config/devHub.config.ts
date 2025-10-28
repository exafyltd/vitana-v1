/**
 * Dev Hub Configuration & Feature Flags
 * Phase 1: Read-only shell with graceful degradation
 */

export const DEV_HUB_CONFIG = {
  // Feature flags
  enabled: import.meta.env.VITE_DEV_HUB_ENABLED !== 'false', // Default true
  readonly: import.meta.env.VITE_DEV_HUB_READONLY !== 'false', // Default true (Phase 1)
  
  // Gateway configuration
  gatewayBase: import.meta.env.VITE_GATEWAY_BASE || 'https://vitana-gateway-86804897789.us-central1.run.app',
  
  // Polling intervals (ms)
  eventsRefreshInterval: 10000, // 10 seconds
  vtidRefreshInterval: 30000, // 30 seconds
  
  // UI limits
  maxRecentEvents: 25,
  maxRecentVTIDs: 25,
} as const;

export type DevHubConfig = typeof DEV_HUB_CONFIG;
