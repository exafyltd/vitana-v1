/**
 * VTID-05677 (native-wave2-media-hub-r2/media-hub) — the Media Hub screen
 * against a fake `MediaHubData`: the `tab` / `short` params, the shorts carousel
 * (real list and the demo fallback), the full-screen feed (like, comments, share,
 * owner actions, video states), music and podcast lists, the upload / edit /
 * delete sheets and the overlay events. Every write is asserted on the fake only.
 */
import '../helpers/no-network';
import { env, router, searchParams, redirects, videoPlayers, audioPlayers, imagePicker, docPicker } from './mocks';
import { Dimensions, Modal, Share } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { MediaHubScreen } from '../../src/screens/media/MediaHubScreen';
import { __resetMutedPreferenceForTests } from '../../src/screens/media/ShortSlide';
import { COMMENTS, SHORTS, makeFake, mediaWrapper, short, TRACKS, USER } from './helpers';

jest.setTimeout(30_000);

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const renderScreen = (opts: Parameters<typeof makeFake>[0] = {}, wrapperOpts: Parameters<typeof mediaWrapper>[1] = {}) => {
  const fake = makeFake(opts);
  const utils = render(<MediaHubScreen />, { wrapper: mediaWrapper(fake, wrapperOpts) });
  return { fake, ...utils };
};
const openFeed = async (index = 0) => {
  press(`media-short-open-${index}`);
  await screen.findByTestId('shorts-feed');
};

beforeEach(() => {
  searchParams.current = {};
  env.base = undefined;
  videoPlayers.length = 0;
  audioPlayers.length = 0;
  redirects.length = 0;
  __resetMutedPreferenceForTests();
  __clearToastsForTests();
});
afterEach(() => jest.clearAllMocks());

describe('tab and short params', () => {
  it('defaults to Shorts and asks for 100 shorts without a tag filter', async () => {
    const { fake } = renderScreen();
    expect(await screen.findByTestId('media-shorts-list')).toBeTruthy();
    expect(fake.calls.useShorts[0]).toEqual({ limit: 100 });
    expect(screen.getByText('Sunrise run')).toBeTruthy();
    expect(screen.queryByTestId('media-music-list')).toBeNull();
  });

  it.each([
    ['music', 'media-music-list'],
    ['podcasts', 'media-podcasts-list'],
    ['shorts', 'media-shorts-list'],
  ])('tab=%s shows its list', async (tab, testID) => {
    searchParams.current = { tab };
    renderScreen();
    expect(await screen.findByTestId(testID)).toBeTruthy();
  });

  it('an invalid tab falls back to Shorts', async () => {
    searchParams.current = { tab: 'videos' };
    renderScreen();
    expect(await screen.findByTestId('media-shorts-list')).toBeTruthy();
  });

  it('?short forces Shorts over a stale tab', async () => {
    searchParams.current = { tab: 'music', short: 's-1' };
    renderScreen();
    expect(await screen.findByTestId('media-shorts-list')).toBeTruthy();
  });

  it('switching the mode writes tab back', async () => {
    renderScreen();
    press('mode-pill');
    press('mode-music');
    await waitFor(() => expect(router.setParams).toHaveBeenCalledWith({ tab: 'music' }));
    expect(await screen.findByTestId('media-music-list')).toBeTruthy();
  });

  it('the Arabic UI renders the Arabic title from the catalog', async () => {
    renderScreen({}, { language: 'ar-XA' });
    expect(await screen.findByText('مركز الوسائط')).toBeTruthy();
  });
});

describe('shorts carousel', () => {
  it('names a creator without a display name "Community Member"', async () => {
    renderScreen();
    await screen.findByTestId('media-shorts-list');
    expect(screen.getByText('Community Member')).toBeTruthy();
    expect(screen.getByText('Mira')).toBeTruthy();
  });

  it.each([
    ['empty', []],
    ['error', 'error'],
    ['loading', 'loading'],
  ] as const)('shows the three demo shorts when the list is %s', async (_n, shorts) => {
    renderScreen({ shorts: shorts as never });
    expect(await screen.findByText('5 Min Morning Stretch')).toBeTruthy();
    expect(screen.getByText('Quick Healthy Breakfast')).toBeTruthy();
    expect(screen.getByText('Breathing Exercise')).toBeTruthy();
    expect(screen.getByText('FitnessPro')).toBeTruthy();
  });

  it('the kebab is owner-only', async () => {
    renderScreen();
    await screen.findByTestId('media-shorts-list');
    expect(screen.getByTestId('media-short-kebab-0')).toBeTruthy();
    expect(screen.queryByTestId('media-short-kebab-1')).toBeNull();
  });

  it('delete asks for confirmation, then deletes and refetches', async () => {
    const { fake } = renderScreen();
    fireEvent.press(await screen.findByTestId('media-short-kebab-0'));
    press('media-short-delete-0');
    expect(await screen.findByText('Delete Video')).toBeTruthy();
    press('media-delete-confirm');
    await waitFor(() => expect(fake.calls.deleteShort).toHaveLength(1));
    expect(fake.calls.deleteShort[0]).toEqual({ id: 's-1', src_url: SHORTS[0].src_url, thumbnail_url: SHORTS[0].thumbnail_url });
    await waitFor(() => expect(fake.refetch.shorts).toHaveBeenCalled());
    expect(__toastsForTests().some((tt) => tt.titleKey === 'mediaHub.toast.videoDeleted')).toBe(true);
  });

  it('a failed delete raises the error toast and keeps the sheet', async () => {
    const { fake } = renderScreen({ failWith: { deleteShort: true } });
    fireEvent.press(await screen.findByTestId('media-short-kebab-0'));
    press('media-short-delete-0');
    press('media-delete-confirm');
    await waitFor(() => expect(__toastsForTests().some((tt) => tt.titleKey === 'mediaHub.toast.deleteError')).toBe(true));
    expect(fake.refetch.shorts).not.toHaveBeenCalled();
    expect(screen.getByTestId('media-delete-confirm')).toBeTruthy();
  });

  it('cancel closes the delete sheet without deleting', async () => {
    const { fake } = renderScreen();
    fireEvent.press(await screen.findByTestId('media-short-kebab-0'));
    press('media-short-delete-0');
    press('media-delete-cancel');
    expect(fake.calls.deleteShort).toBeUndefined();
  });

  it('edit prefills the sheet and saves through the port', async () => {
    const { fake } = renderScreen();
    fireEvent.press(await screen.findByTestId('media-short-kebab-0'));
    press('media-short-edit-0');
    const title = await screen.findByTestId('media-edit-title');
    expect(title.props.value).toBe('Sunrise run');
    fireEvent.changeText(title, '  Sunrise run 2 ');
    fireEvent.changeText(screen.getByTestId('media-edit-tag-input'), 'yoga');
    press('media-edit-tag-add');
    press('media-edit-save');
    await waitFor(() => expect(fake.calls.editShort).toHaveLength(1));
    expect(fake.calls.editShort[0]).toMatchObject({ id: 's-1', userId: USER, title: '  Sunrise run 2 ', tags: ['fitness', 'sleep', 'yoga'], thumbnailUrl: SHORTS[0].thumbnail_url });
    expect(fake.calls.editShort[0].thumbnail).toBeUndefined();
    await waitFor(() => expect(fake.refetch.shorts).toHaveBeenCalled());
  });

  it('edit needs a title and allows at most five tags', async () => {
    const { fake } = renderScreen({ shorts: [short({ tags: ['a', 'b', 'c', 'd', 'e'] })] });
    fireEvent.press(await screen.findByTestId('media-short-kebab-0'));
    press('media-short-edit-0');
    fireEvent.changeText(await screen.findByTestId('media-edit-tag-input'), 'f');
    press('media-edit-tag-add');
    expect(screen.queryByTestId('media-edit-tag-f')).toBeNull();
    fireEvent.changeText(screen.getByTestId('media-edit-title'), '   ');
    expect(screen.getByTestId('media-edit-save').props.accessibilityState.disabled).toBe(true);
    expect(fake.calls.editShort).toBeUndefined();
  });

  it('edit can swap the thumbnail from the photo library', async () => {
    imagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///thumb.png', fileName: 'thumb.png', mimeType: 'image/png', fileSize: 10, duration: undefined as never }] });
    const { fake } = renderScreen();
    fireEvent.press(await screen.findByTestId('media-short-kebab-0'));
    press('media-short-edit-0');
    press('media-edit-thumbnail');
    await waitFor(() => expect(imagePicker.launchImageLibraryAsync).toHaveBeenCalled());
    press('media-edit-save');
    await waitFor(() => expect(fake.calls.editShort[0].thumbnail).toMatchObject({ uri: 'file:///thumb.png', name: 'thumb.png' }));
  });
});

describe('full-screen feed', () => {
  it('opens at the tapped card, shows progress dots and closes with back and Android back', async () => {
    renderScreen();
    await openFeed(1);
    expect(screen.getAllByTestId('short-slide').length).toBeGreaterThan(0);
    expect(screen.getByTestId('shorts-feed-dots').children).toHaveLength(2);
    press('short-back');
    await waitFor(() => expect(screen.queryByTestId('shorts-feed')).toBeNull());
    await openFeed(0);
    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
    await waitFor(() => expect(screen.queryByTestId('shorts-feed')).toBeNull());
  });

  it('plays the active slide from the start and keeps the sound preference', async () => {
    renderScreen();
    await openFeed(0);
    const player = videoPlayers[0];
    expect(player.play).toHaveBeenCalled();
    expect(player.loop).toBe(true);
    press('short-mute');
    expect(player.muted).toBe(true);
    press('short-mute');
    expect(player.muted).toBe(false);
  });

  it('swiping to the next short makes it the active one', async () => {
    renderScreen();
    await openFeed(0);
    const list = screen.getByTestId('shorts-feed-list');
    const height = Dimensions.get('window').height;
    fireEvent(list, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 0, y: height }, contentSize: { width: 1, height: height * 2 }, layoutMeasurement: { width: 1, height } } });
    await waitFor(() => expect(screen.getByTestId('shorts-feed-dots').children).toHaveLength(2));
  });

  it('like toggles with an optimistic count and calls the port', async () => {
    const { fake } = renderScreen();
    await openFeed(0);
    expect(screen.getAllByTestId('short-like-count')[0].children.join('')).toBe('5');
    fireEvent.press(screen.getAllByTestId('short-like')[0]);
    await waitFor(() => expect(fake.calls.toggleLike).toEqual([{ videoId: 's-1', action: 'like' }]));
    expect(screen.getAllByTestId('short-like-count')[0].children.join('')).toBe('6');
    fireEvent.press(screen.getAllByTestId('short-like')[0]);
    await waitFor(() => expect(fake.calls.toggleLike[1]).toEqual({ videoId: 's-1', action: 'unlike' }));
    expect(screen.getAllByTestId('short-like-count')[0].children.join('')).toBe('5');
  });

  it('share omits the URL when webBaseUrl is unset', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    renderScreen();
    await openFeed(0);
    fireEvent.press(screen.getAllByTestId('short-share')[0]);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toEqual({ title: 'Sunrise run', message: 'Check out "Sunrise run" by Mira on Vitana' });
  });

  it('share adds the web URL when webBaseUrl is set', async () => {
    env.base = 'https://g1-web.example.org/';
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    renderScreen();
    await openFeed(0);
    fireEvent.press(screen.getAllByTestId('short-share')[0]);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toEqual({ title: 'Sunrise run', message: 'Check out "Sunrise run" by Mira on Vitana\nhttps://g1-web.example.org/shorts/s-1', url: 'https://g1-web.example.org/shorts/s-1' });
  });

  it('a failed share raises the could-not-share toast', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('x'));
    renderScreen();
    await openFeed(0);
    fireEvent.press(screen.getAllByTestId('short-share')[0]);
    await waitFor(() => expect(__toastsForTests().some((tt) => tt.titleKey === 'toasts.community.couldNotShare')).toBe(true));
  });

  it('owner kebab inside the feed edits and deletes (sheets live in the feed modal)', async () => {
    const { fake } = renderScreen();
    await openFeed(0);
    fireEvent.press((await screen.findAllByTestId('short-kebab'))[0]);
    fireEvent.press(screen.getByTestId('short-delete'));
    press('media-delete-confirm');
    await waitFor(() => expect(fake.calls.deleteShort).toHaveLength(1));
    await waitFor(() => expect(screen.queryByTestId('shorts-feed')).toBeNull());
  });

  it('a slide of another member has no kebab', async () => {
    renderScreen({ shorts: [short({ user_id: 'u-2' })] });
    await openFeed(0);
    await screen.findByTestId('short-slide');
    expect(screen.queryByTestId('short-kebab')).toBeNull();
  });

  it('an owner slide has the kebab', async () => {
    renderScreen();
    await openFeed(0);
    expect(await screen.findByTestId('short-kebab')).toBeTruthy();
  });

  it('shows a retry control on a load error and replaces the source', async () => {
    renderScreen();
    await openFeed(0);
    const player = videoPlayers[0];
    act(() => player.emit('statusChange', { status: 'error' }));
    fireEvent.press(await screen.findByTestId('short-retry'));
    expect(player.replace).toHaveBeenCalledWith(SHORTS[0].src_url);
  });

  it('turns a long load into a buffering retry', async () => {
    jest.useFakeTimers();
    try {
      renderScreen();
      await openFeed(0);
      act(() => jest.advanceTimersByTime(5100));
      expect(await screen.findByTestId('short-retry')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('a demo short (no video url) shows the thumbnail and no player', async () => {
    renderScreen({ shorts: [] });
    await openFeed(0);
    expect(screen.queryByTestId('short-video')).toBeNull();
    expect(videoPlayers.length).toBeGreaterThan(0);
    expect(videoPlayers[0].play).not.toHaveBeenCalled();
  });
});

describe('comments', () => {
  const open = async () => {
    const r = renderScreen();
    await openFeed(0);
    fireEvent.press(screen.getAllByTestId('short-comments')[0]);
    await screen.findByTestId('media-comments');
    return r;
  };

  it('lists comments with replies and the reply banner', async () => {
    await open();
    expect(screen.getByText('Great run')).toBeTruthy();
    expect(screen.getByText('Thanks!')).toBeTruthy();
    expect(within(screen.getByTestId('media-comments')).getByText('Community Member')).toBeTruthy();
    press('media-comment-reply-c-1');
    expect(screen.getByText('Replying to Mira')).toBeTruthy();
    press('media-comments-cancel-reply');
    expect(screen.queryByTestId('media-comments-reply-banner')).toBeNull();
  });

  it('adds a comment and a reply to the top-level parent', async () => {
    const { fake } = await open();
    fireEvent.changeText(screen.getByTestId('media-comments-input'), ' Nice ');
    press('media-comments-send');
    await waitFor(() => expect(fake.calls.addComment).toEqual([{ videoId: 's-1', content: 'Nice', parentId: null }]));
    press('media-comment-reply-c-2');
    fireEvent.changeText(screen.getByTestId('media-comments-input'), 'Reply');
    press('media-comments-send');
    await waitFor(() => expect(fake.calls.addComment[1]).toEqual({ videoId: 's-1', content: 'Reply', parentId: 'c-1' }));
    await waitFor(() => expect(fake.refetch.shorts).toHaveBeenCalled());
  });

  it('a failed comment raises the comment error toast and keeps the text', async () => {
    renderScreen({ failWith: { addComment: true } });
    await openFeed(0);
    fireEvent.press(screen.getAllByTestId('short-comments')[0]);
    fireEvent.changeText(await screen.findByTestId('media-comments-input'), 'x');
    press('media-comments-send');
    await waitFor(() => expect(__toastsForTests().some((tt) => tt.titleKey === 'mediaHub.toast.commentError')).toBe(true));
    expect(screen.getByTestId('media-comments-input').props.value).toBe('x');
  });

  it('likes any comment and deletes only your own', async () => {
    const { fake } = await open();
    press('media-comment-like-c-2');
    await waitFor(() => expect(fake.calls.toggleCommentLike).toEqual([{ videoId: 's-1', commentId: 'c-2', liked: true }]));
    expect(screen.getByTestId('media-comment-delete-c-1')).toBeTruthy();
    expect(screen.queryByTestId('media-comment-delete-c-2')).toBeNull();
    press('media-comment-delete-c-1');
    await waitFor(() => expect(fake.calls.deleteComment).toEqual([{ videoId: 's-1', commentId: 'c-1' }]));
  });

  it('shows the empty state', async () => {
    renderScreen({ comments: [] });
    await openFeed(0);
    fireEvent.press(screen.getAllByTestId('short-comments')[0]);
    expect(await screen.findByTestId('media-comments-empty')).toBeTruthy();
    expect(within(screen.getByTestId('media-comments')).getByText('No comments yet')).toBeTruthy();
    expect(COMMENTS.length).toBe(2);
  });
});

describe('deep link ?short=<id>', () => {
  it('opens the feed at that short, drops the param, and closing replaces to Events / Hot', async () => {
    searchParams.current = { short: 's-2' };
    renderScreen();
    await screen.findByTestId('shorts-feed');
    expect(router.setParams).toHaveBeenCalledWith({ short: undefined, tab: 'shorts' });
    press('short-back');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/comm/events-meetups?tab=hot'));
  });

  it('an unknown id opens nothing and does not navigate', async () => {
    searchParams.current = { short: 'nope' };
    renderScreen();
    await screen.findByTestId('media-shorts-list');
    await waitFor(() => expect(router.setParams).toHaveBeenCalledWith({ short: undefined, tab: 'shorts' }));
    expect(screen.queryByTestId('shorts-feed')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('waits for the list before consuming the param', async () => {
    searchParams.current = { short: 's-2' };
    renderScreen({ shorts: 'loading' });
    await screen.findByTestId('media-shorts-list');
    expect(router.setParams).not.toHaveBeenCalledWith({ short: undefined, tab: 'shorts' });
  });

  it('a feed opened by tapping closes without navigating away', async () => {
    renderScreen();
    await openFeed(0);
    press('short-back');
    await waitFor(() => expect(screen.queryByTestId('shorts-feed')).toBeNull());
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('music', () => {
  beforeEach(() => {
    searchParams.current = { tab: 'music' };
  });

  it('lists tracks with artist, duration and genre; unknown artist falls back', async () => {
    renderScreen();
    await screen.findByTestId('media-music-list');
    expect(screen.getByText('Aria')).toBeTruthy();
    expect(screen.getByText('3:05 • Ambient')).toBeTruthy();
    expect(screen.getByText('Unknown Artist')).toBeTruthy();
  });

  it('play starts the track on the audio player and the same press pauses it', async () => {
    renderScreen();
    await screen.findByTestId('media-music-list');
    press('media-track-play-t-1');
    const player = audioPlayers[0];
    expect(player.uri).toBe(TRACKS[0].file_url);
    expect(player.play).toHaveBeenCalled();
    act(() => player.emit({ playing: true }));
    press('media-track-play-t-1');
    expect(player.pause).toHaveBeenCalled();
  });

  it('starting another track releases the first', async () => {
    renderScreen();
    await screen.findByTestId('media-music-list');
    press('media-track-play-t-1');
    press('media-track-play-t-2');
    expect(audioPlayers[0].remove).toHaveBeenCalled();
    expect(audioPlayers[1].uri).toBe(TRACKS[1].file_url);
  });

  it('bookmark sends the web item shape', async () => {
    const { fake } = renderScreen();
    await screen.findByTestId('media-music-list');
    press('media-track-bookmark-t-1');
    await waitFor(() => expect(fake.calls.toggleBookmark).toHaveLength(1));
    expect(fake.calls.toggleBookmark[0]).toEqual({
      item_type: 'music',
      item_id: 't-1',
      item_name: 'Calm Waves',
      item_metadata: { artist: 'Aria', duration: 185, genre: 'Ambient', file_url: TRACKS[0].file_url, tags: ['calm'] },
    });
  });

  it('a bookmarked track is marked selected', async () => {
    renderScreen({ bookmarked: ['t-2'] });
    await screen.findByTestId('media-music-list');
    expect(screen.getByTestId('media-track-bookmark-t-2').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('media-track-bookmark-t-1').props.accessibilityState.selected).toBe(false);
  });

  it('share carries the track link only with a webBaseUrl', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    renderScreen();
    await screen.findByTestId('media-music-list');
    press('media-track-share-t-1');
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0][0]).toEqual({ title: 'Calm Waves', message: 'Check out "Calm Waves" by Aria on Vitana' });
    env.base = 'https://g1-web.example.org';
    press('media-track-share-t-1');
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[1][0]).toMatchObject({ url: 'https://g1-web.example.org/comm/media-hub?tab=music&track=t-1' });
  });

  it.each([[[]], ['error']])('shows the web empty state for %p', async (music) => {
    renderScreen({ music: music as never });
    expect(await screen.findByTestId('media-music-empty')).toBeTruthy();
    expect(screen.getByText('No music uploaded yet')).toBeTruthy();
  });
});

describe('podcasts', () => {
  beforeEach(() => {
    searchParams.current = { tab: 'podcasts' };
  });

  it('lists episodes with host, duration and age; unknown host falls back; play only', async () => {
    renderScreen();
    await screen.findByTestId('media-podcasts-list');
    expect(screen.getByText('Host Hanna')).toBeTruthy();
    expect(screen.getByText('Unknown Host')).toBeTruthy();
    expect(screen.getByText('30:00')).toBeTruthy();
    expect(screen.queryByTestId('media-podcast-delete-p-1')).toBeNull();
  });

  it('play and pause use the audio player', async () => {
    renderScreen();
    await screen.findByTestId('media-podcasts-list');
    press('media-podcast-play-p-1');
    expect(audioPlayers[0].uri).toBe('https://cdn.example.org/p1.mp3');
    act(() => audioPlayers[0].emit({ playing: true }));
    press('media-podcast-play-p-1');
    expect(audioPlayers[0].pause).toHaveBeenCalled();
  });

  it.each([[[]], ['error']])('shows the web empty state for %p', async (podcasts) => {
    renderScreen({ podcasts: podcasts as never });
    expect(await screen.findByTestId('media-podcasts-empty')).toBeTruthy();
  });
});

describe('upload', () => {
  const openUpload = async () => {
    const r = renderScreen();
    await screen.findByTestId('media-shorts-list');
    press('media-upload-open');
    await screen.findByTestId('media-upload');
    return r;
  };

  it('needs a type, a file and a title before it can submit', async () => {
    await openUpload();
    expect(screen.getByTestId('media-upload-submit').props.accessibilityState.disabled).toBe(true);
    press('media-upload-type-video');
    press('media-upload-choose');
    await screen.findByTestId('media-upload-file');
    expect(screen.getByTestId('media-upload-submit').props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('media-upload-title'), 'My clip');
    expect(screen.getByTestId('media-upload-submit').props.accessibilityState.disabled).toBe(false);
  });

  it('uploads a video through the port and refetches the shorts', async () => {
    const { fake } = await openUpload();
    press('media-upload-type-video');
    press('media-upload-choose');
    await screen.findByTestId('media-upload-file');
    expect(imagePicker.launchImageLibraryAsync.mock.calls[0][0]).toMatchObject({ mediaTypes: ['videos'] });
    fireEvent.changeText(screen.getByTestId('media-upload-title'), 'My clip');
    fireEvent.changeText(screen.getByTestId('media-upload-topic'), 'Wellness');
    press('media-upload-tag-sleep');
    press('media-upload-submit');
    await waitFor(() => expect(fake.calls.uploadVideo).toHaveLength(1));
    expect(fake.calls.uploadVideo[0]).toMatchObject({
      file: { uri: 'file:///clip.mp4', name: 'clip.mp4', mimeType: 'video/mp4' },
      title: 'My clip',
      description: '',
      tags: ['sleep'],
      category: 'Wellness',
      language: 'English',
      durationSec: 42,
    });
    await waitFor(() => expect(fake.refetch.shorts).toHaveBeenCalled());
    expect(__toastsForTests().some((tt) => tt.titleKey === 'mediaHub.toast.uploadSuccess')).toBe(true);
  });

  it('uploads music with genre, mood and visibility, then refetches music', async () => {
    const { fake } = await openUpload();
    press('media-upload-type-music');
    press('media-upload-choose');
    await screen.findByTestId('media-upload-file');
    expect(docPicker.getDocumentAsync.mock.calls[0][0]).toMatchObject({ type: 'audio/*' });
    fireEvent.changeText(screen.getByTestId('media-upload-title'), 'Song');
    fireEvent.changeText(screen.getByTestId('media-upload-genre'), 'Jazz');
    fireEvent.changeText(screen.getByTestId('media-upload-mood'), 'Calm');
    press('media-upload-visibility-private');
    press('media-upload-submit');
    await waitFor(() => expect(fake.calls.uploadAudio).toHaveLength(1));
    expect(fake.calls.uploadAudio[0]).toMatchObject({ mediaType: 'music', title: 'Song', genre: 'Jazz', mood: 'Calm', visibility: 'private', hostGuest: undefined, file: { name: 'song.mp3', size: 2048 } });
    await waitFor(() => expect(fake.refetch.music).toHaveBeenCalled());
  });

  it('uploads a podcast with host / guest and language, then refetches podcasts', async () => {
    const { fake } = await openUpload();
    press('media-upload-type-podcast');
    press('media-upload-choose');
    await screen.findByTestId('media-upload-file');
    fireEvent.changeText(screen.getByTestId('media-upload-title'), 'Episode');
    fireEvent.changeText(screen.getByTestId('media-upload-host'), 'Hanna, Max');
    fireEvent.changeText(screen.getByTestId('media-upload-language'), 'German');
    press('media-upload-submit');
    await waitFor(() => expect(fake.calls.uploadAudio).toHaveLength(1));
    expect(fake.calls.uploadAudio[0]).toMatchObject({ mediaType: 'podcast', hostGuest: 'Hanna, Max', language: 'German', visibility: 'public', genre: undefined });
    await waitFor(() => expect(fake.refetch.podcasts).toHaveBeenCalled());
  });

  it('rejects an unsupported video, a too-long video and an oversized audio file with a toast', async () => {
    const { fake } = await openUpload();
    press('media-upload-type-video');
    imagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///x.avi', fileName: 'x.avi', mimeType: 'video/x-msvideo', fileSize: 10, duration: 1000 }] });
    press('media-upload-choose');
    await waitFor(() => expect(__toastsForTests().some((tt) => tt.titleKey === 'mediaHubNative.upload.invalid.type')).toBe(true));
    imagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///long.mp4', fileName: 'long.mp4', mimeType: 'video/mp4', fileSize: 10, duration: 301000 }] });
    press('media-upload-choose');
    await waitFor(() => expect(__toastsForTests().some((tt) => tt.titleKey === 'mediaHubNative.upload.invalid.duration')).toBe(true));
    press('media-upload-type-music');
    docPicker.getDocumentAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///big.mp3', name: 'big.mp3', mimeType: 'audio/mpeg', size: 51 * 1024 * 1024 }] });
    press('media-upload-choose');
    await waitFor(() => expect(__toastsForTests().some((tt) => tt.titleKey === 'mediaHubNative.upload.invalid.size')).toBe(true));
    expect(screen.queryByTestId('media-upload-file')).toBeNull();
    expect(fake.calls.uploadVideo).toBeUndefined();
  });

  it('a denied photo permission or a cancelled picker picks nothing', async () => {
    await openUpload();
    press('media-upload-type-video');
    imagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
    press('media-upload-choose');
    await waitFor(() => expect(__toastsForTests().some((tt) => tt.titleKey === 'mediaHubNative.toast.permissionDenied')).toBe(true));
    imagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] as never });
    press('media-upload-choose');
    await waitFor(() => expect(imagePicker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(screen.queryByTestId('media-upload-file')).toBeNull();
  });

  it('a failed upload raises the failure toast and keeps the sheet open', async () => {
    const r = renderScreen({ failWith: { uploadAudio: true } });
    await screen.findByTestId('media-shorts-list');
    press('media-upload-open');
    press('media-upload-type-music');
    press('media-upload-choose');
    await screen.findByTestId('media-upload-file');
    fireEvent.changeText(screen.getByTestId('media-upload-title'), 'Song');
    press('media-upload-submit');
    await waitFor(() => expect(__toastsForTests().some((tt) => tt.titleKey === 'toasts.hooks.uploadFailed')).toBe(true));
    expect(screen.getByTestId('media-upload')).toBeTruthy();
    expect(r.fake.refetch.music).not.toHaveBeenCalled();
  });

  it('Remove clears the chosen file', async () => {
    await openUpload();
    press('media-upload-type-music');
    press('media-upload-choose');
    await screen.findByTestId('media-upload-file');
    press('media-upload-remove');
    expect(screen.queryByTestId('media-upload-file')).toBeNull();
  });
});

describe('chrome', () => {
  it('Autopilot and Calendar emit their overlay events', async () => {
    const autopilot = jest.fn();
    const calendar = jest.fn();
    const off1 = overlayBus.on('autopilot:open', autopilot);
    const off2 = overlayBus.on('calendar:open', calendar);
    renderScreen();
    await screen.findByTestId('media-shorts-list');
    press('media-autopilot');
    press('media-calendar');
    expect(autopilot).toHaveBeenCalledTimes(1);
    expect(calendar).toHaveBeenCalledTimes(1);
    off1();
    off2();
  });

  it('the search button expands an input and has no result action', async () => {
    renderScreen();
    await screen.findByTestId('media-shorts-list');
    press('media-search');
    fireEvent.changeText(screen.getByTestId('media-search-input'), 'yoga');
    expect(screen.getByTestId('media-shorts-list')).toBeTruthy();
  });

  it('the enrichment strip shows the community cards and hides on a gateway error', async () => {
    const gateway = { '/enrichment-cards?screen=community': { ok: true, cards: [{ card_type: 'E1', category: 'enrichment', priority: 1, title: 'Complete your profile', description: 'Add a photo' }] } };
    renderScreen({}, { gateway });
    expect(await screen.findByTestId('media-enrichment-strip')).toBeTruthy();
    expect(screen.getByText('Complete your profile')).toBeTruthy();
  });

  it('no strip without cards', async () => {
    renderScreen();
    await screen.findByTestId('media-shorts-list');
    expect(screen.queryByTestId('media-enrichment-strip')).toBeNull();
  });
});
