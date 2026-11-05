/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — `/inbox/archived`
 * and `/inbox/inspiration` (tasks.md inbox-list task 3). Both web pages are
 * static (no data behind them on phones): Archived renders its sample list,
 * statistics and switches with the four split-bar tabs; Inspiration renders
 * the four template categories with Copy (clipboard) / Send, the three empty
 * tabs and the template-actions popup. The sub-navigation opens the sibling
 * pages by path.
 */
import '../../helpers/no-network';
import { clipboard, router } from './mocks';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { ArchivedScreen, ARCHIVED_SAMPLE } from '../../../src/screens/inbox/ArchivedScreen';
import { InspirationScreen, INSPIRATION_ACTIONS, INSPIRATION_TEMPLATES } from '../../../src/screens/inbox/InspirationScreen';
import { __resetInboxUnreadForTests } from '../../../src/screens/inbox/data/unread';
import { inboxWrapper } from './helpers';

afterEach(() => {
  router.navigate.mockClear();
  clipboard.setString.mockClear();
  __resetInboxUnreadForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('archived', () => {
  it('loaded: header, sub-navigation, the sample archive list, statistics and switches', () => {
    const { wrapper, requests, queries } = inboxWrapper({});
    render(<ArchivedScreen />, { wrapper });
    expect(screen.getByText('Never lose important conversations!')).toBeTruthy();
    expect(screen.getByText('View archived conversations and messages')).toBeTruthy();
    expect(screen.getByTestId('inbox-subnav-archived').props.accessibilityState).toMatchObject({ selected: true });
    for (const row of ARCHIVED_SAMPLE) expect(screen.getByTestId(`archived-row-${row.id}`)).toBeTruthy();
    expect(screen.getByText('Dr. Johnson')).toBeTruthy();
    expect(screen.getByText('Thanks for the consultation!')).toBeTruthy();
    expect(screen.getByText('Nov 15, 2023')).toBeTruthy();
    expect(screen.getAllByText('Healthcare').length).toBeGreaterThan(1);
    expect(screen.getByText('42 conversations')).toBeTruthy();
    expect(screen.getByTestId('archived-auto').props.value).toBe(true);
    fireEvent(screen.getByTestId('archived-auto'), 'valueChange', false);
    expect(screen.getByTestId('archived-auto').props.value).toBe(false);
    // Static page: nothing is fetched.
    expect(requests).toEqual([]);
    expect(queries.filter((q) => q.table !== 'tenants')).toEqual([]);
  });

  it('empty tabs: Recently archived / By category / Settings show their placeholder', () => {
    const { wrapper } = inboxWrapper({});
    render(<ArchivedScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('archived-tab-recent'));
    expect(screen.getByText('Recently archived conversations will appear here.')).toBeTruthy();
    expect(screen.queryByTestId('archived-list')).toBeNull();
    fireEvent.press(screen.getByTestId('archived-tab-category'));
    expect(screen.getByTestId('archived-category')).toBeTruthy();
    fireEvent.press(screen.getByTestId('archived-tab-settings'));
    expect(screen.getByTestId('archived-settings')).toBeTruthy();
  });

  it('the sub-navigation opens Overview and Inspiration by path', () => {
    const { wrapper } = inboxWrapper({});
    render(<ArchivedScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('inbox-subnav-overview'));
    expect(router.navigate).toHaveBeenLastCalledWith('/inbox');
    fireEvent.press(screen.getByTestId('inbox-subnav-inspiration'));
    expect(router.navigate).toHaveBeenLastCalledWith('/inbox/inspiration');
  });
});

describe('inspiration', () => {
  it('loaded: four categories with three templates each, Copy writes the template to the clipboard', () => {
    const { wrapper } = inboxWrapper({});
    render(<InspirationScreen />, { wrapper });
    expect(screen.getByText('Communication Inspiration')).toBeTruthy();
    expect(screen.getByText('Pre-written messages and templates to inspire your wellness community')).toBeTruthy();
    expect(INSPIRATION_TEMPLATES.flatMap((c) => c.templates)).toHaveLength(12);
    for (const c of INSPIRATION_TEMPLATES) for (const tpl of c.templates) expect(screen.getByTestId(`inspiration-template-${tpl.textKey.split('_').pop()}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('inspiration-copy-morning1'));
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../src/i18n/en/screens.json'), 'utf8')).screens.messages;
    expect(clipboard.setString).toHaveBeenCalledWith(en.inspirationTpl_morning1);
  });

  it('empty tabs: favourites, recently used and custom messages show 0 and their placeholder', () => {
    const { wrapper } = inboxWrapper({});
    render(<InspirationScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('inspiration-tab-favorites'));
    expect(screen.getByTestId('inspiration-favorites')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.queryByTestId('inspiration-templates')).toBeNull();
    fireEvent.press(screen.getByTestId('inspiration-tab-recent'));
    expect(screen.getByTestId('inspiration-recent')).toBeTruthy();
    fireEvent.press(screen.getByTestId('inspiration-tab-custom'));
    expect(screen.getByTestId('inspiration-custom')).toBeTruthy();
  });

  it('Template Actions opens the five-action sheet; an action closes it', async () => {
    const { wrapper } = inboxWrapper({});
    render(<InspirationScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('inspiration-actions'));
    for (const a of INSPIRATION_ACTIONS) expect(screen.getByTestId(`inspiration-action-${a.id}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('inspiration-action-create-template'));
    await waitFor(() => expect(screen.queryByTestId('inspiration-action-create-template')).toBeNull());
  });
});
