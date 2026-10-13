/**
 * VTID-05176 — the overlays' close button. Always at the INLINE END (`end`,
 * never `right`), so it flips in Arabic — a documented native difference: the
 * web pins it to the physical right (dialog.tsx:69, sheet.tsx:71,
 * responsive-dialog.tsx:128-130, responsive-popover.tsx:160-168; F29b).
 * Labelled with the existing key `screens.ui.close`.
 */
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { useTheme } from '../provider/context';
import { hitSlopFor } from '../foundation/hitSlop';

export type CloseButtonProps = {
  onPress: () => void;
  /** 'absolute' = pinned to top/end of the surface; 'inline' = a flex child (header rows). */
  placement?: 'absolute' | 'inline';
  size?: number;
  iconSize?: number;
  top?: number;
  inset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function CloseButton({
  onPress,
  placement = 'absolute',
  size = 40,
  iconSize = 20,
  top = 12,
  inset = 12,
  style,
  testID = 'overlay-close',
}: CloseButtonProps) {
  const { t } = useI18n();
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('screens.ui.close')}
      hitSlop={hitSlopFor(size, size)}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: theme.radius.full },
        placement === 'absolute' && { position: 'absolute', top, end: inset },
        pressed && { backgroundColor: theme.colors.accent },
        style,
      ]}
    >
      <X size={iconSize} color={theme.colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', zIndex: 20 },
});
