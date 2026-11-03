/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the Commerce Portal's
 * pure rules through one port, from `@vitana/core/commerce` (verbatim
 * extracts of the web commerce libs and the IO-free helpers of the web
 * commerce components, packages/core/extract.json). The business screens and
 * their data layer read these only through this port, never from
 * `@vitana/core` directly (tests/ports.test.ts).
 */
export * from '@vitana/core/commerce';
