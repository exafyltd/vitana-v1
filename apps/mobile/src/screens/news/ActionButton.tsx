/**
 * VTID-05298 (Native Wave 2, news lane) — a small full-width action button
 * for the news / post readers, built on the shell's `PressableRow` + `Text`
 * (`src/ports/ui`) and design tokens (`src/ports/tokens`). The N2 UI kit's
 * `Button` is reached only through a port, and the shell exposes no `Button`
 * port yet, so the readers use this token-styled twin of the web's primary /
 * outline CTA. Direction-agnostic (centred); React 19 `ReactElement`.
 */
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { radius } from '../../ports/tokens';

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  const outline = variant === 'outline';
  return (
    <PressableRow
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.button,
        { borderRadius: radius.md },
        outline
          ? { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }
          : { backgroundColor: colors.primary },
      ]}
    >
      <Text weight="600" numberOfLines={1} color={outline ? colors.foreground : colors.primaryForeground} style={styles.label}>
        {label}
      </Text>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  button: { height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { textAlign: 'center' },
});
