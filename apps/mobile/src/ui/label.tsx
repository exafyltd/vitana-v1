/**
 * VTID-05176 — Label (web label.tsx): text-sm font-medium. The web's
 * `<Label htmlFor="x">` + `<Input id="x">` becomes `<Label nativeID="x">` +
 * `<Input accessibilityLabelledBy="x">`.
 */
import { Text, type TextProps } from './foundation/Text';

export type LabelProps = TextProps & { disabled?: boolean };

export function Label({ disabled, style, ...rest }: LabelProps) {
  return <Text size="sm" weight="500" style={[{ lineHeight: 16, opacity: disabled ? 0.7 : 1 }, style]} {...rest} />;
}
