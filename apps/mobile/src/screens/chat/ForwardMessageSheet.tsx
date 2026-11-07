/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * forward sheet, native twin of web `src/components/messages/ForwardMessageSheet.tsx`
 * (VTID-05138): title + "up to 5", "In MAXINA", a name filter, the DM / group
 * list (Chat / Group, a check when picked, the rest disabled at 5), "Send to
 * n", and "Share via other apps" (the system share sheet with the text and,
 * for files, 7-day links + the hint). After a send: "Forwarded", the sheet
 * closes, or keeps only the targets that failed.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, notify, notifyError, Text, TextInput, useUITheme } from '../../ports/ui';
import { ChatIcon, Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ports/chat';
import { getChatDevice } from '../../ports/chat-device';
import { useI18n } from '../../i18n/I18nProvider';
import {
  createShareLinks,
  FORWARD_SHARE_LINK_TTL_DAYS,
  forwardToTargets,
  isAudioAttachment,
  MAX_FORWARD_TARGETS,
  targetKey,
  useChatTargets,
  useTargetSelection,
  type ForwardPayload,
} from './data/forward';

export function ForwardMessageSheet({ open, onClose, payload, userId }: { open: boolean; onClose: () => void; payload: ForwardPayload; userId?: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { picked, setPicked, pickedKeys, toggle, atLimit } = useTargetSelection();
  const { targets, loading, refreshTargets } = useChatTargets(open, query, userId);
  const files = useMemo(() => payload.attachments.filter((a) => !isAudioAttachment(a)), [payload.attachments]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setPicked([]);
    }
  }, [open, setPicked]);

  const send = async () => {
    if (!userId || picked.length === 0 || sending) return;
    setSending(true);
    try {
      const result = await forwardToTargets(picked, payload, userId);
      if (result.sent.length > 0) {
        notify('screens.messages.forwardDone');
        refreshTargets();
      }
      if (result.failed.length === 0) onClose();
      else setPicked(result.failed);
    } finally {
      setSending(false);
    }
  };

  const shareOutside = async () => {
    if (sharing || sending) return;
    setSharing(true);
    try {
      let links: string[] = [];
      if (files.length > 0) {
        links = (await createShareLinks(files).catch(() => [])).filter(Boolean);
        if (links.length === 0) {
          notifyError('screens.messages.imageShareFailed');
          return;
        }
      }
      const message = [payload.body.trim(), ...links].filter(Boolean).join('\n');
      if (!message) {
        notifyError('screens.messages.imageShareFailed');
        return;
      }
      const r = await getChatDevice().share({ message });
      if (r === 'shared') onClose();
      else if (r === 'failed') notifyError('screens.messages.imageShareFailed');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (!next && !sending ? onClose() : undefined)}>
      <DialogContent testID="forward-message-sheet">
        <DialogHeader>
          <DialogTitle>{t('screens.messages.forwardTitle')}</DialogTitle>
          <Text muted style={styles.small}>
            {t('screens.messages.forwardLimit', { max: MAX_FORWARD_TARGETS })}
          </Text>
        </DialogHeader>
        <Text muted style={[styles.small, styles.caps]}>
          {t('screens.messages.forwardInMaxina')}
        </Text>
        <TextInput value={query} onChangeText={setQuery} placeholder={t('screens.messages.forwardSearch')} accessibilityLabel={t('screens.messages.forwardSearch')} testID="forward-search" />
        <FlatList
          style={styles.list}
          data={targets}
          keyExtractor={targetKey}
          testID="forward-target-list"
          ListEmptyComponent={
            <Text muted style={styles.empty} testID={loading ? 'forward-loading' : 'forward-empty'}>
              {loading ? t('screens.messages.forwardLoading') : t('screens.messages.forwardEmpty')}
            </Text>
          }
          renderItem={({ item }) => {
            const selected = pickedKeys.has(targetKey(item));
            const disabledRow = (!selected && atLimit) || sending;
            return (
              <Pressable
                onPress={() => toggle(item)}
                disabled={disabledRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled: disabledRow }}
                style={[styles.target, selected ? { backgroundColor: colors.muted } : null, disabledRow ? styles.dim : null]}
                testID={`forward-target-${item.kind}-${item.id}`}
              >
                <View style={[styles.targetIcon, { backgroundColor: colors.muted }]}>
                  <ChatIcon name={item.kind === 'group' ? 'Users' : 'MessageCircle'} size={16} color={colors.mutedForeground} />
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={styles.bold}>
                    {item.name}
                  </Text>
                  <Text muted style={styles.small}>
                    {item.kind === 'group' ? t('screens.messages.forwardGroup') : t('screens.messages.forwardChat')}
                  </Text>
                </View>
                <View style={[styles.check, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]}>
                  {selected ? <ChatIcon name="Check" size={12} color={colors.primaryForeground} /> : null}
                </View>
              </Pressable>
            );
          }}
        />
        <Button onPress={() => void send()} disabled={picked.length === 0 || sending} testID="forward-send">
          {picked.length > 0 ? t('screens.messages.forwardSendCount', { count: picked.length }) : t('screens.messages.forwardSend')}
        </Button>
        <View style={[styles.share, { borderTopColor: colors.border }]}>
          <Button variant="outline" onPress={() => void shareOutside()} disabled={sharing || sending} testID="forward-share-other">
            {t('screens.messages.forwardShareOther')}
          </Button>
          {files.length > 0 ? (
            <Text muted style={styles.small} testID="forward-share-link-hint">
              {t('screens.messages.forwardShareLinkHint', { days: FORWARD_SHARE_LINK_TTL_DAYS })}
            </Text>
          ) : null}
        </View>
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  small: { fontSize: 12 },
  caps: { textTransform: 'uppercase', fontWeight: '600', marginTop: 8 },
  list: { maxHeight: 320, marginVertical: 8 },
  empty: { padding: 12 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, minHeight: 44 },
  dim: { opacity: 0.5 },
  targetIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '500' },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  share: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 12, gap: 8 },
});
