/**
 * VTID-05429 (Native Wave 2, profile lane) — the profile's upload surfaces,
 * twins of the web components the mobile `/me/profile` mounts:
 *
 *   GalleryUploadSheet ← `src/components/profile/gallery/PhotoUploadDialog.tsx`
 *                        (several photos, caption, "Visible to everyone", Upload n Photos)
 *   GalleryDeleteSheet ← the `PhotoGallery.tsx` delete AlertDialog
 *   CoverLibraryTile   ← the Posts-tab Cover Library button (`EditProfilePage.tsx` mobile branch)
 *   CoverLibrarySheet  ← `src/components/profile/drawers/CoverLibraryDrawer.tsx`
 *                        (universal photo + activity-tagged library)
 *
 * Photos come from `expo-image-picker` through `src/ports/profile-media.ts`;
 * every write is a built request sent by `data/uploads.ts`. Tests assert the
 * built requests on the doubles; nothing is sent (R5.2). React 19: `ReactElement`.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BottomSheet, Button, IconButton, PressableRow, Spinner, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { Switch } from '../../ports/profile-ui';
import {
  COVER_EXTS,
  GALLERY_TYPES,
  buildGalleryUpload,
  libraryCoverPrefix,
  pickProfileImages,
  universalCoverPrefix,
  type ProfileImage,
} from '../../ports/profile-media';
import { useI18n } from '../../i18n/I18nProvider';
import { pickCheckedImage } from './media';
import {
  buildCoverLibraryInsert,
  buildGalleryInsert,
  buildUniversalCoverUpdate,
  deleteCoverLibraryRow,
  deleteGalleryPhoto,
  loadCoverLibrary,
  newId,
  runCoverLibraryInsert,
  runGalleryInsert,
  runStorageUpload,
  runUniversalCoverUpdate,
  uploadIntentCover,
  type CoverLibraryRow,
  type IntentCategory,
} from './data/uploads';

// ── gallery ──

export function GalleryUploadSheet({ open, onClose, userId, photoCount }: { open: boolean; onClose: () => void; userId: string; photoCount: number }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const reset = () => {
    setImages([]);
    setCaption('');
  };
  const close = () => {
    if (progress) return;
    reset();
    onClose();
  };

  // Web addFiles: only JPEG / PNG / WebP are kept.
  const pick = async () => {
    const picked = await pickProfileImages({ multiple: true });
    if (picked.status === 'denied') {
      notifyError('gallery.upload', 'profileNative.media.photosDenied');
      return;
    }
    if (picked.status !== 'picked') return;
    const valid = picked.images.filter((i) => (GALLERY_TYPES as readonly string[]).includes(i.mimeType));
    if (valid.length) setImages((prev) => [...prev, ...valid]);
  };

  // Web handleSubmit → useProfileGallery.uploadPhoto per file (sort_order = photos.length at that time).
  const submit = async () => {
    if (images.length === 0) return;
    let count = photoCount;
    try {
      for (let i = 0; i < images.length; i++) {
        setProgress({ current: i + 1, total: images.length });
        const image = images[i];
        const url = await runStorageUpload(buildGalleryUpload(userId, image, newId()), image);
        await runGalleryInsert(buildGalleryInsert(userId, url, caption.trim() || undefined, isPublic, count));
        count += 1;
      }
    } catch {
      notifyError('toasts.profile.uploadFailed');
    } finally {
      setProgress(null);
      void queryClient.invalidateQueries({ queryKey: ['profile-gallery', userId] });
    }
    reset();
    onClose();
  };

  const working = !!progress;
  const label = working
    ? `${progress.current}/${progress.total}...`
    : images.length > 1
      ? `${t('gallery.upload')} ${images.length} ${t('profileNative.gallery.photos')}`
      : t('gallery.upload');

  return (
    <BottomSheet open={open} onClose={close} title={t('gallery.upload')} testID="gallery-upload-sheet">
      <PressableRow onPress={() => void (working ? undefined : pick())} accessibilityLabel={t('profileNative.gallery.selectMultiple')} testID="gallery-upload-pick" style={[styles.dropzone, { borderColor: colors.border }]}>
        {images.length > 0 ? (
          <View style={styles.fill}>
            <View style={styles.thumbs}>
              {images.map((img, i) => (
                <View key={`${img.uri}-${i}`} style={styles.thumbWrap} testID={`gallery-upload-thumb-${i}`}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} accessibilityIgnoresInvertColors />
                  {!working ? (
                    <View style={styles.thumbRemove}>
                      <IconButton name="X" size={14} accessibilityLabel={t('profileEditor.identity.remove')} onPress={() => setImages(images.filter((_, j) => j !== i))} testID={`gallery-upload-remove-${i}`} />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
            {!working ? (
              <Text variant="caption" muted>
                {t('profileNative.gallery.tapToAddMore')}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.center}>
            <Text muted>{t('profileNative.gallery.selectMultiple')}</Text>
            <Text variant="caption" muted>
              {t('screens.profile.jpegPngWebp')}
            </Text>
          </View>
        )}
      </PressableRow>
      {progress ? (
        <Text variant="caption" muted style={styles.centerText} testID="gallery-upload-progress">
          {t('profileNative.gallery.uploadingProgress', { current: progress.current, total: progress.total })}
        </Text>
      ) : null}
      <View style={styles.field}>
        <Text variant="label">{t('gallery.caption')}</Text>
        <TextInput value={caption} onChangeText={setCaption} placeholder={t('gallery.captionPlaceholder')} accessibilityLabel={t('gallery.caption')} editable={!working} testID="gallery-upload-caption" />
      </View>
      <View style={styles.rowBetween}>
        <Text variant="label">{t('gallery.publicLabel')}</Text>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={working} accessibilityLabel={t('gallery.publicLabel')} testID="gallery-upload-public" />
      </View>
      <View style={styles.actions}>
        <View style={styles.fill}>
          <Button variant="outline" onPress={close} disabled={working} testID="gallery-upload-cancel">
            {t('common.cancel')}
          </Button>
        </View>
        <View style={styles.fill}>
          <Button onPress={() => void submit()} disabled={images.length === 0 || working} testID="gallery-upload-submit">
            {label}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export function GalleryDeleteSheet({ photoId, onClose, userId }: { photoId: string | null; onClose: () => void; userId: string }): ReactElement {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const confirm = async () => {
    if (!photoId) return;
    onClose();
    try {
      await deleteGalleryPhoto(photoId);
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['profile-gallery', userId] });
    }
  };
  return (
    <BottomSheet open={!!photoId} onClose={onClose} title={t('profileNative.gallery.deleteTitle')} testID="gallery-delete-sheet">
      <Text muted>{t('profileNative.gallery.deleteDescription')}</Text>
      <View style={styles.actions}>
        <View style={styles.fill}>
          <Button variant="outline" onPress={onClose} testID="gallery-delete-cancel">
            {t('common.cancel')}
          </Button>
        </View>
        <View style={styles.fill}>
          <Button variant="destructive" onPress={() => void confirm()} testID="gallery-delete-confirm">
            {t('common.delete')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

// ── cover library ──

export function CoverLibraryTile({ onPress }: { onPress: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <PressableRow onPress={onPress} accessibilityLabel={t('profileEditor.coverLibrary.tileTitle')} testID="profile-cover-library-tile" style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.fill}>
        <Text weight="600">{t('profileEditor.coverLibrary.tileTitle')}</Text>
        <Text variant="caption" muted numberOfLines={1}>
          {t('profileEditor.coverLibrary.tileSubtitle')}
        </Text>
      </View>
      <Text variant="caption" color={colors.primary}>
        {t('editProfile.tapToEdit')}
      </Text>
    </PressableRow>
  );
}

export function CoverLibrarySheet({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [universalUrl, setUniversalUrl] = useState<string | null>(null);
  const [universalBusy, setUniversalBusy] = useState(false);
  const [categories, setCategories] = useState<IntentCategory[]>([]);
  const [rows, setRows] = useState<CoverLibraryRow[]>([]);
  const [pendingCategory, setPendingCategory] = useState('');
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Web: load on open; soft-fail to the empty state.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    loadCoverLibrary(userId)
      .then((d) => {
        if (cancelled) return;
        setUniversalUrl(d.universalUrl);
        setRows(d.rows);
        setCategories(d.categories);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const covered = new Set(rows.map((r) => r.category));

  const uploadUniversal = async () => {
    const image = await pickCheckedImage(COVER_EXTS, 'toasts.profile.uploadFailed');
    if (!image) return;
    setUniversalBusy(true);
    try {
      const url = await uploadIntentCover(userId, universalCoverPrefix(userId), image);
      await runUniversalCoverUpdate(buildUniversalCoverUpdate(userId, url));
      setUniversalUrl(url);
      notify('toasts.profile.universalCoverUploaded');
    } catch {
      notifyError('toasts.profile.uploadFailed');
    } finally {
      setUniversalBusy(false);
    }
  };

  const removeUniversal = async () => {
    if (!universalUrl) return;
    setUniversalBusy(true);
    try {
      await runUniversalCoverUpdate(buildUniversalCoverUpdate(userId, null));
      setUniversalUrl(null);
      notify('toasts.profile.universalCoverRemoved');
    } catch {
      notifyError('toasts.profile.saveFailed');
    } finally {
      setUniversalBusy(false);
    }
  };

  const addLibraryPhoto = async () => {
    if (!pendingCategory) {
      notifyError('toasts.profile.categoryRequired');
      return;
    }
    const image = await pickCheckedImage(COVER_EXTS, 'toasts.profile.uploadFailed');
    if (!image) return;
    setLibraryBusy(true);
    try {
      const url = await uploadIntentCover(userId, libraryCoverPrefix(userId, newId()), image);
      const inserted = await runCoverLibraryInsert(buildCoverLibraryInsert(userId, pendingCategory, url));
      setRows((prev) => [inserted, ...prev]);
      setPendingCategory('');
      notify('toasts.profile.libraryPhotoUploaded');
    } catch {
      notifyError('toasts.profile.uploadFailed');
    } finally {
      setLibraryBusy(false);
    }
  };

  const removeLibraryRow = async (row: CoverLibraryRow) => {
    setDeleting(row.id);
    try {
      await deleteCoverLibraryRow(row.id, userId);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      notify('toasts.profile.libraryPhotoRemoved');
    } catch {
      notifyError('toasts.profile.saveFailed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('profileEditor.coverLibrary.drawerTitle')} testID="cover-library-sheet">
      <ScrollView contentContainerStyle={styles.sheetScroll}>
        <View style={styles.field} testID="cover-library-universal">
          <Text weight="600">{t('profileEditor.coverLibrary.universalSection')}</Text>
          <Text variant="caption" muted>
            {t('profileEditor.coverLibrary.universalDescription')}
          </Text>
          <View style={[styles.cover, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            {universalUrl ? (
              <Image source={{ uri: universalUrl }} style={StyleSheet.absoluteFill} accessibilityLabel={t('profileEditor.coverLibrary.universalSection')} testID="cover-library-universal-image" />
            ) : (
              <View style={styles.center}>
                <Text variant="caption" muted>
                  {t('profileEditor.coverLibrary.universalEmptyHint')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.row}>
            <Button variant="outline" size="sm" onPress={() => void uploadUniversal()} disabled={universalBusy} testID="cover-library-universal-upload">
              {universalUrl ? t('profileEditor.coverLibrary.universalReplace') : t('profileEditor.coverLibrary.universalAdd')}
            </Button>
            {universalUrl ? (
              <Button variant="ghost" size="sm" onPress={() => void removeUniversal()} disabled={universalBusy} testID="cover-library-universal-remove">
                {t('profileEditor.coverLibrary.universalRemove')}
              </Button>
            ) : null}
            {universalBusy ? <Spinner /> : null}
          </View>
        </View>

        <View style={[styles.field, styles.section, { borderColor: colors.border }]} testID="cover-library-library">
          <Text weight="600">{t('profileEditor.coverLibrary.librarySection')}</Text>
          <Text variant="caption" muted>
            {t('profileEditor.coverLibrary.libraryDescription')}
          </Text>
          <Text variant="label">{t('profileEditor.coverLibrary.libraryCategoryLabel')}</Text>
          {categories.length === 0 ? (
            <Text variant="caption" muted>
              {t('profileEditor.coverLibrary.libraryCategoryPlaceholder')}
            </Text>
          ) : (
            <View style={styles.chips}>
              {categories.map((c) => {
                const selected = pendingCategory === c.category_key;
                return (
                  <PressableRow
                    key={c.category_key}
                    onPress={() => setPendingCategory(selected ? '' : c.category_key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={c.label}
                    testID={`cover-library-category-${c.category_key}`}
                    style={[styles.chip, { borderColor: selected ? colors.primary : colors.border }]}
                  >
                    <Text variant="caption" color={selected ? colors.primary : undefined}>
                      {`${covered.has(c.category_key) ? '✅ ' : ''}${c.label}`}
                    </Text>
                  </PressableRow>
                );
              })}
            </View>
          )}
          <Button size="sm" onPress={() => void addLibraryPhoto()} disabled={libraryBusy || !pendingCategory} testID="cover-library-add">
            {t('profileEditor.coverLibrary.libraryAddPhoto')}
          </Button>
          {rows.length === 0 ? (
            <Text variant="caption" muted style={styles.centerText} testID="cover-library-empty">
              {t('profileEditor.coverLibrary.libraryEmpty')}
            </Text>
          ) : (
            <View style={styles.grid}>
              {rows.map((row) => {
                const label = categories.find((c) => c.category_key === row.category)?.label ?? row.category;
                return (
                  <View key={row.id} style={[styles.libraryItem, { borderColor: colors.border, backgroundColor: colors.muted }]} testID={`cover-library-row-${row.id}`}>
                    <Image source={{ uri: row.cover_url }} style={StyleSheet.absoluteFill} accessibilityLabel={label} />
                    <View style={styles.libraryRemove}>
                      {deleting === row.id ? (
                        <Spinner />
                      ) : (
                        <IconButton name="X" size={14} accessibilityLabel={t('profileEditor.coverLibrary.libraryRemoveButton')} onPress={() => void removeLibraryRow(row)} testID={`cover-library-remove-${row.id}`} />
                      )}
                    </View>
                    <View style={[styles.libraryLabel, { backgroundColor: colors.card }]}>
                      <Text variant="caption" numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  field: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 8 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1, paddingVertical: 8 },
  centerText: { textAlign: 'center' },
  dropzone: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, padding: 16 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { width: 72, height: 72, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbRemove: { position: 'absolute', top: 2, end: 2 },
  tile: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 16, gap: 12 },
  sheetScroll: { gap: 16, paddingBottom: 16 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
  cover: { width: '100%', aspectRatio: 16 / 10, borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  libraryItem: { width: '47%', aspectRatio: 16 / 10, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  libraryRemove: { position: 'absolute', top: 4, end: 4 },
  libraryLabel: { position: 'absolute', start: 0, end: 0, bottom: 0, paddingHorizontal: 8, paddingVertical: 2 },
});
