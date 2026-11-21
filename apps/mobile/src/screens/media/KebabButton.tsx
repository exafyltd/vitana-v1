/**
 * VTID-05677 — the owner "more" (⋮) button of a short: on the carousel card it
 * sits on the theme surface, inside the full-screen feed on the on-media scrim.
 */
import { Pressable, StyleSheet } from 'react-native';
import { Icon, useUITheme } from '../../ports/ui';
import { ON_MEDIA, ScrimButton } from './components';

export function MoreVerticalButton({ onPress, label, testID, tone }: { onPress: () => void; label: string; testID: string; tone: 'media' | 'surface' }) {
  const { colors } = useUITheme();
  if (tone === 'media') {
    return (
      <ScrimButton onPress={onPress} label={label} testID={testID}>
        <Icon name="MoreVertical" size={20} color={ON_MEDIA.glyph} />
      </ScrimButton>
    );
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} hitSlop={6} style={[styles.surface, { backgroundColor: colors.background }]}>
      <Icon name="MoreVertical" size={20} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
