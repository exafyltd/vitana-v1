/**
 * VTID-05176 — Input (web input.tsx): h-10 rounded-md border-input bg-background
 * px-3, `text-base` on phones. Web props map: `type` → keyboard/secure entry,
 * `disabled` → `editable={false}`, `aria-invalid` → destructive border,
 * `onChange(e)` → `onChangeText(text)`, `id`+`<Label htmlFor>` → `nativeID` +
 * `accessibilityLabelledBy`. `placeholder` stays a prop (lint-checked).
 */
import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { useTheme } from './provider/context';

export type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'search' | 'url';

const KEYBOARD: Partial<Record<InputType, KeyboardTypeOptions>> = {
  email: 'email-address',
  number: 'numeric',
  tel: 'phone-pad',
  url: 'url',
  search: 'web-search',
};

export type InputProps = TextInputProps & {
  type?: InputType;
  disabled?: boolean;
  'aria-invalid'?: boolean;
};

export function useFieldStyle(multiline: boolean, invalid: boolean, disabled: boolean, focused: boolean) {
  const theme = useTheme();
  const c = theme.colors;
  return [
    styles.field,
    multiline ? styles.multiline : styles.single,
    {
      borderColor: invalid ? c.destructive : focused ? c.ring : c.input,
      backgroundColor: c.background,
      color: c.foreground,
      borderRadius: theme.radius.md,
      fontSize: theme.type.fontSize.base,
      writingDirection: theme.direction,
      opacity: disabled ? 0.5 : 1,
    },
  ];
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { type = 'text', disabled, editable, 'aria-invalid': invalid, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const field = useFieldStyle(false, !!invalid, !!disabled, focused);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={theme.colors.mutedForeground}
      keyboardType={KEYBOARD[type]}
      secureTextEntry={type === 'password'}
      autoCapitalize={type === 'email' || type === 'url' || type === 'password' ? 'none' : undefined}
      editable={disabled ? false : editable}
      aria-disabled={disabled || undefined}
      aria-invalid={invalid || undefined}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[field, style]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  field: { borderWidth: 1, paddingHorizontal: 12, width: '100%', textAlign: 'auto' },
  single: { height: 40, paddingVertical: 8 },
  multiline: { minHeight: 80, paddingVertical: 8, textAlignVertical: 'top' },
});
