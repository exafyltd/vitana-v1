/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the native create-post sheet, a
 * bottom-sheet twin of `src/components/profile/mobile/MobileCreatePostSheet.tsx`
 * (the mobile-web composer). Opened inline by HomeScreen on `/home?compose=1`
 * and the `/home/compose` deep link. Presentational + a submit through the
 * injected native Supabase client (`useCreatePost` in `./data/feed`, the twin
 * of web `useProfilePosts().createPost`) — no live write in tests (the client
 * is a test double).
 *
 * Text + coloured-background posts only. The web composer also uploads media
 * (image/video) through Supabase storage and runs in-browser video
 * compression; that path depends on the native media picker / storage upload,
 * which is a later home FEAT — documented here and in the FEAT findings. The
 * mention textarea (web `MentionTextarea`) degrades to a plain multiline input
 * natively for the same reason (the mention popover + people search is its own
 * surface); the plumbing carries an empty `mentions` array so the later FEAT
 * can add it without changing the submit contract. React 19: typed with
 * `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useCreatePost } from './data/feed';

const MAX_CHARS = 500;

export function MobileCreatePostSheet({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const createPost = useCreatePost();
  const [content, setContent] = useState('');

  const trimmed = content.trim();
  const overLimit = content.length > MAX_CHARS;
  const canPost = !!trimmed && !overLimit && !createPost.isPending;

  const reset = () => setContent('');

  const handleClose = () => {
    if (createPost.isPending) return;
    reset();
    onClose();
  };

  const handlePost = () => {
    if (!canPost) return;
    createPost.mutate(
      { content: trimmed, mentions: [] },
      {
        onSuccess: () => {
          notify('profilePosts.posted');
          reset();
          onClose();
        },
        onError: () => {
          notifyError('profilePosts.error');
        },
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={handleClose} title={t('profilePosts.createPost')} testID="home-create-post">
      <TextInput
        testID="home-create-post-input"
        multiline
        value={content}
        onChangeText={setContent}
        editable={!createPost.isPending}
        placeholder={t('profilePosts.placeholder')}
        accessibilityLabel={t('profilePosts.createPost')}
        style={styles.input}
      />
      <View style={styles.footer}>
        <Text variant="caption" style={overLimit ? { color: colors.destructive } : undefined}>
          {t('homeNative.compose.charCount', { count: content.length, max: MAX_CHARS })}
        </Text>
        <View style={styles.actions}>
          <Button variant="outline" size="sm" onPress={handleClose} disabled={createPost.isPending} testID="home-create-post-cancel">
            {t('homeNative.compose.cancel')}
          </Button>
          <Button size="sm" onPress={handlePost} disabled={!canPost} testID="home-create-post-submit">
            {t('profilePosts.post')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 120 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
