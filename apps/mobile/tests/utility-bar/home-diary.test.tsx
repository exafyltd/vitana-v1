/**
 * VTID-05653 (native-wave2-fix-forward-r2/utility-bar) — the utility bar on
 * Home and Daily Diary, as the mobile-web pages render it:
 *  - Home (`Home.tsx:713-746`): Search, mode pill, Invite, Calendar, Create
 *    post, Life Compass, Gift Voucher, Index chip, Autopilot chip. The query
 *    filters the article cards with the web predicate (`Home.tsx:260-266`:
 *    title, summary, source name, tags); Invite shares the flyer URL with the
 *    language (`useInviteFriendShare.ts`); Create post opens `/home/compose`;
 *  - Daily Diary (`MobileDailyDiary.tsx:86-108`): Search (the web never reads
 *    the query), mode pill, Calendar, Life Compass, Gift Voucher, then the
 *    two chips.
 * Fake data hooks / Supabase double / fake gateway, no network.
 */
import '../helpers/no-network';
import '../diary/mocks';
import { router, searchParams } from '../diary/mocks';
import { Platform, Share } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { UIProvider } from '../../src/ports/ui';
import { DailyDiaryScreen } from '../../src/screens/diary/DailyDiaryScreen';
import { HomeScreen } from '../../src/screens/home/HomeScreen';
import { diaryWrapper } from '../diary/helpers';
import { articleItem, communityArticles } from '../home/fixtures';

type AllFeed = { items: unknown[]; isLoading: boolean; isError: boolean; fetchNextPage: jest.Mock; hasNextPage: boolean; isFetchingNextPage: boolean; refetch: jest.Mock };
const mockAllFeed: { current: AllFeed } = {
  current: { items: [], isLoading: false, isError: false, fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false, refetch: jest.fn() },
};
const mockCommunity = { current: { data: [] as unknown[], isLoading: false, isError: false, refetch: jest.fn() } };
jest.mock('../../src/screens/home/data/feed', () => ({
  useAllNewsFeed: () => mockAllFeed.current,
  useCommunityNews: () => mockCommunity.current,
  useCreatePost: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('../../src/screens/home/data/enrichment', () => ({
  useEnrichmentCards: () => ({ cards: [], profileCompletionPct: null, isLoading: false, isError: false, dismiss: jest.fn() }),
}));

jest.setTimeout(30000);

const realOS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}
beforeEach(() => setOS('android'));
afterEach(() => {
  setOS(realOS);
  searchParams.current = {};
  mockAllFeed.current = { ...mockAllFeed.current, items: [] };
  mockCommunity.current = { ...mockCommunity.current, data: [] };
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const BAR_ITEMS = /^(utility-search-open|utility-search-field|mode-pill|utility-invite|utility-calendar-button|utility-create-post|utility-life-compass|utility-gift-voucher|utility-index-chip|utility-autopilot-chip)$/;
const ids = (bar: ReactElement | unknown) => within(bar as never).getAllByTestId(BAR_ITEMS).map((n) => n.props.testID);

function renderWith(ui: ReactElement, language = 'en-US') {
  const { wrapper: Inner } = diaryWrapper({}, {}, language);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction="ltr">
      <Inner>{children}</Inner>
    </UIProvider>
  );
  return render(ui, { wrapper });
}

describe('Home utility bar (Home.tsx:713-746)', () => {
  it('renders Search, pill, Invite, Calendar, Create post, Life Compass, Gift Voucher, Index, Autopilot in the web order', () => {
    renderWith(<HomeScreen />);
    expect(ids(screen.getByTestId('utility-bar'))).toEqual([
      'utility-search-open',
      'mode-pill',
      'utility-invite',
      'utility-calendar-button',
      'utility-create-post',
      'utility-life-compass',
      'utility-gift-voucher',
      'utility-index-chip',
      'utility-autopilot-chip',
    ]);
  });

  it('has no Gift Voucher on iOS', () => {
    setOS('ios');
    renderWith(<HomeScreen />);
    expect(ids(screen.getByTestId('utility-bar'))).not.toContain('utility-gift-voucher');
    expect(ids(screen.getByTestId('utility-bar'))).toContain('utility-autopilot-chip');
  });

  it('filters article cards by title, summary, source name and tags, and leaves other cards alone', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [articleItem, { ...articleItem, id: 'article-a-2', title: 'Sleep and light', summary: 'Circadian.', source_name: 'Rhythm Weekly', tags: ['sleep'] }] };
    renderWith(<HomeScreen />);
    fireEvent.press(screen.getByTestId('utility-search-open'));
    const input = screen.getByTestId('utility-search-input');
    fireEvent.changeText(input, 'nmn');
    expect(screen.getByTestId('feed-article-article-a-1')).toBeTruthy();
    expect(screen.queryByTestId('feed-article-article-a-2')).toBeNull();
    fireEvent.changeText(input, 'rhythm weekly');
    expect(screen.queryByTestId('feed-article-article-a-1')).toBeNull();
    expect(screen.getByTestId('feed-article-article-a-2')).toBeTruthy();
    fireEvent.changeText(input, 'SUPPLEMENTS');
    expect(screen.getByTestId('feed-article-article-a-1')).toBeTruthy();
    fireEvent.changeText(input, '');
    expect(screen.getAllByTestId(/^feed-article-/)).toHaveLength(2);
  });

  it('filters the community articles with the same predicate', () => {
    searchParams.current = { tab: 'community' };
    mockCommunity.current = { ...mockCommunity.current, data: communityArticles };
    renderWith(<HomeScreen />);
    fireEvent.press(screen.getByTestId('utility-search-open'));
    fireEvent.changeText(screen.getByTestId('utility-search-input'), 'yoga');
    expect(screen.queryByText('Lena')).toBeNull();
    expect(screen.getByText('Morgen-Yoga')).toBeTruthy();
  });

  it('Invite shares the flyer URL with the language of the member', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction } as never);
    renderWith(<HomeScreen />, 'de-DE');
    fireEvent.press(screen.getByTestId('utility-invite'));
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ title: 'MAXINA – Longevity Community', url: 'https://vitanaland.com/download?lang=de' });
  });

  it('Create post pushes /home/compose', () => {
    renderWith(<HomeScreen />);
    fireEvent.press(screen.getByTestId('utility-create-post'));
    expect(router.push).toHaveBeenCalledWith('/home/compose');
  });

  it('every new button has an accessibility label', () => {
    renderWith(<HomeScreen />);
    for (const id of ['utility-search-open', 'utility-invite', 'utility-calendar-button', 'utility-create-post', 'utility-life-compass', 'utility-gift-voucher', 'utility-index-chip', 'utility-autopilot-chip']) {
      expect(screen.getByTestId(id).props.accessibilityLabel).toBeTruthy();
    }
  });
});

describe('Daily Diary utility bar (MobileDailyDiary.tsx:86-108)', () => {
  it('renders Search, pill, Calendar, Life Compass, Gift Voucher, Index, Autopilot in the web order', () => {
    renderWith(<DailyDiaryScreen />);
    expect(ids(screen.getByTestId('utility-bar'))).toEqual([
      'utility-search-open',
      'mode-pill',
      'utility-calendar-button',
      'utility-life-compass',
      'utility-gift-voucher',
      'utility-index-chip',
      'utility-autopilot-chip',
    ]);
  });

  it('Search filters nothing (the web query is never read)', () => {
    renderWith(<DailyDiaryScreen />);
    fireEvent.press(screen.getByTestId('utility-search-open'));
    fireEvent.changeText(screen.getByTestId('utility-search-input'), 'zzz');
    expect(screen.getByTestId('diary-health')).toBeTruthy();
  });
});
