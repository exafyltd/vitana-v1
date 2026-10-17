/**
 * desktop-spotlight-finish / public-profile — ProfileLayout under the Spotlight
 * desktop design (`/u/:identifier`, `/me/profile`):
 *   - Spotlight on → a `detail` ScreenFrame with exactly one spotlight VCard
 *     (the profile header) and compact rail cards;
 *   - phones (Spotlight off) → today's mobile tree, pinned by a snapshot that
 *     was written against the pre-change render.
 * Child components are stubbed so the test pins ProfileLayout's own tree.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/profile';

const env = vi.hoisted(() => ({ isMobile: false, spotlight: false }));
const { stub } = vi.hoisted(() => ({
  stub: (id: string) => () => <div data-testid={id} />,
}));

vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/lib/locale-format', () => ({ fmtNumber: (n: number) => String(n) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => env.isMobile }));
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => env.spotlight }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string, d?: string) => d ?? k }) }));
vi.mock('@/hooks/useAutoSave', () => ({ useAutoSave: vi.fn() }));
vi.mock('@/hooks/useProfileMilestones', () => ({
  useProfileMilestones: () => ({
    milestones: [],
    isOwner: false,
    addMilestone: { mutate: vi.fn(), isPending: false },
    updateMilestone: { mutate: vi.fn() },
    deleteMilestone: { mutate: vi.fn() },
  }),
}));
vi.mock('@/hooks/useProfileGallery', () => ({
  useProfileGallery: () => ({
    photos: [],
    isOwner: false,
    uploadPhoto: { mutate: vi.fn(), isPending: false },
    deletePhoto: { mutate: vi.fn() },
  }),
}));
vi.mock('@/hooks/useProfileShare', () => ({
  useProfileShare: () => ({ openShare: vi.fn(), isShareOpen: false, setIsShareOpen: vi.fn(), getShareUrl: () => 'https://example.test/u/demo' }),
}));
vi.mock('@/hooks/useFollow', () => ({
  useFollow: () => ({ isFollowing: false, loading: false, followUser: vi.fn(), unfollowUser: vi.fn(), followersCount: 12, followingCount: 7 }),
}));
vi.mock('@/hooks/useProfileStatsCount', () => ({
  useProfileStatsCount: () => ({ postsCount: 3, mediaCount: 2, groupsCount: 4, isPending: false }),
}));
vi.mock('@/hooks/useHybridMessages', () => ({ useHybridMessages: () => ({ createThread: vi.fn(), sendMessage: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useCommunityLogger', () => ({
  useCommunityLogger: () => ({ logFollow: vi.fn(), logUnfollow: vi.fn(), logMessageSend: vi.fn() }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/components/SubNavigation', () => ({ default: stub('subnav') }));
vi.mock('@/components/StandardHeader', () => ({ default: stub('header') }));
vi.mock('@/components/ui/utility-action-button', () => ({ UtilityActionButton: stub('utility') }));

vi.mock('@/components/profile/shared/ProfileStats', () => ({ ProfileStats: stub('profile-stats') }));
vi.mock('@/components/profile/desktop/DesktopIdCardSwitcher', () => ({ DesktopIdCardSwitcher: stub('desktop-id-card') }));
vi.mock('@/components/profile/desktop/DesktopBusinessCard', () => ({ DesktopBusinessCard: stub('desktop-business') }));
vi.mock('@/components/profile/shared/ProfessionalCredentialsStrip', () => ({ ProfessionalCredentialsStrip: stub('credentials-strip') }));
vi.mock('@/components/profile/shared/ProfessionalCTAs', () => ({ ProfessionalCTAs: stub('professional-ctas') }));
vi.mock('@/components/profile/shared/CredentialUploadPopup', () => ({ CredentialUploadPopup: stub('credential-upload') }));
vi.mock('@/components/GoLivePopup', () => ({ GoLivePopup: stub('go-live') }));
vi.mock('@/components/profile/shared/ProfileSplitNavigation', () => ({
  ProfileSplitNavigationTriggers: stub('tab-triggers'),
  ProfileSplitNavigationContent: stub('tab-content'),
}));
vi.mock('@/components/PageHeader', () => ({ default: stub('page-header') }));
vi.mock('@/components/profile/AutopilotSuggestions', () => ({ AutopilotSuggestions: stub('autopilot-suggestions') }));
vi.mock('@/components/profile/community/CommunityImpactWidget', () => ({ CommunityImpactWidget: stub('impact') }));
vi.mock('@/components/profile/community/SuccessStoryCarousel', () => ({ SuccessStoryCarousel: stub('stories') }));
vi.mock('@/components/profile/engagement/CompatibilityIndicator', () => ({ CompatibilityIndicator: stub('compat') }));
vi.mock('@/components/profile/engagement/ContextualCTAs', () => ({ ContextualCTAs: stub('ctas') }));
vi.mock('@/components/profile/editor/ProfileProgressCard', () => ({ ProfileProgressCard: stub('progress') }));
vi.mock('@/components/profile/mobile/MobileIdCardSwitcher', () => ({
  MobileIdCardSwitcher: stub('mobile-id-card'),
  getActiveCardSide: () => 'front',
}));
vi.mock('@/components/profile/mobile/MobileProfileStats', () => ({ MobileProfileStats: stub('mobile-stats') }));
vi.mock('@/components/profile/mobile/MobileProfileTabs', () => ({ MobileProfileTabs: stub('mobile-tabs') }));
vi.mock('@/components/profile/mobile/MobileAutopilotBanner', () => ({ MobileAutopilotBanner: stub('mobile-autopilot') }));
vi.mock('@/components/profile/mobile/MobileShowcaseHeader', () => ({ MobileShowcaseHeader: stub('mobile-showcase') }));
vi.mock('@/components/profile/mobile/MobileMediaTabContent', () => ({ MobileMediaTabContent: stub('mobile-media') }));
vi.mock('@/components/profile/shared/tabs/ProfilePostsTab', () => ({ ProfilePostsTab: stub('posts-tab') }));
vi.mock('@/components/profile/mobile/MobileGroupsTabContent', () => ({ MobileGroupsTabContent: stub('mobile-groups') }));
vi.mock('@/components/profile/milestones/MilestoneTimeline', () => ({ MilestoneTimeline: stub('milestones') }));
vi.mock('@/components/profile/gallery/PhotoGallery', () => ({ PhotoGallery: stub('photos') }));
vi.mock('@/components/profile/gallery/VideoGallery', () => ({ VideoGallery: stub('videos') }));
vi.mock('@/components/profile/gallery/MusicGallery', () => ({ MusicGallery: stub('music') }));
vi.mock('@/components/profile/shared/ShareProfileSheet', () => ({ ShareProfileSheet: stub('share-sheet') }));
vi.mock('@/components/profile/mobile/MobileQRShareScreen', () => ({ MobileQRShareScreen: stub('qr-screen') }));
vi.mock('@/components/profile/shared/MessageComposeModal', () => ({ MessageComposeModal: stub('message-modal') }));
vi.mock('@/components/profile/FollowListDialog', () => ({ FollowListDialog: stub('follow-list') }));
vi.mock('@/components/profile/GroupListDialog', () => ({ GroupListDialog: stub('group-list') }));

import { ProfileLayout } from './shared/ProfileLayout';
import { ProfileSpotlightRail } from './shared/ProfileSpotlightRail';
import { ScreenFrame } from '@/components/layout/spotlight';

const profile = {
  id: '00000000-0000-4000-8000-000000000001',
  user_id: '00000000-0000-4000-8000-000000000001',
  name: 'Demo Member',
  handle: 'demo',
  avatarUrl: '',
  coverUrl: '',
  bio: 'Hello',
  location: '',
  roles: ['community'],
  membershipTier: 'standard',
  links: [],
  languages: ['English'],
  stats: { posts: 0, followers: 0, following: 0, mediaUploads: 0, groupsJoined: 0 },
  visibility: { about: 'public', links: 'public', location: 'public', showcase: 'public', indexPublic: true, healthShareConsent: true },
} as unknown as UserProfile;

const renderLayout = () =>
  render(
    <MemoryRouter>
      <ProfileLayout profile={profile} scope="public" editMode={false} />
    </MemoryRouter>,
  );

describe('ProfileLayout — Spotlight detail frame', () => {
  beforeEach(() => {
    env.isMobile = false;
    env.spotlight = false;
  });

  it('Spotlight on: the stage is the ID card as the one spotlight VCard, then the tabs; the stats strip leaves the stage', () => {
    env.spotlight = true;
    const { container } = renderLayout();
    expect(container.querySelector('[data-profile-stage]')).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(container.querySelector('[data-vcard-size="spotlight"] [data-testid="desktop-id-card"]')).not.toBeNull();
    expect(screen.getByTestId('tab-triggers')).toBeTruthy();
    expect(screen.getByTestId('tab-content')).toBeTruthy();
    expect(screen.queryByTestId('profile-stats')).toBeNull();
  });

  it('Spotlight on, as the pages compose it: detail frame, one spotlight VCard, the stats as compact rail cards', () => {
    env.spotlight = true;
    const { container } = render(
      <MemoryRouter>
        <ScreenFrame archetype="detail" rail={<ProfileSpotlightRail profile={profile} />}>
          <ProfileLayout profile={profile} scope="public" editMode={false} />
        </ScreenFrame>
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-archetype="detail"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    const rail = container.querySelector('[data-spotlight-rail]');
    expect(rail).not.toBeNull();
    const stats = Array.from(rail!.querySelectorAll('[data-vcard-size="compact"]')).map((el) => el.getAttribute('data-profile-stat'));
    expect(stats).toEqual(['posts', 'followers', 'following', 'media', 'groups']);
    expect(rail!.textContent).toContain('12');
    expect(rail!.textContent).toContain('7');
  });

  it('Spotlight off on desktop: no frame, no VCard', () => {
    const { container } = renderLayout();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-vcard-size]')).toBeNull();
    expect(screen.getByTestId('desktop-id-card')).toBeTruthy();
  });

  it('phones: the mobile tree is unchanged', () => {
    env.isMobile = true;
    const { container } = renderLayout();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });
});
