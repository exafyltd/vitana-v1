/**
 * VTID-05531 — the events / meetups hub (`/comm/events-meetups`): the `tab`
 * search param and the filter sheet choose the list, the loaded / empty /
 * error states render, a card opens the detail drawer and the drawer closes,
 * and the `event` search param opens a linked event. Fake client, no network.
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { EventsMeetupsScreen } from '../../src/screens/events/EventsMeetupsScreen';
import { mockParams, renderWithEvents, standardTables } from './helpers';
import { configure } from '@testing-library/react-native';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(30000);

beforeEach(() => {
  mockParams.current = {};
});

describe('events hub states', () => {
  it('renders the loaded list with one card per event', async () => {
    renderWithEvents(<EventsMeetupsScreen />, { tables: standardTables() });
    expect(await screen.findByTestId('events-list')).toBeTruthy();
    expect(screen.getByTestId('event-card-today-1')).toBeTruthy();
    expect(screen.getByTestId('event-card-upcoming-1')).toBeTruthy();
  });

  it('renders the empty state when no event is listed', async () => {
    renderWithEvents(<EventsMeetupsScreen />, { tables: { global_community_events: [] } });
    expect(await screen.findByTestId('events-empty')).toBeTruthy();
  });

  it('renders the error state and retries the read', async () => {
    const { dbl } = renderWithEvents(<EventsMeetupsScreen />, { tables: standardTables(), failOn: { global_community_events: 'down' } });
    expect(await screen.findByTestId('events-error')).toBeTruthy();
    const before = dbl.reads.length;
    fireEvent.press(screen.getByTestId('events-retry'));
    await waitFor(() => expect(dbl.reads.length).toBeGreaterThan(before));
  });
});

describe('tab selection', () => {
  it('shows only today events for the today tab search param', async () => {
    mockParams.current = { tab: 'today' };
    renderWithEvents(<EventsMeetupsScreen />, { tables: standardTables() });
    expect(await screen.findByTestId('event-card-today-1')).toBeTruthy();
    expect(screen.queryByTestId('event-card-upcoming-1')).toBeNull();
  });

  it('switches to the following tab from the filter sheet', async () => {
    renderWithEvents(<EventsMeetupsScreen />, { tables: standardTables() });
    await screen.findByTestId('event-card-today-1');
    fireEvent.press(screen.getByTestId('events-filter'));
    fireEvent.press(await screen.findByTestId('events-tab-following'));
    await waitFor(() => expect(screen.queryByTestId('event-card-today-1')).toBeNull());
    expect(screen.getByTestId('event-card-followed-1')).toBeTruthy();
  });

  it('shows the following empty state when the viewer follows nobody', async () => {
    mockParams.current = { tab: 'following' };
    renderWithEvents(<EventsMeetupsScreen />, { tables: standardTables({ user_follows: [] }) });
    expect(await screen.findByTestId('events-empty')).toBeTruthy();
  });
});

describe('card to drawer', () => {
  it('opens the drawer for a tapped card and closes it again', async () => {
    renderWithEvents(<EventsMeetupsScreen />, { tables: standardTables() });
    fireEvent.press(await screen.findByTestId('event-card-upcoming-1'));
    expect(await screen.findByTestId('event-drawer')).toBeTruthy();
    expect(screen.getByTestId('event-drawer-title').props.children).toBe('Event upcoming-1');
    fireEvent.press(screen.getByTestId('event-drawer-close'));
    await waitFor(() => expect(screen.queryByTestId('event-drawer')).toBeNull());
  });

  it('opens a linked event from the event search param', async () => {
    mockParams.current = { event: 'upcoming-1' };
    renderWithEvents(<EventsMeetupsScreen />, { tables: standardTables() });
    expect(await screen.findByTestId('event-drawer')).toBeTruthy();
  });
});

describe('create entry', () => {
  it('offers event and meetup and opens the matching form', async () => {
    renderWithEvents(<EventsMeetupsScreen />, { tables: standardTables() });
    await screen.findByTestId('event-card-today-1');
    fireEvent.press(screen.getByTestId('events-create'));
    expect(await screen.findByTestId('create-selection')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('create-meetup'));
    });
    expect(await screen.findByTestId('event-form')).toBeTruthy();
  });
});
