/**
 * VTID-05183 — business modes (src/lib/business-mode.ts, generated extract)
 * plus the active-org store over an injected storage (the web's version reads
 * window.localStorage, which native does not have).
 */
export * from './extracted/business-mode.generated';
export { createActiveOrgStore } from './active-org';
export type { ActiveOrgStore } from './active-org';
