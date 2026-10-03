/**
 * VTID-04853 — the legacy Navigator admin pages (Catalog, Coverage, History
 * and the Simulator) edited the nav_catalog table, which Vitana no longer
 * reads: her screens come from the screen registry (src/navigation/registry/).
 * Only Telemetry remains, at both /admin/navigator and /admin/navigator/telemetry.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { ADMIN_SECTIONS, getAdminTabByPath } from './admin-navigation';
import { adminNavigatorNavigation } from './navigation';

const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('Navigator admin keeps Telemetry only (VTID-04853)', () => {
  it('menus list Telemetry and nothing else', () => {
    const section = ADMIN_SECTIONS.find((s) => s.key === 'navigator');
    expect(section?.tabs.map((t) => t.path)).toEqual(['/admin/navigator/telemetry']);
    expect(section?.defaultTab).toBe('telemetry');
    expect(adminNavigatorNavigation.map((t) => t.path)).toEqual(['/admin/navigator/telemetry']);
    expect(getAdminTabByPath('/admin/navigator/telemetry')?.key).toBe('telemetry');
  });

  it('routes both Navigator addresses to Telemetry and nothing to the retired pages', () => {
    const app = read('src/App.tsx');
    expect(app).not.toMatch(/pages\/admin\/navigator\/(Catalog|Coverage|History)/);
    expect(app).not.toMatch(/\/admin\/navigator\/(coverage|history)"/);
    for (const path of ['/admin/navigator', '/admin/navigator/telemetry']) {
      const at = app.indexOf(`<Route path="${path}" element={`);
      expect(at).toBeGreaterThan(-1);
      expect(app.slice(at, at + 200)).toContain('<AdminNavigatorTelemetry />');
    }
  });

  it('removes the catalog editor and its API hooks', () => {
    for (const f of ['Catalog', 'Coverage', 'History', 'components/SimulatorPanel', 'components/TriggerEditor']) {
      expect(existsSync(resolve(root, `src/pages/admin/navigator/${f}.tsx`))).toBe(false);
    }
    const hook = read('src/hooks/useAdminNavigator.ts');
    expect(hook).toContain('export function useNavTelemetry');
    expect(hook).not.toMatch(/\/catalog|\/simulate|\/coverage|\/spa-routes/);
  });
});
