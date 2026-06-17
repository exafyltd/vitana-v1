/**
 * VTID-03282 — Guided Journey practice helpers (P7, vitana-v1).
 *
 * completePractice records a real guided-practice action (P7 platform endpoint
 * POST /api/v1/journey/practice-complete). Listening never calls this — only an
 * explicit "mark as done" after the user performs the tiny action.
 *
 * practiceTargetAction maps a topic's guidedPracticeTarget to the right way to
 * OPEN that practice surface so "Open feature" is never a dead end:
 *   - { kind: 'route' }   → a VERIFIED v1 route (paths confirmed against App.tsx)
 *   - { kind: 'overlay' } → a popup/drawer dispatched via CustomEvent (e.g.
 *     life_compass → 'vitana:open-life-compass'), reusing the same events the
 *     ORB voice navigator uses (useOrbVoiceWidget.ts / AutopilotPopup.tsx)
 *   - { kind: 'orb' }     → open the Vitana ORB focused on the topic
 * Unknown/empty targets return null; the caller treats that as "open the ORB",
 * so every guided practice stays doable with Vitana.
 */

import { communityFetch } from '@/lib/community-gateway';

export async function completePractice(topicId: string): Promise<boolean> {
  try {
    const resp = await communityFetch('/api/v1/journey/practice-complete', {
      method: 'POST',
      body: JSON.stringify({ topicId }),
    });
    const json = await resp.json();
    return !!(resp.ok && json?.ok);
  } catch {
    return false;
  }
}

/**
 * Record that the user listened to a guided session (the +2 VITANA INDEX
 * reward). Always send the session number so the durable state can mark the
 * whole session as listened; topicId remains available for the focused ORB
 * lesson and older idempotency rules. Fire-and-forget: never block the UI on
 * it. Returns whether a NEW award was granted (false when already credited).
 */
export async function recordSessionListened(
  session: number,
  topicId?: string,
): Promise<boolean> {
  try {
    const resp = await communityFetch('/api/v1/journey/session-listened', {
      method: 'POST',
      body: JSON.stringify({ session, topicId }),
    });
    const json = await resp.json();
    return !!(resp.ok && json?.ok && json?.awarded);
  } catch {
    return false;
  }
}

/** How a guided-practice target should be opened. */
export type PracticeAction =
  | { kind: 'route'; route: string }
  | { kind: 'overlay'; event: string }
  | { kind: 'orb' };

/** Targets that live as a popup/drawer (no route) — opened via CustomEvent.
 *  Mirrors the overlay markers in useOrbVoiceWidget.ts. */
const OVERLAY_EVENTS: Record<string, string> = {
  life_compass: 'vitana:open-life-compass',
};

/** Targets whose practice IS talking to Vitana — open the ORB on the topic. */
const ORB_TARGETS = new Set(['orb_overview']);

const TARGET_ROUTES: Record<string, string> = {
  vitana_index: '/health/vitana-index',
  my_journey: '/autopilot',
  community_overview: '/comm',
  memory: '/memory',
  reminders: '/reminders',
  calendar: '/reminders',
  universal_cart: '/cart',
  cart: '/cart',
  media_hub: '/comm/media-hub',
  events: '/comm/events-meetups',
  create_event: '/comm/events-meetups',
  find_a_match: '/home/matches',
  matches: '/home/matches',
  live_room: '/comm/live-rooms',
  business_hub: '/business',
};

export function practiceTargetAction(
  target: string | null | undefined,
): PracticeAction | null {
  if (!target) return null;
  const overlay = OVERLAY_EVENTS[target];
  if (overlay) return { kind: 'overlay', event: overlay };
  if (ORB_TARGETS.has(target)) return { kind: 'orb' };
  const route = TARGET_ROUTES[target];
  return route ? { kind: 'route', route } : null;
}
