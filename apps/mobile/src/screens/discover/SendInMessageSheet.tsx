/**
 * VTID-05510 — twin of `SendInMessageButton` / `SendInMessageSheet`
 * (src/components/messages/SendInMessageSheet.tsx, VTID-05321) as the product
 * drawer uses it: an icon button for signed-in members that opens the dialog —
 * title "Send <kind>", the item title + the five-target limit, the chat search,
 * the target list (DM / group, a check when picked, disabled past five), the
 * caption (≤ 1000) and "Send (n)". Sent targets toast `inbox.shared.sent` and
 * close; failed ones stay picked for a retry (data/send-in-message.ts).
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DiscoverIcon, Input, notify, Textarea } from '../../ports/discover';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import {
  MAX_FORWARD_TARGETS,
  SHARED_CAPTION_MAX,
  sendSharedToTargets,
  targetKey,
  useChatTargets,
  useTargetSelection,
  type SendIds,
  type SharedRef,
} from './data/send-in-message';

export function SendInMessageSheet({ open, onOpenChange, item, itemTitle }: { open: boolean; onOpenChange: (open: boolean) => void; item: SharedRef; itemTitle?: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [query, setQuery] = useState('');
  const [caption, setCaption] = useState('');
  const { picked, setPicked, pickedKeys, toggle, atLimit } = useTargetSelection();
  const { targets, loading, refreshTargets } = useChatTargets(open, query);
  const [sending, setSending] = useState(false);
  const idsRef = useRef<SendIds>(new Map());
  useEffect(() => {
    idsRef.current = new Map();
  }, [item.kind, item.id]);
  useEffect(() => {
    if (!open) {
      setQuery('');
      setCaption('');
      setPicked([]);
    }
  }, [open, setPicked]);

  const send = async () => {
    if (picked.length === 0 || sending) return;
    setSending(true);
    try {
      const result = await sendSharedToTargets(picked, item, caption, idsRef.current);
      if (result.sent.length > 0) {
        notify('inbox.shared.sent');
        refreshTargets();
      }
      if (result.failed.length === 0) onOpenChange(false);
      else setPicked(result.failed);
    } finally {
      setSending(false);
    }
  };

  const kindLabel = t(`inbox.shared.kind.${item.kind}`);
  return (
    <Dialog open={open} onOpenChange={(next: boolean) => !sending && onOpenChange(next)}>
      <DialogContent testID="send-in-message-sheet">
        <DialogHeader>
          <DialogTitle>{t('inbox.shared.sheetTitle', { kind: kindLabel })}</DialogTitle>
          <DialogDescription>{`${itemTitle ? `${itemTitle} · ` : ''}${t('screens.messages.forwardLimit', { max: MAX_FORWARD_TARGETS })}`}</DialogDescription>
        </DialogHeader>
        <Input testID="send-in-message-search" value={query} onChangeText={setQuery} placeholder={t('screens.messages.forwardSearch')} accessibilityLabel={t('screens.messages.forwardSearch')} />
        <ScrollView style={styles.list} testID="forward-target-list">
          {loading && targets.length === 0 ? (
            <Text size="sm" muted style={styles.note}>
              {t('screens.messages.forwardLoading')}
            </Text>
          ) : null}
          {!loading && targets.length === 0 ? (
            <Text size="sm" muted style={styles.note} testID="forward-empty">
              {t('screens.messages.forwardEmpty')}
            </Text>
          ) : null}
          {targets.map((x) => {
            const selected = pickedKeys.has(targetKey(x));
            const disabled = (!selected && atLimit) || sending;
            return (
              <Pressable
                key={targetKey(x)}
                testID={`forward-target-${x.kind}-${x.id}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                onPress={() => toggle(x)}
                style={[styles.target, selected ? { backgroundColor: colors.muted } : null, disabled ? { opacity: 0.5 } : null]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  <DiscoverIcon name={x.kind === 'group' ? 'Users' : 'MessageCircle'} size={16} color={colors.mutedForeground} />
                </View>
                <View style={styles.flex}>
                  <Text size="sm" weight="500" numberOfLines={1}>
                    {x.name}
                  </Text>
                  <Text size="xs" muted>
                    {x.kind === 'group' ? t('screens.messages.forwardGroup') : t('screens.messages.forwardChat')}
                  </Text>
                </View>
                <View style={[styles.check, selected ? { borderColor: colors.primary, backgroundColor: colors.primary } : { borderColor: colors.border }]}>
                  {selected ? <DiscoverIcon name="Check" size={12} color={colors.primaryForeground} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <Textarea
          testID="send-in-message-caption"
          value={caption}
          onChangeText={(v: string) => setCaption(v.slice(0, SHARED_CAPTION_MAX))}
          placeholder={t('inbox.shared.captionPlaceholder')}
          accessibilityLabel={t('inbox.shared.captionPlaceholder')}
          maxLength={SHARED_CAPTION_MAX}
          editable={!sending}
          numberOfLines={2}
        />
        <Button testID="send-in-message-send" disabled={picked.length === 0 || sending} onPress={() => void send()}>
          {picked.length > 0 ? t('screens.messages.forwardSendCount', { count: picked.length }) : t('screens.messages.forwardSend')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** An icon button that opens the sheet; signed-in members only (web `useOptionalUser`). */
export function SendInMessageButton({ item, itemTitle }: { item: SharedRef; itemTitle?: string }): ReactElement | null {
  const { user } = useAuth();
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState<{ item: SharedRef; title?: string } | null>(null);
  if (!user) return null;
  return (
    <>
      <Button
        testID={`${item.kind}-send-in-message`}
        variant="outline"
        size="default"
        accessibilityLabel={t('inbox.shared.sendInMessage')}
        onPress={() => {
          setOpened({ item: { kind: item.kind, id: item.id }, title: itemTitle });
          setOpen(true);
        }}
        style={styles.iconButton}
      >
        <DiscoverIcon name="Send" size={16} color={colors.foreground} />
      </Button>
      {opened ? <SendInMessageSheet open={open} onOpenChange={setOpen} item={opened.item} itemTitle={opened.title} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { maxHeight: 280 },
  note: { paddingHorizontal: 12, paddingVertical: 8 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconButton: { minWidth: 44, height: 44 },
});
