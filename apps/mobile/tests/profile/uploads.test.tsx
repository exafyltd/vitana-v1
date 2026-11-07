/**
 * VTID-05429 (Native Wave 2, profile lane, review fix 1) — the profile media
 * uploads and the About links / languages editors. Every upload, insert,
 * delete and gateway call is asserted as the BUILT request on the client /
 * gateway doubles (they record, never send; the no-network guard is first).
 * Plus the mobile-web parity guard: no profile progress card and no
 * dance / partner / service-offering drawer on the native screen (the web
 * mounts them only on desktop). React 19: `ReactElement`, no global `JSX`.
 */
import '../helpers/no-network';
import { picker, routeParams } from './mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import {
  INTENT_CATEGORIES_CALL,
  buildAvatarUpload,
  buildCoverUpload,
  buildGalleryUpload,
  buildOutpaintCall,
  buildStagedCoverUpload,
  checkImage,
  classifyAspect,
  libraryCoverPrefix,
  pickProfileImages,
  universalCoverPrefix,
  AVATAR_EXTS,
  COVER_EXTS,
  type ProfileImage,
} from '../../src/ports/profile-media';
import { buildCoverLibraryInsert, buildGalleryInsert, buildUniversalCoverUpdate } from '../../src/screens/profile/data/uploads';
import { MyProfileScreen } from '../../src/screens/profile/MyProfileScreen';
import { createProfileDouble, profileRow, renderProfile } from './helpers';

const hidden = { includeHiddenElements: true } as const;
const NOW = new Date('2026-11-01T12:00:00.000Z');
const MS = NOW.getTime();

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  routeParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
});

const img = (over: Partial<ProfileImage> = {}): ProfileImage => ({
  uri: 'file:///a.jpg',
  base64: 'QUJD',
  mimeType: 'image/jpeg',
  fileName: 'a.jpg',
  width: 1600,
  height: 900,
  ...over,
});

const asset = (over: Record<string, unknown> = {}) => ({ uri: 'file:///a.jpg', base64: 'QUJD', mimeType: 'image/jpeg', fileName: 'a.jpg', width: 1600, height: 900, ...over });
const nextPick = (...assets: Record<string, unknown>[]) => picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets });

function loaded() {
  return createProfileDouble({
    email: 'ana@example.org',
    tables: {
      profiles: [{ ...profileRow, universal_intent_cover_url: null }],
      profile_gallery: [{ id: 'ph-1', user_id: 'u-1', image_url: 'https://cdn.example.org/a.jpg', caption: 'Stage' }],
      user_intent_cover_library: [{ id: 'cl-1', user_id: 'u-1', category: 'dance', cover_url: 'https://cdn.example.org/c.jpg' }],
    },
  });
}

describe('profile media port — request builders (web paths and shapes)', () => {
  it('avatar: avatars/<uid>/avatar-<ms>.<ext>, upsert (web IdentityForm.uploadFile)', () => {
    expect(buildAvatarUpload('u-1', img({ fileName: 'Me.PNG', mimeType: 'image/png' }), NOW)).toEqual({
      bucket: 'avatars',
      path: `u-1/avatar-${MS}.png`,
      contentType: 'image/png',
      upsert: true,
    });
  });

  it('gallery: media-uploads/<uid>/gallery/<uuid>.<ext> + the profile_gallery INSERT (web useProfileGallery)', () => {
    expect(buildGalleryUpload('u-1', img(), 'id-9')).toEqual({ bucket: 'media-uploads', path: 'u-1/gallery/id-9.jpg', contentType: 'image/jpeg' });
    expect(buildGalleryInsert('u-1', 'https://x/y.jpg', 'Hi', false, 3)).toEqual({
      table: 'profile_gallery',
      values: { user_id: 'u-1', image_url: 'https://x/y.jpg', caption: 'Hi', is_public: false, sort_order: 3 },
    });
  });

  it('cover: prefixes, direct upload, staged upload and the outpaint call (web CoverLibraryDrawer + coverImageTo16x9)', () => {
    expect(universalCoverPrefix('u-1', NOW)).toBe(`user-universal/u-1/${MS}`);
    expect(libraryCoverPrefix('u-1', 'id-2')).toBe('user-library/u-1/id-2');
    expect(buildCoverUpload('user-library/u-1/id-2', img())).toEqual({ bucket: 'intent-covers', path: 'user-library/u-1/id-2.jpg', contentType: 'image/jpeg', upsert: true });
    expect(buildStagedCoverUpload('u-1', img(), NOW, 'abc123')).toEqual({ bucket: 'intent-covers', path: `staging/u-1/${MS}-abc123.jpg`, contentType: 'image/jpeg', upsert: true });
    expect(buildOutpaintCall('staging/u-1/x.jpg', 'user-universal/u-1/5')).toEqual({
      path: '/cover-images/outpaint',
      init: { method: 'POST', body: JSON.stringify({ source_path: 'staging/u-1/x.jpg', target_path: 'user-universal/u-1/5.png' }) },
    });
    expect(INTENT_CATEGORIES_CALL).toEqual({ path: '/intent-categories', init: { method: 'GET' } });
    expect(buildUniversalCoverUpdate('u-1', null)).toEqual({ table: 'profiles', values: { universal_intent_cover_url: null }, match: { user_id: 'u-1' } });
    expect(buildCoverLibraryInsert('u-1', 'dance', 'https://x')).toEqual({ table: 'user_intent_cover_library', values: { user_id: 'u-1', category: 'dance', cover_url: 'https://x' } });
  });

  it('classifies the aspect like the web (±3 % of 16:9 passes, wider crops, narrower is extended)', () => {
    expect(classifyAspect(1600, 900)).toBe('passthrough');
    expect(classifyAspect(2000, 900)).toBe('crop');
    expect(classifyAspect(900, 1600)).toBe('letterbox_blur');
    expect(classifyAspect(0, 0)).toBe('letterbox_blur');
  });

  it('refuses HEIC and formats outside the web allow-lists', () => {
    expect(checkImage(img({ fileName: 'a.heic', mimeType: 'image/heic' }), AVATAR_EXTS)).toBe('heic');
    expect(checkImage(img({ fileName: 'a.svg', mimeType: 'image/svg+xml' }), AVATAR_EXTS)).toBe('ok');
    expect(checkImage(img({ fileName: 'a.svg', mimeType: 'image/svg+xml' }), COVER_EXTS)).toBe('unsupported');
  });

  it('pickProfileImages opens the library through expo-image-picker (base64, size) and reports a refused permission', async () => {
    nextPick(asset({ fileName: null, mimeType: 'image/png', width: 10, height: 20 }));
    await expect(pickProfileImages({ multiple: true })).resolves.toEqual({
      status: 'picked',
      images: [{ uri: 'file:///a.jpg', base64: 'QUJD', mimeType: 'image/png', fileName: 'photo-1.png', width: 10, height: 20 }],
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({ mediaTypes: ['images'], base64: true, quality: 0.8, allowsMultipleSelection: true });
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
    await expect(pickProfileImages()).resolves.toEqual({ status: 'denied' });
  });
});

describe('Identity sheet — avatar upload', () => {
  it('uploads the picked photo to avatars and the save carries its public url at 50/50', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-edit-identity')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-edit-identity'));
    await waitFor(() => expect(screen.getByTestId('identity-display-name', hidden).props.value).toBe('Ana Belić'));
    nextPick(asset({ fileName: 'me.webp', mimeType: 'image/webp' }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('identity-avatar-upload', hidden));
    });
    await waitFor(() => expect(d.uploads).toHaveLength(1));
    expect(d.uploads[0]).toEqual({ bucket: 'avatars', path: expect.stringMatching(/^u-1\/avatar-\d+\.webp$/), bytes: 3, options: { contentType: 'image/webp', upsert: true } });
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('profileEditor.identity.avatarUploaded');
    expect(d.writes).toEqual([]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('identity-sheet-save', hidden));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.writes[0].values).toMatchObject({ avatar_url: `https://storage.test/avatars/${d.uploads[0].path}`, avatar_offset_x: 50, avatar_offset_y: 50 });
  });

  it('Remove clears the avatar in the built update; a HEIC pick is refused and nothing uploads', async () => {
    const d = createProfileDouble({ tables: { profiles: [{ ...profileRow, avatar_url: 'https://cdn.example.org/me.jpg', avatar_offset_x: 30 }] } });
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-edit-identity')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-edit-identity'));
    await waitFor(() => expect(screen.getByTestId('identity-avatar-remove', hidden)).toBeTruthy());
    nextPick(asset({ fileName: 'me.heic', mimeType: 'image/heic' }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('identity-avatar-upload', hidden));
    });
    expect(d.uploads).toEqual([]);
    expect(__toastsForTests().map((x) => x.descKey)).toContain('toasts.profile.heicheifFormatNotSupportedByBrowsers');
    fireEvent.press(screen.getByTestId('identity-avatar-remove', hidden));
    await act(async () => {
      fireEvent.press(screen.getByTestId('identity-sheet-save', hidden));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.writes[0].values).toMatchObject({ avatar_url: '', avatar_offset_x: 50, avatar_offset_y: 50 });
  });
});

describe('About sheet — links and languages editors', () => {
  it('adds, edits and removes links and languages; the save builds them (web AboutForm payload)', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-about'));
    fireEvent.press(screen.getByTestId('profile-about-card'));
    await waitFor(() => expect(screen.getByTestId('about-link-0-label', hidden).props.value).toBe('Site'));
    fireEvent.press(screen.getByTestId('about-add-link', hidden));
    fireEvent.changeText(screen.getByTestId('about-link-1-label', hidden), 'Blog');
    fireEvent.changeText(screen.getByTestId('about-link-1-url', hidden), 'https://blog.example.org');
    fireEvent.press(screen.getByTestId('about-link-0-remove', hidden));
    fireEvent.press(screen.getByTestId('about-language-de-remove', hidden));
    fireEvent.press(screen.getByTestId('about-add-language', hidden));
    fireEvent.press(screen.getByTestId('about-language-option-spanish', hidden));
    // Adding a language already listed changes nothing (web addLanguage).
    fireEvent.press(screen.getByTestId('about-add-language', hidden));
    fireEvent.press(screen.getByTestId('about-language-option-spanish', hidden));
    expect(screen.getByTestId('about-language-Spanish', hidden)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('about-sheet-save', hidden));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.writes[0]).toEqual({
      table: 'profiles',
      values: { bio: 'Salsa every Friday.', location: 'Berlin', links: [{ label: 'Blog', url: 'https://blog.example.org' }], languages: ['en', 'Spanish'], updated_at: expect.any(String) },
      filters: [['user_id', 'u-1']],
    });
  });
});

describe('Media tab — photo gallery upload and delete', () => {
  it('uploads each picked photo to media-uploads and inserts a profile_gallery row with caption, visibility and sort order', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-media'));
    await waitFor(() => expect(screen.getByTestId('profile-photo-ph-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-gallery-upload'));
    nextPick(asset(), asset({ uri: 'file:///b.png', fileName: 'b.png', mimeType: 'image/png' }), asset({ uri: 'file:///c.gif', fileName: 'c.gif', mimeType: 'image/gif' }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('gallery-upload-pick', hidden));
    });
    // GIF is not in the web gallery's accepted types.
    await waitFor(() => expect(screen.getByTestId('gallery-upload-thumb-1', hidden)).toBeTruthy());
    expect(screen.queryByTestId('gallery-upload-thumb-2', hidden)).toBeNull();
    fireEvent.changeText(screen.getByTestId('gallery-upload-caption', hidden), '  Festival  ');
    fireEvent.press(screen.getByTestId('gallery-upload-public', hidden));
    await act(async () => {
      fireEvent.press(screen.getByTestId('gallery-upload-submit', hidden));
    });
    await waitFor(() => expect(d.inserts).toHaveLength(2));
    expect(d.uploads.map((u) => [u.bucket, u.options])).toEqual([
      ['media-uploads', { contentType: 'image/jpeg' }],
      ['media-uploads', { contentType: 'image/png' }],
    ]);
    expect(d.uploads[0].path).toMatch(/^u-1\/gallery\/[0-9a-f-]{36}\.jpg$/);
    expect(d.uploads[1].path).toMatch(/^u-1\/gallery\/[0-9a-f-]{36}\.png$/);
    expect(d.inserts).toEqual([
      { table: 'profile_gallery', values: { user_id: 'u-1', image_url: `https://storage.test/media-uploads/${d.uploads[0].path}`, caption: 'Festival', is_public: false, sort_order: 1 } },
      { table: 'profile_gallery', values: { user_id: 'u-1', image_url: `https://storage.test/media-uploads/${d.uploads[1].path}`, caption: 'Festival', is_public: false, sort_order: 2 } },
    ]);
  });

  it('deletes a photo by id after the confirm (web PhotoGallery AlertDialog)', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-media'));
    await waitFor(() => expect(screen.getByTestId('profile-photo-delete-ph-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-photo-delete-ph-1'));
    expect(d.deletes).toEqual([]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('gallery-delete-confirm', hidden));
    });
    await waitFor(() => expect(d.deletes).toEqual([{ table: 'profile_gallery', filters: [['id', 'ph-1']] }]));
  });
});

describe('Cover Library — universal and activity photos', () => {
  const categories = { '/intent-categories': { categories: [{ category_key: 'dance', label: 'Dancing' }, { category_key: 'tennis', label: 'Tennis' }] } };

  it('the Posts-tab tile opens it; a 16:9 universal photo uploads directly and sets universal_intent_cover_url', async () => {
    const d = loaded();
    const r = renderProfile(<MyProfileScreen />, { client: d.client, gateway: categories });
    await waitFor(() => expect(screen.getByTestId('profile-cover-library-tile')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-cover-library-tile'));
    await waitFor(() => expect(screen.getByTestId('cover-library-category-tennis', hidden)).toBeTruthy());
    expect(r.gatewayRequests.find((q) => q.path === '/intent-categories')).toMatchObject({ method: 'GET', headers: { 'X-Vitana-Active-Role': 'community' } });
    expect(screen.getByTestId('cover-library-row-cl-1', hidden)).toBeTruthy();
    nextPick(asset());
    await act(async () => {
      fireEvent.press(screen.getByTestId('cover-library-universal-upload', hidden));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.uploads).toEqual([{ bucket: 'intent-covers', path: expect.stringMatching(/^user-universal\/u-1\/\d+\.jpg$/), bytes: 3, options: { contentType: 'image/jpeg', upsert: true } }]);
    expect(d.writes[0]).toEqual({ table: 'profiles', values: { universal_intent_cover_url: `https://storage.test/intent-covers/${d.uploads[0].path}` }, filters: [['user_id', 'u-1']] });
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.profile.universalCoverUploaded');
  });

  it('a portrait photo is staged and sent to the gateway outpaint; the library row is inserted with its category', async () => {
    routeParams.current = { drawer: 'cover-library' };
    const d = loaded();
    const r = renderProfile(<MyProfileScreen />, {
      client: d.client,
      gateway: { ...categories, '/cover-images/outpaint': { url: 'https://storage.test/intent-covers/outpainted.png' } },
    });
    await waitFor(() => expect(screen.getByTestId('cover-library-category-tennis', hidden)).toBeTruthy());
    // No category yet → the web refuses (button disabled, nothing picked).
    expect(screen.getByTestId('cover-library-add', hidden).props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('cover-library-category-tennis', hidden));
    nextPick(asset({ width: 900, height: 1600 }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('cover-library-add', hidden));
    });
    await waitFor(() => expect(d.inserts).toHaveLength(1));
    expect(d.uploads).toEqual([{ bucket: 'intent-covers', path: expect.stringMatching(/^staging\/u-1\/\d+-[a-z0-9]+\.jpg$/), bytes: 3, options: { contentType: 'image/jpeg', upsert: true } }]);
    const outpaint = r.gatewayRequests.find((q) => q.path === '/cover-images/outpaint');
    expect(outpaint?.method).toBe('POST');
    expect(outpaint?.headers).toMatchObject({ 'X-Vitana-Active-Role': 'community', 'Content-Type': 'application/json' });
    const body = JSON.parse(outpaint?.body ?? '{}');
    expect(body.source_path).toBe(d.uploads[0].path);
    expect(body.target_path).toMatch(/^user-library\/u-1\/[0-9a-f-]{36}\.png$/);
    expect(d.inserts[0]).toEqual({ table: 'user_intent_cover_library', values: { user_id: 'u-1', category: 'tennis', cover_url: 'https://storage.test/intent-covers/outpainted.png' } });
  });

  it('when the outpaint fails the photo goes up directly at the final path', async () => {
    routeParams.current = { drawer: 'cover-library' };
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client, gateway: categories });
    await waitFor(() => expect(screen.getByTestId('cover-library-universal-upload', hidden)).toBeTruthy());
    nextPick(asset({ width: 900, height: 1600 }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('cover-library-universal-upload', hidden));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.uploads.map((u) => u.path)).toEqual([expect.stringMatching(/^staging\//), expect.stringMatching(/^user-universal\/u-1\/\d+\.jpg$/)]);
    expect(d.writes[0].values.universal_intent_cover_url).toBe(`https://storage.test/intent-covers/${d.uploads[1].path}`);
  });

  it('removes a library photo by id and user id', async () => {
    routeParams.current = { drawer: 'cover-library' };
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client, gateway: categories });
    await waitFor(() => expect(screen.getByTestId('cover-library-remove-cl-1', hidden)).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('cover-library-remove-cl-1', hidden));
    });
    await waitFor(() => expect(d.deletes).toEqual([{ table: 'user_intent_cover_library', filters: [['id', 'cl-1'], ['user_id', 'u-1']] }]));
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.profile.libraryPhotoRemoved');
  });
});

describe('mobile-web parity — desktop-only profile pieces stay off the native screen', () => {
  it.each(['dance', 'partner', 'offerings'])('?drawer=%s opens nothing (the mobile web branch mounts no such drawer)', async (drawer) => {
    routeParams.current = { drawer };
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    for (const label of ['My dance preferences', 'Partner preferences', 'Service offerings']) expect(screen.queryByText(label, hidden)).toBeNull();
    expect(screen.queryByTestId('cover-library-sheet', hidden)).toBeNull();
  });

  it('renders no profile progress card on any tab (ProfileProgressCard is rendered nowhere on the web)', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    for (const tab of ['posts', 'about', 'media', 'groups']) {
      fireEvent.press(screen.getByTestId(`profile-tabs-${tab}`));
      expect(screen.queryByText('Profile Completion', hidden)).toBeNull();
    }
  });
});
