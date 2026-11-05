/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * composer's emoji picker, native twin of web `src/components/ui/emoji-picker.tsx`:
 * the smiley button opens a sheet with the category tabs (recent first) and an
 * 8-column grid; a pick is appended to the text and moves to the front of the
 * member's recents (data/emojiRecents.ts). The web tab labels are the raw
 * English category ids; here they come from `chatNative.emoji.*`.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, useUITheme } from '../../ports/ui';
import { ChatIcon } from '../../ports/chat';
import { useI18n } from '../../i18n/I18nProvider';
import { EMOJI_CATEGORIES, EMOJI_CATEGORY_KEYS, loadRecentEmojis, RECENT_SEED, recordRecentEmoji, type EmojiCategory } from './data/emojiRecents';

export function EmojiPicker({ onSelect, userId, disabled }: { onSelect: (emoji: string) => void; userId?: string | null; disabled?: boolean }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<EmojiCategory>('recent');
  const [recent, setRecent] = useState<string[]>(RECENT_SEED);

  useEffect(() => {
    if (open) void loadRecentEmojis(userId).then(setRecent);
  }, [open, userId]);

  const list: readonly string[] = category === 'recent' ? recent : EMOJI_CATEGORIES[category];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('chatNative.emoji.open')}
        style={styles.trigger}
        testID="emoji-picker-button"
      >
        <ChatIcon name="Smile" size={16} />
      </Pressable>
      <BottomSheet open={open} onClose={() => setOpen(false)} testID="emoji-picker">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {EMOJI_CATEGORY_KEYS.map((c) => (
            <Button key={c} size="sm" variant={category === c ? 'secondary' : 'ghost'} onPress={() => setCategory(c)} testID={`emoji-tab-${c}`}>
              {t(`chatNative.emoji.${c}`)}
            </Button>
          ))}
        </ScrollView>
        <View style={styles.grid} testID={`emoji-grid-${category}`}>
          {list.map((emoji, i) => (
            <Pressable
              key={`${emoji}-${i}`}
              onPress={() => {
                void recordRecentEmoji(emoji, userId).then(setRecent);
                onSelect(emoji);
              }}
              accessibilityRole="button"
              accessibilityLabel={emoji}
              style={[styles.cell, { borderColor: colors.background }]}
              testID={`emoji-${emoji}`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabs: { gap: 4, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '12.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
});
