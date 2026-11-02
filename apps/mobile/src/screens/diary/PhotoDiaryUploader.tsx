/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — twin of the web
 * `src/components/diary/PhotoDiaryUploader.tsx`. "Upload today's entry" opens
 * the photo-source sheet (camera or library through `expo-image-picker`,
 * replacing `<input type="file" accept="image/*" multiple>`); the picked
 * photos show in a 3-column grid with remove buttons, an optional caption,
 * "Save entry" and "Add more". Saving uploads every photo to the public
 * `diary-photos` bucket, then writes the entry through the one diary write
 * path (`POST /memory/diary/entries`, source `photo`, the public urls as
 * attachments), puts it at the top of the cached list and toasts the Index move.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button, notifyError } from '../../ports/ui';
import { ButtonIcon, Textarea } from '../../ports/diary';
import type { PickedImage } from '../../ports/diary-capture';
import { currentUserId, saveDiaryEntry, useInvalidateDiary, usePrependEntry } from './data/entries';
import { uploadDiaryPhotos } from './data/storage';
import { PhotoSourceSheet, PhotoThumbs, notifyDiarySaved } from './components';
import { useDiaryText } from './text';

export function PhotoDiaryUploader({ onUploadComplete }: { onUploadComplete?: () => void }): ReactElement {
  const x = useDiaryText();
  const { t } = x;
  const { width } = useWindowDimensions();
  const invalidate = useInvalidateDiary();
  const prepend = usePrependEntry();
  const [images, setImages] = useState<PickedImage[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  // Three columns inside the screen padding (16) + the card padding (12) on each side, gap 8.
  const thumb = Math.max(64, Math.floor((width - 2 * 16 - 2 * 12 - 2 * 8 - 2 * 4) / 3));

  const upload = async () => {
    if (images.length === 0) {
      notifyError('toasts.diary.noPhotosSelected', 'toasts.diary.pleaseSelectAtLeastOnePhoto');
      return;
    }
    setUploading(true);
    try {
      const userId = await currentUserId();
      const urls = await uploadDiaryPhotos(userId, images);
      const text = caption.trim();
      const saved = await saveDiaryEntry({ text, source: 'photo', tags: ['diary', 'photo'], attachments: urls });
      prepend({
        id: saved.entry.id,
        user_id: userId,
        text,
        source: 'photo',
        tags: ['diary', 'photo'],
        attachments: urls,
        duration: null,
        created_at: saved.entry.created_at,
        updated_at: saved.entry.created_at,
      });
      invalidate();
      notifyDiarySaved(x, saved.index, ['toasts.diary.photosUploaded', 'toasts.diary.yourPhotoDiaryEntryHasSaved'], 'diaryNative.indexSaved.signalsCaption');
      setImages([]);
      setCaption('');
      onUploadComplete?.();
    } catch {
      notifyError('toasts.diary.uploadFailed', 'toasts.diary.failedSaveYourPhotoEntryPlease');
    } finally {
      setUploading(false);
    }
  };

  const sheet = <PhotoSourceSheet open={sourceOpen} onClose={() => setSourceOpen(false)} onPicked={(picked) => setImages((prev) => [...prev, ...picked])} />;

  if (images.length === 0) {
    return (
      <View testID="diary-photo-uploader">
        <Button testID="diary-photo-pick" variant="outline" size="lg" onPress={() => setSourceOpen(true)}>
          <ButtonIcon name="Image" size={20} />
          {t('screens.diary.uploadTodaySEntry')}
        </Button>
        {sheet}
      </View>
    );
  }

  return (
    <View testID="diary-photo-uploader" style={styles.root}>
      <PhotoThumbs images={images} size={thumb} onRemove={(i) => setImages((prev) => prev.filter((_, j) => j !== i))} />
      <Textarea testID="diary-photo-caption" placeholder={t('screens.diary.addCaptionOptional')} value={caption} onChangeText={setCaption} rows={3} />
      <View style={styles.actions}>
        <Button testID="diary-photo-save" style={styles.fill} disabled={uploading} onPress={() => void upload()}>
          <ButtonIcon name="Upload" />
          {uploading ? t('screens.diary.uploading') : t('screens.diary.saveEntry')}
        </Button>
        <Button testID="diary-photo-add-more" variant="outline" onPress={() => setSourceOpen(true)}>
          <ButtonIcon name="Image" />
          {t('screens.diary.addMore')}
        </Button>
      </View>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  actions: { flexDirection: 'row', gap: 8 },
  fill: { flex: 1 },
});
