/**
 * VTID-04548 — re-warm the ORB context cache after a role switch.
 *
 * The gateway's login prewarm only ever warmed the `community` role, so a
 * member who switched role got a cold context build on their next voice
 * session. After a switch the hook asks the widget to prewarm for the route
 * the switch landed on; the gateway resolves the role from it exactly as a
 * session start would. This is a cache warm only — no session, nothing heard.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestRolePrewarm, ROLE_PREWARM_FALLBACK_MS } from './useOrbVoiceWidget';

const hookSrc = readFileSync(join(__dirname, 'useOrbVoiceWidget.ts'), 'utf8');
const win = window as Window & { VitanaOrb?: Record<string, unknown> };

describe('requestRolePrewarm', () => {
  afterEach(() => {
    delete win.VitanaOrb;
  });

  it('calls VitanaOrb.prewarm with the route and viewport', () => {
    const prewarm = vi.fn();
    win.VitanaOrb = { prewarm };
    requestRolePrewarm('/professional/dashboard', false);
    expect(prewarm).toHaveBeenCalledTimes(1);
    expect(prewarm).toHaveBeenCalledWith({ current_route: '/professional/dashboard', is_mobile: false });
  });

  it('is a no-op when the widget is not loaded', () => {
    expect(() => requestRolePrewarm('/', true)).not.toThrow();
  });

  it('is a no-op when the widget predates prewarm()', () => {
    win.VitanaOrb = { updateContext: vi.fn() };
    expect(() => requestRolePrewarm('/', true)).not.toThrow();
  });

  it('swallows a throwing prewarm — a cache warm must never surface', () => {
    win.VitanaOrb = { prewarm: () => { throw new Error('boom'); } };
    expect(() => requestRolePrewarm('/', false)).not.toThrow();
  });
});

describe('role-switch wiring in useOrbVoiceWidget', () => {
  it('listens for role.changed and removes the listener on unmount', () => {
    expect(hookSrc).toMatch(/window\.addEventListener\("role\.changed", onRoleChanged\)/);
    expect(hookSrc).toMatch(/window\.removeEventListener\("role\.changed", onRoleChanged\)/);
  });

  it('does not prewarm synchronously on role.changed (it fires before the RPC commits)', () => {
    const handler = hookSrc.slice(
      hookSrc.indexOf('const onRoleChanged = () => {'),
      hookSrc.indexOf('window.addEventListener("role.changed"'),
    );
    // The only prewarm call inside the handler is inside the fallback timer.
    const beforeTimer = handler.slice(0, handler.indexOf('setTimeout('));
    expect(beforeTimer).not.toContain('requestRolePrewarm(');
  });

  it('prewarms on the route change that follows a role switch', () => {
    const routeEffect = hookSrc.slice(
      hookSrc.indexOf('if (pendingRolePrewarmRef.current) {'),
      hookSrc.indexOf('}, [location.pathname, isMobile]);'),
    );
    expect(routeEffect).toContain('requestRolePrewarm(path, isMobile)');
    expect(routeEffect).toContain('pendingRolePrewarmRef.current = false');
  });

  it('keeps a same-route fallback long enough for the role RPC to commit', () => {
    expect(ROLE_PREWARM_FALLBACK_MS).toBeGreaterThanOrEqual(1000);
  });
});
