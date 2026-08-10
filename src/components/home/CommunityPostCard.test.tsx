/**
 * Regression tests for VTID-03503 — "I liked it and commented, then refreshed,
 * and both were gone."
 *
 * The card seeded its like/comment counters from props with useState and never
 * looked at the prop again. So even once the feed cache carried the correct
 * number — from this viewer's own action, or from the next background refetch
 * — the card kept rendering whatever it had been mounted with. Combined with
 * the 5-minute feed staleTime, that made a correctly-persisted like display as
 * the pre-tap count for the whole session.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const toggleLikeMock = vi.fn();

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'viewer' } }) }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (key: string) => key,
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/lib/locale-format', () => ({ formatDistanceToNow: () => '1h' }));
vi.mock('@/components/home/NewsPostModerationMenu', () => ({ NewsPostModerationMenu: () => null }));
vi.mock('@/components/home/PostLikersDialog', () => ({
  // Renders its `open` state as text so tests can assert the dialog was
  // actually reached, without pulling in the real usePostLikers/Supabase query.
  PostLikersDialog: ({ open }: { open: boolean }) => (open ? <div>likers-dialog-open</div> : null),
}));
vi.mock('@/components/media/FeedMedia', () => ({ FeedMedia: () => null }));
vi.mock('@/components/feed/MentionText', () => ({ renderMentions: (c: string) => c }));

vi.mock('@/hooks/useFeedPostInteractions', () => ({
  useFeedPostInteractions: () => ({
    isLiked: false,
    toggleLike: toggleLikeMock,
    comments: [],
    commentsLoading: false,
    addComment: vi.fn(),
    isAddingComment: false,
    deleteComment: vi.fn(),
  }),
}));

import { CommunityPostCard } from '@/components/home/CommunityPostCard';
import type { PostFeedItem } from '@/lib/news-feed-ranker';

const item = (overrides: Partial<PostFeedItem> = {}): PostFeedItem =>
  ({
    id: 'post-p1',
    kind: 'post',
    source: 'post',
    post_id: 'p1',
    user_id: 'author',
    author_name: 'Autor',
    author_avatar: null,
    content: 'Hallo',
    image_url: null,
    video_url: null,
    background_style: null,
    mentions: [],
    likes_count: 4,
    comments_count: 2,
    followed: false,
    tags: [],
    published_at: '2026-08-05T11:00:00Z',
    ...overrides,
  }) as PostFeedItem;

const likeButton = () => screen.getByLabelText('screens.profile.likePost');
const commentButton = () => screen.getByLabelText('screens.profile.comment');

describe('CommunityPostCard counts', () => {
  beforeEach(() => toggleLikeMock.mockClear());

  it('renders the counts it is given', () => {
    render(<CommunityPostCard item={item()} />);

    expect(likeButton()).toHaveTextContent('4');
    expect(commentButton()).toHaveTextContent('2');
  });

  it('adopts refreshed counts when the feed data changes under it', () => {
    const { rerender } = render(<CommunityPostCard item={item()} />);
    expect(likeButton()).toHaveTextContent('4');

    // What a background refetch — or this viewer's own like being written into
    // the feed cache — looks like from the card's side.
    rerender(<CommunityPostCard item={item({ likes_count: 5, comments_count: 3 })} />);

    expect(likeButton()).toHaveTextContent('5');
    expect(commentButton()).toHaveTextContent('3');
  });

  it('shows the like immediately, before the write completes', () => {
    render(<CommunityPostCard item={item()} />);

    fireEvent.click(likeButton());

    expect(likeButton()).toHaveTextContent('5');
    expect(toggleLikeMock).toHaveBeenCalledTimes(1);
  });

  it('does not double-count when the optimistic bump is confirmed by the feed', () => {
    const { rerender } = render(<CommunityPostCard item={item()} />);
    fireEvent.click(likeButton());
    expect(likeButton()).toHaveTextContent('5');

    rerender(<CommunityPostCard item={item({ likes_count: 5 })} />);

    expect(likeButton()).toHaveTextContent('5');
  });

  it('rolls the optimistic like back if the write fails', () => {
    render(<CommunityPostCard item={item()} />);

    fireEvent.click(likeButton());
    expect(likeButton()).toHaveTextContent('5');

    const opts = toggleLikeMock.mock.calls[0][1];
    act(() => opts.onError(new Error('offline')));

    expect(likeButton()).toHaveTextContent('4');
  });
});

describe('CommunityPostCard likers list (VTID-03554)', () => {
  beforeEach(() => toggleLikeMock.mockClear());

  it('opens the likers dialog from a single tap on the "{count} Likes" row', () => {
    render(<CommunityPostCard item={item({ likes_count: 4 })} />);

    expect(screen.queryByText('likers-dialog-open')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('screens.home.likesCount'));
    expect(screen.getByText('likers-dialog-open')).toBeInTheDocument();
  });

  it('does not open the likers dialog on a plain tap of the heart — that only toggles the like', () => {
    render(<CommunityPostCard item={item({ likes_count: 4 })} />);

    fireEvent.click(likeButton());

    expect(toggleLikeMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('likers-dialog-open')).not.toBeInTheDocument();
  });

  it('renders no likes row (and so no way to open the list) when nobody has liked yet', () => {
    render(<CommunityPostCard item={item({ likes_count: 0 })} />);

    expect(screen.queryByText('screens.home.likesCount')).not.toBeInTheDocument();
  });
});
