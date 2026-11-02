/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — shared parts of the Daily
 * Diary screen: the web `Panel` / `Card` surface, the photo-source sheet (the
 * phone's "Take photo / Photo library" chooser that a web
 * `<input type="file" accept="image/*">` opens, as a native system-style
 * sheet), the picked-photo thumbnails with their remove button, and the
 * "saved" toast with the Vitana Index move (web TextDiaryEditor /
 * PhotoDiaryUploader). Ports only; RTL-safe (logical start/end).
 */
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BottomSheet, PressableRow, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { DiaryIcon } from '../../ports/diary';
import { pickDiaryImages, type PickedImage, type PickSource } from '../../ports/diary-capture';
import { useI18n } from '../../i18n/I18nProvider';
import type { DiaryIndexResult } from './data/entries';
import type { DiaryText } from './text';

/** The web `Panel` / `Card`: a bordered rounded surface. */
export function DiaryCard({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

/** Asks library or camera, then runs the picker; denied / cancelled are handled here. */
export function PhotoSourceSheet({ open, onClose, onPicked, testID = 'diary-photo-source' }: { open: boolean; onClose: () => void; onPicked: (images: PickedImage[]) => void; testID?: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const pick = async (source: PickSource) => {
    onClose();
    const r = await pickDiaryImages(source);
    if (r.status === 'denied') notifyError('diaryNative.permissions.deniedTitle', source === 'camera' ? 'diaryNative.permissions.deniedCamera' : 'diaryNative.permissions.deniedPhotos');
    else if (r.status === 'picked') onPicked(r.images);
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={t('diaryNative.photoSource.title')} testID={testID}>
      <PressableRow testID={`${testID}-camera`} onPress={() => void pick('camera')} style={styles.sourceRow}>
        <DiaryIcon name="Camera" size={20} color={colors.foreground} />
        <Text>{t('diaryNative.photoSource.camera')}</Text>
      </PressableRow>
      <PressableRow testID={`${testID}-library`} onPress={() => void pick('library')} style={styles.sourceRow}>
        <DiaryIcon name="Image" size={20} color={colors.foreground} />
        <Text>{t('diaryNative.photoSource.library')}</Text>
      </PressableRow>
    </BottomSheet>
  );
}

/** Picked photos as square thumbnails, each with a remove button (web preview grid). */
export function PhotoThumbs({ images, onRemove, size, testID = 'diary-photo-thumb' }: { images: PickedImage[]; onRemove: (index: number) => void; size: number; testID?: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.thumbs}>
      {images.map((img, i) => (
        <View key={`${img.uri}-${i}`} testID={`${testID}-${i}`} style={[styles.thumb, { width: size, height: size, borderColor: colors.border }]}>
          <Image source={{ uri: img.uri }} style={styles.fill} accessibilityLabel={t('screens.diary.photoPreview')} />
          <Pressable
            testID={`${testID}-${i}-remove`}
            accessibilityRole="button"
            accessibilityLabel={t('diaryNative.removePhoto')}
            onPress={() => onRemove(i)}
            hitSlop={8}
            style={[styles.thumbRemove, { backgroundColor: colors.background }]}
          >
            <DiaryIcon name="X" size={14} color={colors.foreground} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/**
 * The toast after a saved entry: "Saved · Vitana Index +N" with the moved
 * pillars when the gateway's Index sync moved the score, else the plain
 * saved toast (web TextDiaryEditor / PhotoDiaryUploader).
 */
export function notifyDiarySaved(x: DiaryText, sync: DiaryIndexResult | null | undefined, plain: [string, string], signalsKey: string): void {
  const moved = sync?.index_delta?.total ?? 0;
  if (sync && moved > 0) {
    const breakdown = x.formatIndexDelta(sync.index_delta);
    notify('diaryNative.indexSaved.title', breakdown ? 'diaryNative.indexSaved.breakdown' : signalsKey, { n: x.fmtNumber(moved), breakdown, count: x.fmtNumber(sync.health_features_written) });
  } else {
    notify(plain[0], plain[1]);
  }
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { borderRadius: 8, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  fill: { width: '100%', height: '100%' },
  thumbRemove: { position: 'absolute', top: 4, end: 4, borderRadius: 999, padding: 4 },
});
