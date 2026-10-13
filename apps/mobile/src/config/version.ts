/**
 * VTID-05178 — app version comparison for the update gate (N4-APP Change 9).
 * Numeric per dotted part, so 1.10.0 > 1.9.9. A pre-release or build suffix
 * (`1.2.3-beta.1`, `1.2.3+45`) is ignored; missing parts count as 0.
 */

export const VERSION_PATTERN = /^\d+(\.\d+){0,3}([-+][0-9A-Za-z.+-]*)?$/;

export function isVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 32 && VERSION_PATTERN.test(value);
}

function parts(version: string): number[] {
  return version
    .split(/[-+]/)[0]
    .split('.')
    .map((p) => Number.parseInt(p, 10) || 0);
}

/** < 0 when a < b, 0 when equal, > 0 when a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}
