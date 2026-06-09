/**
 * VTID-03282 — Guided Journey practice helpers (P7, vitana-v1).
 *
 * completePractice records a real guided-practice action (P7 platform endpoint
 * POST /api/v1/journey/practice-complete). Listening never calls this — only an
 * explicit "mark as done" after the user performs the tiny action.
 *
 * practiceTargetRoute maps a topic's guidedPracticeTarget to a VERIFIED v1 route
 * (paths confirmed against App.tsx). Targets without a route (e.g. event/popup-
 * driven surfaces like life_compass) return null and simply show no "Open
 * feature" button — the explanation + confirmation still let the user complete.
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

const TARGET_ROUTES: Record<string, string> = {
  vitana_index: '/health/vitana-index',
  my_journey: '/autopilot',
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

export function practiceTargetRoute(target: string | null | undefined): string | null {
  if (!target) return null;
  return TARGET_ROUTES[target] ?? null;
}
