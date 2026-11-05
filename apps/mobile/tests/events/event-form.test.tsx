/**
 * VTID-05531 — create and edit forms for events and meetups: the form state
 * and validation messages, the insert payload of a new meetup, the update of
 * an owned event, and the cancel path. Fake client, no network.
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { EventFormSheet } from '../../src/screens/events/EventFormSheet';
import { EventsMeetupsScreen } from '../../src/screens/events/EventsMeetupsScreen';
import { eventRow, HOST, inThreeDays, mockParams, renderWithEvents, standardTables, VIEWER } from './helpers';
import { configure } from '@testing-library/react-native';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(30000);

beforeEach(() => {
  mockParams.current = {};
});

describe('create meetup form', () => {
  it('blocks submit until the title is filled, then inserts a meetup owned by the viewer', async () => {
    const onDone = jest.fn();
    const { dbl } = renderWithEvents(<EventFormSheet mode="create" kind="meetup" open onClose={onDone} />, { tables: standardTables() });

    fireEvent.press(screen.getByTestId('event-form-submit'));
    expect(await screen.findByTestId('event-form-error')).toBeTruthy();
    expect(dbl.writes).toHaveLength(0);

    fireEvent.changeText(screen.getByTestId('event-form-title'), 'Sunrise walk');
    fireEvent.changeText(screen.getByTestId('event-form-date'), '2031-05-04');
    fireEvent.changeText(screen.getByTestId('event-form-start'), '07:15');
    fireEvent.changeText(screen.getByTestId('event-form-location'), 'Lake gate');
    fireEvent.changeText(screen.getByTestId('event-form-capacity'), '8');
    await act(async () => {
      fireEvent.press(screen.getByTestId('event-form-submit'));
    });

    await waitFor(() => expect(dbl.writes.some((w) => w.op === 'insert')).toBe(true));
    const insert = dbl.writes.find((w) => w.op === 'insert')!;
    expect(insert.table).toBe('global_community_events');
    expect(insert.values).toMatchObject({ title: 'Sunrise walk', event_type: 'meetup', created_by: VIEWER, max_participants: 8 });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('cancel closes the form without writing anything', async () => {
    const onDone = jest.fn();
    const { dbl } = renderWithEvents(<EventFormSheet mode="create" kind="meetup" open onClose={onDone} />, { tables: standardTables() });
    fireEvent.changeText(screen.getByTestId('event-form-title'), 'Discarded');
    fireEvent.press(screen.getByTestId('event-form-cancel'));
    expect(onDone).toHaveBeenCalled();
    expect(dbl.writes).toHaveLength(0);
  });
});

describe('edit owned event', () => {
  it('opens prefilled from the drawer and updates the same row', async () => {
    const owned = eventRow('owned-1', { title: 'Old title', created_by: HOST, start_time: inThreeDays() });
    const tables = standardTables({ global_community_events: [owned] });
    const { dbl } = renderWithEvents(<EventsMeetupsScreen />, { tables, userId: HOST });

    fireEvent.press(await screen.findByTestId('event-card-owned-1'));
    fireEvent.press(await screen.findByTestId('event-drawer-edit'));
    const title = await screen.findByTestId('event-form-title');
    expect(title.props.value).toBe('Old title');

    fireEvent.changeText(title, 'New title');
    fireEvent.press(screen.getByTestId('event-form-submit'));
    await waitFor(() => expect(dbl.writes.some((w) => w.op === 'update')).toBe(true));
    const upd = dbl.writes.find((w) => w.op === 'update')!;
    expect(upd.values).toMatchObject({ title: 'New title' });
    expect(upd.filters).toEqual([['id', 'owned-1']]);
  });
});
