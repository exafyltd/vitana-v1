/**
 * VTID-05531 — the public and game landings: the public event screen for a
 * slug or id (loaded, not found, error) and the event game landing in its pre,
 * live and ended phases, with the join write and the feature flag. Fake
 * client, no network.
 */
import './helpers';
import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { PublicEventScreen } from '../../src/screens/events/PublicEventScreen';
import { EventGameScreen } from '../../src/screens/events/EventGameScreen';
import { eventRow, mockParams, renderWithEvents } from './helpers';
import { configure } from '@testing-library/react-native';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(30000);

// The game flag is read for the active tenant; the test wrapper has no tenant registry, so pin one.
jest.mock('../../src/identity/TenantProvider', () => {
  const actual = jest.requireActual('../../src/identity/TenantProvider');
  return { ...actual, useTenant: () => ({ activeTenantId: 'tenant-test' }) };
});

const DAY = 86_400_000;
const game = (overrides: Record<string, unknown> = {}) => ({
  id: 'game-1',
  slug: 'longevity-game',
  name: 'Longevity game',
  description: 'Play',
  rules_text: null,
  status: 'live',
  starts_at: new Date(Date.now() - DAY).toISOString(),
  ends_at: new Date(Date.now() + DAY).toISOString(),
  points_registration: 1,
  points_event_post: 1,
  points_longevity_post: 1,
  points_like_received: 1,
  points_like_received_cap: 5,
  max_posts_per_user: 3,
  hero_image_url: null,
  winner_reward_text: null,
  winner_reward_description: null,
  ...overrides,
});

beforeEach(() => {
  mockParams.current = {};
});

describe('public event landing', () => {
  it('shows the event resolved by the slug', async () => {
    renderWithEvents(<PublicEventScreen identifier="my-event" />, {
      rpc: { resolve_event_by_slug: () => ({ data: [eventRow('pub-1', { title: 'Open air yoga' })], error: null }) },
    });
    expect((await screen.findByTestId('public-event-title')).props.children).toBe('Open air yoga');
  });

  it('shows not found when the resolver returns no row', async () => {
    renderWithEvents(<PublicEventScreen identifier="nope" />, { rpc: { resolve_event_by_slug: () => ({ data: [], error: null }) } });
    expect(await screen.findByTestId('public-event-not-found')).toBeTruthy();
  });

  it('shows the error state when the resolver fails', async () => {
    renderWithEvents(<PublicEventScreen identifier="x" />, { rpc: { resolve_event_by_slug: () => ({ data: null, error: { message: 'down' } }) } });
    expect(await screen.findByTestId('public-event-error')).toBeTruthy();
  });
});

describe('event game landing', () => {
  it('shows the join action while the game is live and joins with an insert', async () => {
    const { dbl } = renderWithEvents(<EventGameScreen slug="longevity-game" publicLanding />, {
      tables: { event_games: [game()], tenant_settings: [{ tenant_id: 'tenant-test', feature_flags: { enable_event_game: true } }], event_game_participants: [] },
      userId: 'u-1',
    });
    fireEvent.press(await screen.findByTestId('event-game-join'));
    await waitFor(() => expect(dbl.writes.some((w) => w.table === 'event_game_participants' && w.op === 'insert')).toBe(true));
    const write = dbl.writes.find((w) => w.table === 'event_game_participants')!;
    expect(write.values).toEqual({ event_game_id: 'game-1', user_id: 'u-1' });
  });

  it('shows the pre-start message before the game starts', async () => {
    renderWithEvents(<EventGameScreen slug="longevity-game" publicLanding />, {
      tables: { event_games: [game({ status: 'scheduled', starts_at: new Date(Date.now() + DAY).toISOString() })], tenant_settings: [{ tenant_id: 'tenant-test', feature_flags: { enable_event_game: true } }] },
    });
    expect(await screen.findByTestId('event-game-pre')).toBeTruthy();
  });

  it('shows the ended state with the leaderboard after the game ended', async () => {
    renderWithEvents(<EventGameScreen slug="longevity-game" publicLanding />, {
      tables: { event_games: [game({ status: 'ended', starts_at: new Date(Date.now() - 2 * DAY).toISOString(), ends_at: new Date(Date.now() - DAY).toISOString() })], tenant_settings: [{ tenant_id: 'tenant-test', feature_flags: { enable_event_game: true } }] },
      rpc: { get_event_game_leaderboard: () => ({ data: [], error: null }) },
    });
    expect(await screen.findByTestId('event-game-ended')).toBeTruthy();
    await act(async () => undefined);
    expect(screen.getByTestId('event-game-leaderboard')).toBeTruthy();
  });

  it('shows the disabled message when the tenant feature flag is off', async () => {
    renderWithEvents(<EventGameScreen slug="longevity-game" publicLanding />, {
      tables: { event_games: [game()], tenant_settings: [{ tenant_id: 'tenant-test', feature_flags: {} }] },
    });
    expect(await screen.findByTestId('event-game-disabled')).toBeTruthy();
  });
});
