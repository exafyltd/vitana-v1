/** VTID-05176 — Textarea (web textarea.tsx): min-h-[80px], same field styling as Input. */
import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useTheme } from './provider/context';
import { useFieldStyle } from './input';

export type TextareaProps = TextInputProps & { disabled?: boolean; rows?: number; 'aria-invalid'?: boolean };

export const Textarea = forwardRef<TextInput, TextareaProps>(function Textarea(
  { disabled, editable, rows, 'aria-invalid': invalid, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const field = useFieldStyle(true, !!invalid, !!disabled, focused);
  return (
    <TextInput
      ref={ref}
      multiline
      numberOfLines={rows}
      placeholderTextColor={theme.colors.mutedForeground}
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
