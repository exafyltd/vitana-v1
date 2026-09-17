/**
 * VTID-03988 — the patient role is granted in `memberships` by the
 * health-order trigger but read from `role_preferences` by `useRole()`, so a
 * mobile patient (no role switcher) never saw their results. These
 * source-check tests pin the three wiring points that unlock the results
 * surface ADDITIVELY off `patient_profiles`, without touching the active role
 * (which would let useRoleRouteEnforcement bounce them off /home entirely).
 * Same source-check pattern as `sidebar.rtl.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('usePatientAccess wiring (VTID-03988)', () => {
  it('the hook reads the caller\'s own patient_profiles row, gated on a signed-in user', () => {
    const src = read('src/hooks/usePatientAccess.ts');
    expect(src).toContain(".from('patient_profiles')");
    expect(src).toContain('.maybeSingle()');
    expect(src).toContain('enabled: !!user?.id');
  });

  it('/patient/results is AuthGuard-only; /patient/dashboard keeps its ProtectedRoute', () => {
    const app = read('src/App.tsx');
    const start = app.indexOf('<Route path="/patient/results"');
    const end = app.indexOf('} />', start);
    const block = app.slice(start, end);
    expect(block).toContain('<AuthGuard>');
    expect(block).not.toContain('ProtectedRoute');

    const dashStart = app.indexOf('<Route path="/patient/dashboard"');
    const dashEnd = app.indexOf('} />', dashStart);
    expect(app.slice(dashStart, dashEnd)).toContain('<ProtectedRoute requiredRole="patient">');
  });

  it('the drawer unlocks patient-results on the patient_profiles flag as well as dbRole', () => {
    const nav = read('src/components/mobile/SideDrawerNav.tsx');
    expect(nav).toContain("import { usePatientAccess } from '@/hooks/usePatientAccess';");
    expect(nav).toContain("!(item.id === 'patient-results' && dbRole === 'community' && !isPatient)");
    // VTID-03993: the header label now names the ACTIVE mode; the flag feeds
    // the role switcher instead, which offers Patient before any switch.
    expect(nav).toContain("const { isPatient } = usePatientAccess();");
    const roleSwitch = read('src/hooks/useRoleSwitch.ts');
    expect(roleSwitch).toContain("if (input.isPatient) set.add('patient');");
    // The drawer role label no longer ships raw English.
    expect(nav).not.toContain("'Community Member'");
  });

  it('role-route enforcement exempts /patient/results before the community bounce', () => {
    const routing = read('src/hooks/useSmartRouting.tsx');
    expect(routing).toContain("const CONSUMER_PATHS = ['/patient/results'];");
    const exempt = routing.indexOf('if (CONSUMER_PATHS.includes(path)) return;');
    const bounce = routing.indexOf("if (dbRole === 'community' && (isOnAdmin");
    expect(exempt).toBeGreaterThan(-1);
    expect(bounce).toBeGreaterThan(exempt);
  });
});
