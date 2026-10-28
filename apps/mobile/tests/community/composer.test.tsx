/** VTID-05296 — Intent composer + create-group sheet: validation, submit, POST / insert. */
import '../helpers/no-network';
import './mocks';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from './helpers';
import { IntentComposer } from '../../src/screens/community/IntentComposer';
import { CreateGroupSheet } from '../../src/screens/community/CreateGroupSheet';

afterAll(() => __setSupabaseForTests(null));
afterEach(() => __clearToastsForTests());

describe('IntentComposer', () => {
  it('blocks submit and raises a validation toast when the title is too short', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentComposer open onClose={() => undefined} />, { wrapper: makeCommunityWrapper({ client: d.client, gateway: {} }) });
    fireEvent.press(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(__toastsForTests().some((t) => t.titleKey === 'communityHubNative.composer.titleRequired')).toBe(true));
  });

  it('posts the intent to the gateway when the form is valid', async () => {
    const d = createCommunitySupabaseDouble();
    const onPosted = jest.fn();
    render(<IntentComposer open onClose={() => undefined} onPosted={onPosted} />, { wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/intents': { intent_id: 'new-1' } } }) });
    fireEvent.changeText(screen.getByTestId('composer-title'), 'Looking for a salsa partner');
    fireEvent.changeText(screen.getByTestId('composer-scope'), 'Weeknights near the old town, intermediate level.');
    fireEvent.press(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(onPosted).toHaveBeenCalledWith('new-1'));
  });
});

describe('CreateGroupSheet', () => {
  it('requires a name before it inserts', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [], global_community_group_members: [] } });
    render(<CreateGroupSheet open onClose={() => undefined} />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    fireEvent.press(screen.getByTestId('create-group-submit'));
    await waitFor(() => expect(__toastsForTests().some((t) => t.titleKey === 'communityHubNative.createGroup.nameRequired')).toBe(true));
    expect(d.inserts.some((i) => i.table === 'global_community_groups')).toBe(false);
  });

  it('inserts the group and adds the creator as admin', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [], global_community_group_members: [] } });
    render(<CreateGroupSheet open onClose={() => undefined} />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    fireEvent.changeText(screen.getByTestId('create-group-name'), 'Trail Crew');
    // Re-press until the AuthProvider session has settled (user id present),
    // so the create mutation runs with a signed-in user.
    await waitFor(() => {
      fireEvent.press(screen.getByTestId('create-group-submit'));
      expect(d.inserts.some((i) => i.table === 'global_community_group_members')).toBe(true);
    });
    expect(d.inserts.find((i) => i.table === 'global_community_groups')?.values.name).toBe('Trail Crew');
    expect(d.inserts.find((i) => i.table === 'global_community_group_members')?.values.role).toBe('admin');
  });
});
