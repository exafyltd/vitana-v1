/**
 * VTID-05677 — native twin of `EditShortVideoModal.tsx`: title (required),
 * description, up to five tags, an optional new thumbnail from the photo
 * library. Save writes through `MediaHubData.editShort` (thumbnail upload, then
 * the `media_videos` update). Not ported: capturing a thumbnail frame from the
 * video (web draws it on a canvas; there is no native frame-grab package in the
 * app, and this lane adds none).
 */
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { PickedFile, Short } from '../../ports/media';
import { useMediaHubData } from '../../ports/media';
import { X } from '../../ports/media-ui';
import { MediaSheet } from './components';
import { pickThumbnailFile } from './device';

const MAX_TAGS = 5;

export function EditShortSheet({ short, onClose, onSaved, inModal }: { short: Short | null; onClose: () => void; onSaved: () => void; inModal?: boolean }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const data = useMediaHubData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thumb, setThumb] = useState<PickedFile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!short) return;
    setTitle(short.title || '');
    setDescription(short.description || '');
    setTags(short.tags || []);
    setTagInput('');
    setThumb(null);
  }, [short]);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };
  const chooseThumb = async () => {
    const res = await pickThumbnailFile();
    if (res.status === 'picked') setThumb(res.file);
    else if (res.status === 'denied') notifyError('mediaHubNative.toast.permissionDenied', 'mediaHubNative.toast.permissionDeniedDesc');
  };
  const save = async () => {
    if (!short) return;
    if (!title.trim()) {
      notifyError('toasts.community.validationError', 'toasts.community.titleRequired');
      return;
    }
    setSaving(true);
    try {
      await data.editShort({ id: short.id, userId: short.user_id, title, description, tags, thumbnailUrl: short.thumbnail_url, thumbnail: thumb ?? undefined });
      notify('mediaHub.toast.videoUpdated', 'mediaHub.toast.videoUpdatedDesc');
      onSaved();
      onClose();
    } catch {
      notifyError('mediaHubNative.toast.saveFailed');
    } finally {
      setSaving(false);
    }
  };

  const preview = thumb?.uri ?? short?.thumbnail_url ?? null;
  return (
    <MediaSheet open={!!short} onClose={onClose} title={t('screens.community.editVideoDetails')} testID="media-edit" inModal={inModal} closeLabel={t('common.close')}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text variant="label">{t('screens.community.title')}</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder={t('screens.community.enterVideoTitle')} accessibilityLabel={t('screens.community.title')} testID="media-edit-title" />
        <Text variant="label">{t('screens.community.description')}</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder={t('screens.community.enterVideoDescriptionOptional')} accessibilityLabel={t('screens.community.description')} multiline testID="media-edit-description" />
        <Text variant="label">{t('screens.community.tagsMax5')}</Text>
        <View style={styles.row}>
          <TextInput value={tagInput} onChangeText={setTagInput} onSubmitEditing={addTag} placeholder={t('mediaHubNative.edit.addTag')} accessibilityLabel={t('mediaHubNative.edit.addTag')} style={styles.flex} testID="media-edit-tag-input" />
          <Button variant="outline" size="sm" onPress={addTag} disabled={tags.length >= MAX_TAGS} testID="media-edit-tag-add">
            {t('mediaHubNative.edit.add')}
          </Button>
        </View>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <PressableRow key={tag} onPress={() => setTags(tags.filter((x) => x !== tag))} accessibilityLabel={t('mediaHubNative.edit.removeTag', { tag })} testID={`media-edit-tag-${tag}`} style={[styles.tag, { backgroundColor: colors.muted }]}>
              <Text size="sm">{tag}</Text>
              <X size={12} color={colors.mutedForeground} />
            </PressableRow>
          ))}
        </View>
        <Text variant="label">{t('mediaHub.upload.thumbnail')}</Text>
        {preview ? <Image source={{ uri: preview }} style={styles.preview} accessibilityIgnoresInvertColors /> : null}
        <Button variant="outline" onPress={() => void chooseThumb()} testID="media-edit-thumbnail">
          {t('mediaHub.upload.uploadThumbnail')}
        </Button>
        <View style={styles.actions}>
          <Button variant="outline" onPress={onClose} disabled={saving} testID="media-edit-cancel">
            {t('common.cancel')}
          </Button>
          <Button onPress={() => void save()} disabled={saving || !title.trim()} testID="media-edit-save">
            {t('common.save')}
          </Button>
        </View>
      </ScrollView>
    </MediaSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  preview: { width: '100%', height: 160, borderRadius: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
});
