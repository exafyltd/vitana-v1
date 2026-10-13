/**
 * VTID-05182 — what the native app does with a navigation directive from
 * Vitana (native N6d, plan Change 17). Pure: no React, no router, no I/O; the
 * caller passes the router push and the overlay bus.
 *
 * The timing (`after_speech`, `after_turn`, the 300 ms × ≤100 drain poll, the
 * 200 ms grace, the 1.5 s wait for an async answer, closing unless
 * `keep_orb_open` / `entry_kind: 'overlay'`) lives in session.ts (N6a). This
 * file answers one question: given a directive's route, what opens, and what
 * do we tell the gateway (`nav_result`)?
 *
 *   planOrbNavigation(route, ctx, { isMobile: true })   the web's registry-aware planner
 *     refuse   → { status: 'refused', reason }
 *     overlay  → a registered native overlay (same event names as the web
 *                overlay bus) → 'opened'; none registered →
 *                { status: 'not_found', reason: 'native_overlay_not_ported' }
 *     route    → router.push only when the Expo Router tree has that route
 *                (resolveWebPath → 'native', the same file-route mapping the
 *                parity ledger checks); otherwise
 *                { status: 'not_found', reason: 'native_screen_not_ported' }
 *
 * The gateway learns the truth instead of assuming an open screen (plan open
 * question 6: no web fallback inside the ORB path).
 */
import { planOrbNavigation } from '@web/navigation/orb-navigation';
import type { Resolution } from '../navigation/resolve';
import type { NavCtx, NavResult } from './session';

export const NAV_REASON = {
  SCREEN_NOT_PORTED: 'native_screen_not_ported',
  OVERLAY_NOT_PORTED: 'native_overlay_not_ported',
  NOT_A_VOICE_DESTINATION: 'not_a_voice_destination',
} as const;

/**
 * Native routes a voice directive never opens: auth flows (signing out,
 * finishing an OAuth hand-off, setting a password) and the developer echo
 * bench — none is a screen a member asks for.
 */
export const VOICE_BLOCKED_ROUTES: readonly string[] = ['/logout', '/oauth/complete', '/reset-password', '/dev/orb-bench'];

export interface NativeNavDeps {
  /** N3's resolver (src/navigation/resolve.ts). */
  resolve(url: string): Resolution;
  /** `router.push(href)`. */
  push(href: string): void;
  /** Handlers registered on the native overlay bus for `event`. */
  overlayListeners(event: string): number;
  /** Emits the overlay event with its detail. */
  emitOverlay(event: string, detail: Record<string, string>): void;
}

function routeTarget(url: string, deps: NativeNavDeps): { ok: true; href: string } | { ok: false; result: NavResult } {
  const r = deps.resolve(url);
  if (r.kind !== 'native') return { ok: false, result: { status: 'not_found', route: url, reason: NAV_REASON.SCREEN_NOT_PORTED } };
  if (VOICE_BLOCKED_ROUTES.includes(r.path)) return { ok: false, result: { status: 'refused', route: url, reason: NAV_REASON.NOT_A_VOICE_DESTINATION } };
  return { ok: true, href: r.href };
}

/** Plans and performs one navigation directive; returns the `nav_result` payload. */
export function runNativeNavigation(route: string, ctx: NavCtx, deps: NativeNavDeps): NavResult {
  const plan = planOrbNavigation(route, { screen_id: ctx.screen_id, reason: ctx.reason, title: ctx.title, entry_kind: ctx.entry_kind }, { isMobile: true });

  if (plan.kind === 'refuse') return { status: 'refused', route, reason: plan.reason };

  if (plan.kind === 'overlay') {
    if (deps.overlayListeners(plan.event) === 0) {
      return { status: 'not_found', route, reason: NAV_REASON.OVERLAY_NOT_PORTED };
    }
    if (plan.ensureRoute) {
      const target = routeTarget(plan.ensureRoute, deps);
      if (!target.ok) return { ...target.result, route };
      deps.push(target.href);
    }
    deps.emitOverlay(plan.event, plan.detail);
    return { status: 'opened', route };
  }

  const target = routeTarget(plan.url, deps);
  if (!target.ok) return target.result;
  deps.push(target.href);
  return { status: 'opened', route: target.href };
}
