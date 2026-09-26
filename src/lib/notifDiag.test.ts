// VTID-04616 — diagnostic beacons must go to THIS build's gateway.
//
// notifDiag read the gateway through `(import.meta as any)?.env?.X`. Vite only
// inlines the literal `import.meta.env.X` form, so that read was undefined in
// every built bundle and staging / PR-preview builds posted to the production
// gateway. Found by the STAGING-VERIFY network guard (VTID-04613).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const beacon = vi.fn();
vi.mock('./anon-beacon', () => ({ sendAnonymousBeacon: (...a: unknown[]) => beacon(...a) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  beacon.mockReset();
});

async function bootWith(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  const mod = await import('./notifDiag');
  mod.bootstrapNotifDiag();
  return beacon.mock.calls.map((c) => c[0] as string);
}

describe('notifDiag gateway target', () => {
  it('posts to the build gateway, not production, on a staging build', async () => {
    const urls = await bootWith({
      VITE_GATEWAY_BASE: 'https://preview-aws-gateway.vitanaland.com',
      VITE_GATEWAY_URL: 'https://preview-aws-gateway.vitanaland.com/api/v1',
    });
    expect(urls[0]).toBe('https://preview-aws-gateway.vitanaland.com/api/v1/diag/notif-tap');
  });

  it('never doubles /api/v1 when only VITE_GATEWAY_URL is set', async () => {
    const urls = await bootWith({
      VITE_GATEWAY_BASE: '',
      VITE_GATEWAY_URL: 'https://preview-aws-gateway.vitanaland.com/api/v1',
    });
    expect(urls[0]).toBe('https://preview-aws-gateway.vitanaland.com/api/v1/diag/notif-tap');
  });
});

describe('no optional-chained import.meta.env reads (Vite cannot inline them)', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
    }
    return out;
  }

  it('finds none under src/', () => {
    const offenders = walk(join(process.cwd(), 'src')).filter((f) =>
      /import\.meta(\s+as\s+any\))?\s*\?\.\s*env|\(import\.meta as any\)\?\./.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
