/** VTID-04520 — the app decides the route for its own layout. */
import { describe, expect, it } from 'vitest';
import { eventForMarker, planOrbNavigation } from './orb-navigation';
import { SCREENS } from './registry';

const desk = { isMobile: false };
const mob = { isMobile: true };

describe('planOrbNavigation', () => {
  it('uses the registry mobile route for a known screen on mobile', () => {
    expect(planOrbNavigation('/memory/diary', { screen_id: 'MEMORY.DIARY' }, mob)).toEqual({ kind: 'route', url: '/daily-diary?tab=health' });
    expect(planOrbNavigation('/memory/diary', { screen_id: 'MEMORY.DIARY' }, desk)).toEqual({ kind: 'route', url: '/memory/diary' });
  });

  it('refuses a screen that has no layout on this device', () => {
    const desktopOnly = SCREENS.find((s) => s.viewport === 'desktop' && !s.params?.length && !s.overlay);
    if (desktopOnly) expect(planOrbNavigation(desktopOnly.route, { screen_id: desktopOnly.id }, mob).kind).toBe('refuse');
    expect(planOrbNavigation('/inbox/archived', {}, mob).kind).toBe('refuse');
    expect(planOrbNavigation('/command-hub/x', {}, desk).kind).toBe('refuse');
  });

  it('turns every registry overlay marker into its event', () => {
    for (const s of SCREENS.filter((x) => x.overlay?.marker)) {
      expect(eventForMarker(s.overlay!.marker!)).toBe(s.overlay!.event);
    }
    expect(planOrbNavigation('/home?open=wallet', { screen_id: 'OVERLAY.WALLET_POPUP', entry_kind: 'overlay' }, desk))
      .toEqual({ kind: 'overlay', event: 'wallet:open', detail: { open: 'wallet' }, ensureRoute: undefined });
  });

  it('opens Settings first for a settings section request', () => {
    const p = planOrbNavigation('/settings?open=settings_section&section=privacy.security', {}, mob);
    expect(p).toMatchObject({ kind: 'overlay', event: 'vitana:settings-navigate', ensureRoute: '/settings', detail: { section: 'privacy.security' } });
  });

  it('navigates to the URL for unknown screens and markers', () => {
    expect(planOrbNavigation('/somewhere?x=1', {}, desk)).toEqual({ kind: 'route', url: '/somewhere?x=1' });
    expect(planOrbNavigation('/home?open=nope', {}, desk)).toEqual({ kind: 'route', url: '/home?open=nope' });
  });
});
