/**
 * VTID-05186 — imported first by every N3 test: any real network call fails
 * the test instead of reaching a host. Supabase and the gateway are doubles.
 */
const blocked = (...args: unknown[]): never => {
  throw new Error(`network is disabled in tests (fetch ${String(args[0])})`);
};
(globalThis as { fetch: unknown }).fetch = blocked;
export {};
