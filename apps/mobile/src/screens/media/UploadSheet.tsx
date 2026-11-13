/**
 * VTID-05677 — native twin of `UnifiedUploadModal.tsx` (the mobile branch): pick
 * the media type (podcast / music / video), choose the file (video from the photo
 * library, audio from the document picker), fill title (required), description,
 * the type's own fields (music genre / mood, podcast host and guests / language,
 * video topic / language / custom thumbnail), tags from the Shorts allow-list and,
 * for audio, the visibility. Submit calls `MediaHubData.uploadVideo` /
 * `uploadAudio` and reports success to the screen (which refetches that list).
 * Not ported: the "smart upload" (AI title / tags from video frames, web
 * `useAutoShortMetadata`), which needs canvas frame extraction; the fields are
 * simply shown.
 */
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, TextInput, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { SHORTS_TAG_IDS, useMediaHubData, type PickedFile } from '../../ports/media';
import { MediaSheet } from './components';
import { pickAudioFile, pickThumbnailFile, pickVideoFile } from './device';
import { AUDIO_SIZE_LIMITS, validateVideo } from './data/uploads';

type UploadType = 'music' | 'podcast' | 'video';
const TYPES: UploadType[] = ['podcast', 'music', 'video'];

export function UploadSheet({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: (type: UploadType) => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const data = useMediaHubData();
  const [mediaType, setMediaType] = useState<UploadType | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [durationSec, setDurationSec] = useState<number | undefined>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [hostGuest, setHostGuest] = useState('');
  const [language, setLanguage] = useState('');
  const [topic, setTopic] = useState('');
  const [thumbnail, setThumbnail] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMediaType(null);
    setFile(null);
    setDurationSec(undefined);
    setTitle('');
    setDescription('');
    setTags([]);
    setVisibility('public');
    setGenre('');
    setMood('');
    setHostGuest('');
    setLanguage('');
    setTopic('');
    setThumbnail(null);
  };
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const choose = async () => {
    if (!mediaType) return;
    const res = mediaType === 'video' ? await pickVideoFile() : await pickAudioFile();
    if (res.status === 'denied') {
      notifyError('mediaHubNative.toast.permissionDenied', 'mediaHubNative.toast.permissionDeniedDesc');
      return;
    }
    if (res.status !== 'picked') return;
    if (mediaType === 'video') {
      const check = validateVideo(res.file, res.durationSec);
      if (!check.valid) {
        notifyError(`mediaHubNative.upload.invalid.${check.reason}`);
        return;
      }
    } else if (res.file.size > AUDIO_SIZE_LIMITS[mediaType]) {
      notifyError('mediaHubNative.upload.invalid.size');
      return;
    }
    setFile(res.file);
    setDurationSec(res.durationSec);
  };
  const chooseThumbnail = async () => {
    const res = await pickThumbnailFile();
    if (res.status === 'picked') setThumbnail(res.file);
    else if (res.status === 'denied') notifyError('mediaHubNative.toast.permissionDenied', 'mediaHubNative.toast.permissionDeniedDesc');
  };
  const toggleTag = (id: string) => setTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const valid = !!mediaType && !!file && title.trim().length > 0;
  const submit = async () => {
    if (!mediaType || !file || !title.trim() || busy) return;
    setBusy(true);
    try {
      if (mediaType === 'video') {
        await data.uploadVideo({ file, title, description, tags, category: topic || 'General', language: language || 'English', thumbnail: thumbnail ?? undefined, durationSec });
      } else {
        await data.uploadAudio({ file, mediaType, title, description, tags, visibility, genre: mediaType === 'music' ? genre : undefined, mood: mediaType === 'music' ? mood : undefined, hostGuest: mediaType === 'podcast' ? hostGuest : undefined, language: mediaType === 'podcast' ? language : undefined });
      }
      onUploaded(mediaType);
      onClose();
    } catch {
      notifyError('toasts.hooks.uploadFailed');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (!busy) onClose();
  };
  const typeLabel = (type: UploadType) => t(`mediaHub.menu.${type}`);
  const hint = (type: UploadType) => t(`mediaHubNative.upload.hint.${type}`);

  return (
    <MediaSheet open={open} onClose={close} title={t('mediaHub.upload.title')} testID="media-upload" closeLabel={t('common.close')}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text variant="label">{t('mediaHub.upload.mediaType')}</Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          {TYPES.map((type) => {
            const active = mediaType === type;
            return (
              <PressableRow
                key={type}
                onPress={() => {
                  if (busy) return;
                  setMediaType(type);
                  setFile(null);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={typeLabel(type)}
                testID={`media-upload-type-${type}`}
                style={[styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card }]}
              >
                <Text size="sm" weight="600" style={{ color: active ? colors.primaryForeground : colors.foreground }}>
                  {typeLabel(type)}
                </Text>
              </PressableRow>
            );
          })}
        </View>
        {!mediaType ? (
          <Text variant="caption" muted>
            {t('mediaHub.upload.selectMediaTypeFirst')}
          </Text>
        ) : (
          <>
            <Text variant="label">{t('mediaHub.upload.file')}</Text>
            {file ? (
              <View style={[styles.fileBox, { borderColor: colors.primary }]} testID="media-upload-file">
                <Text numberOfLines={1} style={styles.flex}>
                  {file.name}
                </Text>
                <Button variant="ghost" size="sm" onPress={() => setFile(null)} disabled={busy} testID="media-upload-remove">
                  {t('mediaHub.upload.remove')}
                </Button>
              </View>
            ) : (
              <>
                <Button variant="outline" onPress={() => void choose()} testID="media-upload-choose">
                  {t(mediaType === 'video' ? 'mediaHubNative.upload.chooseVideo' : 'mediaHubNative.upload.chooseAudio')}
                </Button>
                <Text variant="caption" muted>
                  {hint(mediaType)}
                </Text>
              </>
            )}
            <Text variant="label">{t('mediaHub.upload.titleLabel')}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder={t('mediaHub.upload.titlePlaceholder')} accessibilityLabel={t('mediaHub.upload.titleLabel')} maxLength={100} editable={!busy} testID="media-upload-title" />
            <Text variant="label">{t('mediaHub.upload.descriptionLabel')}</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder={t('mediaHub.upload.descriptionPlaceholder')} accessibilityLabel={t('mediaHub.upload.descriptionLabel')} multiline maxLength={500} editable={!busy} testID="media-upload-description" />
            {mediaType === 'music' ? (
              <>
                <Text variant="label">{t('mediaHub.upload.genre')}</Text>
                <TextInput value={genre} onChangeText={setGenre} placeholder={t('mediaHub.upload.genrePlaceholder')} accessibilityLabel={t('mediaHub.upload.genre')} editable={!busy} testID="media-upload-genre" />
                <Text variant="label">{t('mediaHub.upload.mood')}</Text>
                <TextInput value={mood} onChangeText={setMood} placeholder={t('mediaHub.upload.moodPlaceholder')} accessibilityLabel={t('mediaHub.upload.mood')} editable={!busy} testID="media-upload-mood" />
              </>
            ) : null}
            {mediaType === 'podcast' ? (
              <>
                <Text variant="label">{t('mediaHub.upload.hostGuest')}</Text>
                <TextInput value={hostGuest} onChangeText={setHostGuest} placeholder={t('mediaHub.upload.hostGuestPlaceholder')} accessibilityLabel={t('mediaHub.upload.hostGuest')} editable={!busy} testID="media-upload-host" />
              </>
            ) : null}
            {mediaType !== 'music' ? (
              <>
                <Text variant="label">{t('mediaHub.upload.language')}</Text>
                <TextInput value={language} onChangeText={setLanguage} placeholder={t('mediaHub.upload.languagePlaceholder')} accessibilityLabel={t('mediaHub.upload.language')} editable={!busy} testID="media-upload-language" />
              </>
            ) : null}
            {mediaType === 'video' ? (
              <>
                <Text variant="label">{t('mediaHub.upload.topic')}</Text>
                <TextInput value={topic} onChangeText={setTopic} placeholder={t('mediaHub.upload.topicPlaceholder')} accessibilityLabel={t('mediaHub.upload.topic')} editable={!busy} testID="media-upload-topic" />
                <Text variant="label">{t('mediaHub.upload.thumbnail')}</Text>
                {thumbnail ? <Image source={{ uri: thumbnail.uri }} style={styles.preview} accessibilityIgnoresInvertColors /> : null}
                <Button variant="outline" onPress={() => void chooseThumbnail()} disabled={busy} testID="media-upload-thumbnail">
                  {t('mediaHub.upload.uploadThumbnail')}
                </Button>
                <Text variant="caption" muted>
                  {t('mediaHub.upload.thumbnailHint')}
                </Text>
              </>
            ) : null}
            <Text variant="label">{t('mediaHub.upload.tags')}</Text>
            <View style={styles.row}>
              {SHORTS_TAG_IDS.map((id) => {
                const active = tags.includes(id);
                return (
                  <PressableRow
                    key={id}
                    onPress={() => toggleTag(id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(`mediaHub.upload.predefinedTags.${id}`)}
                    testID={`media-upload-tag-${id}`}
                    style={[styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card }]}
                  >
                    <Text size="sm" style={{ color: active ? colors.primaryForeground : colors.foreground }}>
                      {t(`mediaHub.upload.predefinedTags.${id}`)}
                    </Text>
                  </PressableRow>
                );
              })}
            </View>
            {mediaType !== 'video' ? (
              <>
                <Text variant="label">{t('mediaHub.upload.visibility')}</Text>
                <View style={styles.row} accessibilityRole="radiogroup">
                  {(['public', 'private'] as const).map((v) => (
                    <PressableRow
                      key={v}
                      onPress={() => setVisibility(v)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: visibility === v }}
                      accessibilityLabel={t(`mediaHub.upload.${v}`)}
                      testID={`media-upload-visibility-${v}`}
                      style={[styles.chip, { borderColor: visibility === v ? colors.primary : colors.border, backgroundColor: visibility === v ? colors.primary : colors.card }]}
                    >
                      <Text size="sm" style={{ color: visibility === v ? colors.primaryForeground : colors.foreground }}>
                        {t(`mediaHub.upload.${v}`)}
                      </Text>
                    </PressableRow>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
        <View style={styles.actions}>
          <Button variant="outline" onPress={close} disabled={busy} testID="media-upload-cancel">
            {t('mediaHub.upload.cancel')}
          </Button>
          <Button onPress={() => void submit()} disabled={!valid || busy} testID="media-upload-submit">
            {busy ? t('mediaHubNative.upload.uploading') : t('mediaHub.upload.submit')}
          </Button>
        </View>
      </ScrollView>
    </MediaSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8, paddingBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, minHeight: 36, justifyContent: 'center' },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, borderWidth: 1 },
  flex: { flex: 1 },
  preview: { width: '100%', height: 160, borderRadius: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
});
