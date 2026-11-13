/**
 * VTID-05677 — presentational blocks shared by the Media Hub parts: the sheet
 * that works both as the kit bottom sheet and inside the full-screen feed
 * (a kit sheet portals behind a native `Modal`, so inside the feed the sheet is
 * drawn in the same modal tree), the empty state and the on-media icon button.
 * Colours come from the kit theme; the on-media scrim is theme-independent, as
 * on web (`design-allow-next-line: on-media scrim`). Spacing is logical.
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet, Text, useUITheme } from '../../ports/ui';

/** On-media scrim and glyph colour (theme-independent, like the web `bg-black/30 text-primary-foreground`). */
export const ON_MEDIA = { scrim: 'rgba(0,0,0,0.4)', scrimStrong: 'rgba(0,0,0,0.6)', glyph: '#FFFFFF', glyphMuted: 'rgba(255,255,255,0.8)' } as const;

/** Bottom sheet; `inModal` draws it in the surrounding native modal instead of the kit portal. */
export function MediaSheet({ open, onClose, title, children, testID, inModal = false, closeLabel }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; testID: string; inModal?: boolean; closeLabel: string }) {
  const { colors } = useUITheme();
  if (!inModal) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title} testID={testID}>
        {children}
      </BottomSheet>
    );
  }
  if (!open) return null;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} testID={`${testID}-backdrop`} />
      <View style={[styles.panel, { backgroundColor: colors.background }]} testID={testID}>
        {title ? (
          <Text variant="title" accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

export function EmptyState({ icon, title, hint, testID }: { icon: ReactNode; title: string; hint?: string; testID: string }) {
  const { colors } = useUITheme();
  return (
    <View style={styles.empty} testID={testID}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>{icon}</View>
      <Text muted style={styles.center}>
        {title}
      </Text>
      {hint ? (
        <Text variant="caption" muted style={styles.center}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** A round on-media button (back, mute, kebab, slide actions). */
export function ScrimButton({ onPress, label, children, testID, size = 40 }: { onPress: () => void; label: string; children: ReactNode; testID: string; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      hitSlop={6}
      style={[styles.scrim, { width: size, height: size, borderRadius: size / 2, backgroundColor: ON_MEDIA.scrim }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 90 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: ON_MEDIA.scrim },
  panel: { maxHeight: '75%', borderTopStartRadius: 16, borderTopEndRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 16, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  center: { textAlign: 'center' },
  scrim: { alignItems: 'center', justifyContent: 'center' },
});
