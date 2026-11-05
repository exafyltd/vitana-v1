/**
 * VTID-05429 (Native Wave 2, profile lane) — `/profile/me/privacy`
 * (PrivacyScreen): sections and default tiers, the tier cycle building ONE
 * `profiles.account_visibility` UPDATE on the client double (never sent), the
 * read-only partner-search row, loading / error / signed-out. React 19:
 * `ReactElement`.
 */
import '../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { PrivacyScreen, PRIVACY_SECTIONS } from '../../src/screens/profile/PrivacyScreen';
import { DEFAULT_ACCOUNT_VISIBILITY } from '../../src/screens/profile/data/profile';
import { createProfileDouble, profileRow, renderProfile } from './helpers';

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  jest.clearAllMocks();
  __clearToastsForTests();
});

const withVisibility = (account_visibility: Record<string, string>) =>
  createProfileDouble({ tables: { profiles: [{ ...profileRow, account_visibility }] } });

describe('PrivacyScreen', () => {
  it('renders every web section with its rows and the stored-or-default tier', async () => {
    const d = withVisibility({ 'partnerPreferences.gender': 'public' });
    renderProfile(<PrivacyScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-privacy')).toBeTruthy());
    for (const s of PRIVACY_SECTIONS) {
      expect(screen.getByTestId(`privacy-section-${s.key}`)).toBeTruthy();
      expect(screen.getByTestId(`privacy-tier-${s.key}`)).toBeTruthy();
      for (const sf of s.subFields) expect(screen.getByTestId(`privacy-tier-${sf.key}`)).toBeTruthy();
    }
    expect(screen.getByText('Dance preferences')).toBeTruthy();
    // Stored value wins; otherwise the web default (partnerPreferences.locationRadius = connections).
    expect(screen.getByTestId('privacy-tier-partnerPreferences.gender').props.accessibilityLabel).toContain('Public');
    expect(screen.getByTestId('privacy-tier-partnerPreferences.locationRadius').props.accessibilityLabel).toContain('Connections');
    expect(screen.getByTestId('privacy-tier-partnerPreferences').props.accessibilityLabel).toContain('Private');
    expect(d.writes).toEqual([]);
  });

  it('tapping a tier builds the merged account_visibility UPDATE with the next tier and fires nothing', async () => {
    const d = withVisibility({ city: 'public' });
    renderProfile(<PrivacyScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('privacy-tier-partnerPreferences.locationRadius')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('privacy-tier-partnerPreferences.locationRadius'));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.writes[0]).toEqual({
      table: 'profiles',
      values: {
        account_visibility: { ...DEFAULT_ACCOUNT_VISIBILITY, city: 'public', 'partnerPreferences.locationRadius': 'public' },
        updated_at: expect.any(String),
      },
      filters: [['user_id', 'u-1']],
    });
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toContain('profileNative.privacy.tierChanged'));
    expect(__toastsForTests()[0].params).toEqual({ field: 'Location & radius', tier: 'Public' });
  });

  it('cycles Private → Connections → Public → Private (web NEXT_TIER)', async () => {
    for (const [stored, next] of [
      ['private', 'connections'],
      ['connections', 'public'],
      ['public', 'private'],
    ] as const) {
      const d = withVisibility({ derivedAgeBand: stored });
      const r = renderProfile(<PrivacyScreen />, { client: d.client });
      await waitFor(() => expect(screen.getByTestId('privacy-tier-derivedAgeBand')).toBeTruthy());
      await act(async () => {
        fireEvent.press(screen.getByTestId('privacy-tier-derivedAgeBand'));
      });
      await waitFor(() => expect(d.writes).toHaveLength(1));
      expect(d.writes[0].values.account_visibility.derivedAgeBand).toBe(next);
      r.unmount();
    }
  });

  it('the partner-search row is read-only and always private', async () => {
    const d = withVisibility({});
    renderProfile(<PrivacyScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('privacy-tier-myPosts.partnerSeek')).toBeTruthy());
    fireEvent.press(screen.getByTestId('privacy-tier-myPosts.partnerSeek'));
    expect(d.writes).toEqual([]);
    expect(screen.getByTestId('privacy-tier-myPosts.partnerSeek').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('a failed save shows the web error toast', async () => {
    const d = createProfileDouble({ tables: { profiles: [profileRow] }, failWrites: true });
    renderProfile(<PrivacyScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('privacy-tier-myPosts')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('privacy-tier-myPosts'));
    });
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.privacysettings.couldNotSave'));
  });

  it('shows the error state when the profile read fails', async () => {
    const d = createProfileDouble({ failTables: ['profiles'] });
    renderProfile(<PrivacyScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('privacy-error')).toBeTruthy());
  });

  it('shows the sign-in note with no session', async () => {
    const d = createProfileDouble({ userId: null });
    renderProfile(<PrivacyScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('privacy-signed-out')).toBeTruthy());
  });

  it('back returns to the previous screen', async () => {
    const d = withVisibility({});
    renderProfile(<PrivacyScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('privacy-back')).toBeTruthy());
    fireEvent.press(screen.getByTestId('privacy-back'));
    expect(router.back).toHaveBeenCalled();
  });
});
