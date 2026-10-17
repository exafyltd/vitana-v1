/**
 * VTID-05184 — the one pako function the Health Sync batcher uses (pako 2.1.0,
 * `lib/deflate.js`). A local declaration instead of an extra @types package.
 */
declare module 'pako' {
  export function gzip(data: string | ArrayBuffer | Uint8Array, options?: { level?: number }): Uint8Array;
  export function ungzip(data: Uint8Array, options: { to: 'string' }): string;
  export function ungzip(data: Uint8Array): Uint8Array;
}
