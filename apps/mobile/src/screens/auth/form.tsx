/**
 * VTID-05186 (N3, plan change 16) — the small form pieces the auth screens share
 * (built on the UI port; every string is a catalog key).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';
import { PressableRow, Spinner, Text, TextInput, useUITheme } from '../../ports/ui';

export function Field({ label, testID, ...input }: { label: string; testID: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text variant="label" nativeID={`${testID}-label`}>
        {label}
      </Text>
      <TextInput testID={testID} accessibilityLabel={label} accessibilityLabelledBy={`${testID}-label`} {...input} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  busy,
  busyLabel,
  variant = 'primary',
  testID,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  busyLabel?: string;
  variant?: 'primary' | 'outline' | 'link';
  testID: string;
  disabled?: boolean;
}) {
  const { colors } = useUITheme();
  const bg = variant === 'primary' ? colors.primary : 'transparent';
  const fg = variant === 'primary' ? colors.primaryForeground : colors.foreground;
  return (
    <PressableRow
      onPress={onPress}
      disabled={busy || disabled}
      testID={testID}
      accessibilityLabel={busy && busyLabel ? busyLabel : label}
      accessibilityState={{ disabled: !!(busy || disabled) }}
      style={[styles.button, variant !== 'link' ? { borderColor: colors.border, borderWidth: variant === 'outline' ? 1 : 0, backgroundColor: bg } : null]}
    >
      {busy ? <Spinner /> : null}
      <Text style={{ color: fg, fontWeight: variant === 'link' ? '400' : '600' }}>{busy && busyLabel ? busyLabel : label}</Text>
    </PressableRow>
  );
}

export function ErrorLine({ children }: { children: ReactNode }) {
  const { colors } = useUITheme();
  return (
    <Text accessibilityLiveRegion="polite" style={{ color: colors.destructive }} testID="auth-error">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  button: { minHeight: 44, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 16 },
});
