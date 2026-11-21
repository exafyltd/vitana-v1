/**
 * VTID-05677 — the delete-short confirm (web `MediaHub.tsx:1540-1558`): title,
 * description, cancel, destructive confirm. The screen runs the delete.
 */
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { MediaSheet } from './components';

export function DeleteShortSheet({ open, busy, onCancel, onConfirm, inModal }: { open: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void; inModal?: boolean }) {
  const { t } = useI18n();
  return (
    <MediaSheet open={open} onClose={onCancel} title={t('mediaHub.deleteVideo.title')} testID="media-delete" inModal={inModal} closeLabel={t('mediaHub.deleteVideo.cancel')}>
      <Text muted>{t('mediaHub.deleteVideo.description')}</Text>
      <View style={styles.actions}>
        <Button variant="outline" onPress={onCancel} disabled={busy} testID="media-delete-cancel">
          {t('mediaHub.deleteVideo.cancel')}
        </Button>
        <Button variant="destructive" onPress={onConfirm} disabled={busy} testID="media-delete-confirm">
          {t('mediaHub.deleteVideo.confirm')}
        </Button>
      </View>
    </MediaSheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
});
