/**
 * VTID-05028 — "Turn on notifications" card visibility matrix.
 *   Appilix + no live device token → shown
 *   live token present             → hidden
 *   browser                        → hidden (and no DB read)
 *   dismissed within 7 days        → hidden
 * Plus: the token read is filtered by user and revoked_at IS NULL, and
 * "Try again" re-runs subscribe() and re-checks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const appilix = vi.hoisted(() => ({
  isAppilix: vi.fn(() => true),
  registerAppilixIdentity: vi.fn(() => true),
}));
const push = vi.hoisted(() => ({ subscribe: vi.fn(async () => null) }));
const db = vi.hoisted(() => ({
  rows: [] as unknown[],
  calls: [] as Array<[string, ...unknown[]]>,
}));

vi.mock('@/lib/appilix', () => appilix);
vi.mock('@/lib/pushNotifications', () => ({ pushNotificationManager: push }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is']) {
    builder[m] = (...args: unknown[]) => {
      db.calls.push([m, ...args]);
      return builder;
    };
  }
  builder.limit = async (...args: unknown[]) => {
    db.calls.push(['limit', ...args]);
    return { data: db.rows, error: null };
  };
  return {
    supabase: {
      from: (table: string) => {
        db.calls.push(['from', table]);
        return builder;
      },
    },
  };
});

import {
  TurnOnNotificationsCard,
  TURN_ON_NOTIFICATIONS_DISMISS_KEY,
} from './TurnOnNotificationsCard';

const CARD = 'turn-on-notifications-card';

beforeEach(() => {
  vi.clearAllMocks();
  appilix.isAppilix.mockReturnValue(true);
  db.rows = [];
  db.calls = [];
  localStorage.clear();
});

describe('TurnOnNotificationsCard (VTID-05028)', () => {
  it('Appilix + no live device token → shown', async () => {
    render(<TurnOnNotificationsCard />);
    expect(await screen.findByTestId(CARD)).toBeInTheDocument();
    expect(db.calls).toContainEqual(['from', 'user_device_tokens']);
    expect(db.calls).toContainEqual(['eq', 'user_id', 'user-1']);
    expect(db.calls).toContainEqual(['is', 'revoked_at', null]);
  });

  it('live device token present → hidden', async () => {
    db.rows = [{ fcm_token: 'tok' }];
    render(<TurnOnNotificationsCard />);
    await waitFor(() => expect(db.calls).toContainEqual(['limit', 1]));
    expect(screen.queryByTestId(CARD)).toBeNull();
  });

  it('browser → hidden, and nothing is queried', async () => {
    appilix.isAppilix.mockReturnValue(false);
    render(<TurnOnNotificationsCard />);
    await Promise.resolve();
    expect(screen.queryByTestId(CARD)).toBeNull();
    expect(db.calls).toHaveLength(0);
  });

  it('dismissed within 7 days → hidden', async () => {
    localStorage.setItem(TURN_ON_NOTIFICATIONS_DISMISS_KEY, String(Date.now() - 6 * 24 * 60 * 60 * 1000));
    render(<TurnOnNotificationsCard />);
    await Promise.resolve();
    expect(screen.queryByTestId(CARD)).toBeNull();
  });

  it('dismissed more than 7 days ago → shown again', async () => {
    localStorage.setItem(TURN_ON_NOTIFICATIONS_DISMISS_KEY, String(Date.now() - 8 * 24 * 60 * 60 * 1000));
    render(<TurnOnNotificationsCard />);
    expect(await screen.findByTestId(CARD)).toBeInTheDocument();
  });

  it('dismiss button hides the card and remembers it', async () => {
    render(<TurnOnNotificationsCard />);
    fireEvent.click(await screen.findByTestId('turn-on-notifications-dismiss'));
    expect(screen.queryByTestId(CARD)).toBeNull();
    expect(Number(localStorage.getItem(TURN_ON_NOTIFICATIONS_DISMISS_KEY))).toBeGreaterThan(0);
  });

  it('"Try again" re-sends the identity, re-runs subscribe() and hides once a token exists', async () => {
    render(<TurnOnNotificationsCard />);
    const retry = await screen.findByTestId('turn-on-notifications-retry');
    db.rows = [{ fcm_token: 'tok' }];
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByTestId(CARD)).toBeNull());
    expect(appilix.registerAppilixIdentity).toHaveBeenCalledWith('user-1');
    expect(push.subscribe).toHaveBeenCalledTimes(1);
  });

  it('a throwing localStorage never breaks the card', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<TurnOnNotificationsCard />);
    fireEvent.click(await screen.findByTestId('turn-on-notifications-dismiss'));
    expect(screen.queryByTestId(CARD)).toBeNull();
    get.mockRestore();
    set.mockRestore();
  });
});
