/**
 * VTID-04781 — both navOpts literals in useOrbVoiceWidget.ts (main init and the
 * auth-change re-init) must declare surface + view_role via orbViewProfile().
 *
 * The re-init after login/logout used to omit it, so a session started right
 * after signing in — before any route or role change re-sent the profile —
 * reached the gateway undeclared and the Assistant Profile was resolved from the
 * route alone (resolution='route'), which also hid the real role from voice
 * telemetry. Static source extraction, same pattern as
 * useOrbVoiceWidget.teaching-complete.test.ts.
 */
import * as fs from 'fs';
import * as path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, './useOrbVoiceWidget.ts'), 'utf8');

const navOptsStarts: number[] = [];
for (let from = 0; ; ) {
  const idx = source.indexOf('const navOpts = {', from);
  if (idx === -1) break;
  navOptsStarts.push(idx);
  from = idx + 1;
}

function initialContextOf(block: string): string {
  const start = block.indexOf('initialContext: {');
  expect(start).toBeGreaterThan(-1);
  return block.slice(start, block.indexOf('},', start) + 2);
}

describe('VTID-04781: every ORB init declares surface + view_role', () => {
  it('has the main init and the auth-change re-init', () => {
    expect(navOptsStarts.length).toBe(2);
  });

  it('main init initialContext spreads orbViewProfile(route, role)', () => {
    const block = source.slice(navOptsStarts[0], navOptsStarts[1]);
    expect(initialContextOf(block)).toMatch(
      /\.\.\.orbViewProfile\(currentRouteRef\.current,\s*currentRoleRef\.current\)/,
    );
  });

  it('auth-change re-init initialContext spreads orbViewProfile(route, role)', () => {
    const block = source.slice(navOptsStarts[1], navOptsStarts[1] + 4000);
    expect(initialContextOf(block)).toMatch(
      /\.\.\.orbViewProfile\(currentRouteRef\.current,\s*currentRoleRef\.current\)/,
    );
  });
});
