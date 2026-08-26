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
const addCommentMock = vi.fn();
const toggleCommentLikeMock = vi.fn();
const deleteCommentMock = vi.fn();
let mockComments: any[] = [];

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
    comments: mockComments,
    commentsLoading: false,
    addComment: addCommentMock,
    isAddingComment: false,
    deleteComment: deleteCommentMock,
    toggleCommentLike: toggleCommentLikeMock,
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
  beforeEach(() => {
    toggleLikeMock.mockClear();
    mockComments = [];
  });

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

describe('CommunityPostCard comment reactions + replies (VTID-03690)', () => {
  const comments = () => [
    {
      id: 'c1',
      user_id: 'author',
      content: 'Top-level comment',
      created_at: '2026-08-05T11:00:00Z',
      parent_id: null,
      likes_count: 2,
      liked_by_me: false,
      display_name: 'Autor',
      avatar_url: null,
    },
    {
      id: 'c2',
      user_id: 'viewer',
      content: 'A reply',
      created_at: '2026-08-05T11:05:00Z',
      parent_id: 'c1',
      likes_count: 0,
      liked_by_me: false,
      display_name: 'Betrachter',
      avatar_url: null,
    },
  ];

  beforeEach(() => {
    toggleLikeMock.mockClear();
    addCommentMock.mockClear();
    toggleCommentLikeMock.mockClear();
    deleteCommentMock.mockClear();
    mockComments = comments();
  });

  const openComments = (overrides: Partial<PostFeedItem> = {}) => {
    render(<CommunityPostCard item={item(overrides)} />);
    fireEvent.click(commentButton());
  };

  it('renders a reply nested under its top-level comment', () => {
    openComments();

    expect(screen.getByText('Top-level comment')).toBeInTheDocument();
    expect(screen.getByText('A reply')).toBeInTheDocument();
  });

  it('shows the like count on a comment and toggles it on tap', () => {
    openComments();

    const likeButtons = screen.getAllByLabelText('screens.home.likeComment');
    fireEvent.click(likeButtons[0]);

    expect(toggleCommentLikeMock).toHaveBeenCalledWith({ commentId: 'c1', liked: false });
  });

  it('shows a "replying to" banner naming the comment author when Reply is tapped', () => {
    openComments();

    expect(screen.queryByText('screens.home.replyingTo')).not.toBeInTheDocument();

    const replyButtons = screen.getAllByText('screens.home.replyToComment');
    fireEvent.click(replyButtons[0]);

    expect(screen.getByText('screens.home.replyingTo')).toBeInTheDocument();
  });

  it('clears the reply banner when cancel is tapped', () => {
    openComments();

    fireEvent.click(screen.getAllByText('screens.home.replyToComment')[0]);
    expect(screen.getByText('screens.home.replyingTo')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('screens.home.cancelReply'));
    expect(screen.queryByText('screens.home.replyingTo')).not.toBeInTheDocument();
  });

  it('attaches the parent comment id when submitting while replying', () => {
    openComments();

    fireEvent.click(screen.getAllByText('screens.home.replyToComment')[0]);

    const input = screen.getByPlaceholderText('screens.home.writeComment');
    fireEvent.change(input, { target: { value: 'my reply text' } });
    fireEvent.click(screen.getByLabelText('screens.home.postComment'));

    expect(addCommentMock).toHaveBeenCalledWith({ content: 'my reply text', parentId: 'c1' });
  });

  it('replying to a reply still threads under the top-level comment', () => {
    openComments();

    // c2 is the reply from 'viewer' — replying to it should still target c1.
    fireEvent.click(screen.getAllByText('screens.home.replyToComment')[1]);

    const input = screen.getByPlaceholderText('screens.home.writeComment');
    fireEvent.change(input, { target: { value: 'nested reply' } });
    fireEvent.click(screen.getByLabelText('screens.home.postComment'));

    expect(addCommentMock).toHaveBeenCalledWith({ content: 'nested reply', parentId: 'c1' });
  });

  it('lets the comment author delete their own comment but not others', () => {
    openComments();

    // c1's author is 'author', not the signed-in 'viewer' — no delete button for it.
    // c2's author IS 'viewer' — delete button present.
    const deleteButtons = screen.getAllByLabelText('screens.home.deleteComment');
    expect(deleteButtons).toHaveLength(1);

    fireEvent.click(deleteButtons[0]);
    expect(deleteCommentMock).toHaveBeenCalledWith('c2');
  });
});

describe('CommunityPostCard likers list (VTID-03554)', () => {
  beforeEach(() => {
    toggleLikeMock.mockClear();
    mockComments = [];
  });

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

describe('CommunityPostCard autoOpenComments (VTID-03744)', () => {
  beforeEach(() => {
    mockComments = [];
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('opens the comments sheet on mount when autoOpenComments is true', () => {
    render(<CommunityPostCard item={item()} autoOpenComments />);

    expect(screen.getByPlaceholderText('screens.home.writeComment')).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('does not open the comments sheet on mount by default', () => {
    render(<CommunityPostCard item={item()} />);

    expect(screen.queryByPlaceholderText('screens.home.writeComment')).not.toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not re-force the sheet open after the viewer closes it, when the prop stays true', () => {
    const { rerender } = render(<CommunityPostCard item={item()} autoOpenComments />);
    expect(screen.getByPlaceholderText('screens.home.writeComment')).toBeInTheDocument();

    fireEvent.click(commentButton());
    expect(screen.queryByPlaceholderText('screens.home.writeComment')).not.toBeInTheDocument();

    // A re-render with the exact same autoOpenComments=true prop (no
    // false->true edge) must not reopen it.
    rerender(<CommunityPostCard item={item()} autoOpenComments />);
    expect(screen.queryByPlaceholderText('screens.home.writeComment')).not.toBeInTheDocument();
  });

  it('opens the sheet when the prop flips true on an ALREADY-MOUNTED card (the real bug)', () => {
    // This is the actual shape of the live failure: /home/comments navigates
    // onto the same Home instance rather than remounting it, so every card
    // is already mounted with autoOpenComments=false before the CTA is
    // tapped, and only THEN does the prop flip to true.
    const { rerender } = render(<CommunityPostCard item={item()} autoOpenComments={false} />);
    expect(screen.queryByPlaceholderText('screens.home.writeComment')).not.toBeInTheDocument();

    rerender(<CommunityPostCard item={item()} autoOpenComments={true} />);

    expect(screen.getByPlaceholderText('screens.home.writeComment')).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
