/**
 * VTID-05176 — Text: foreground colour, the token type scale, font scaling on,
 * writing direction from the provider (plan change 8).
 */
import { forwardRef } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../provider/context';
import type { VitanaTokens } from '../theme';

export type TextSize = keyof VitanaTokens['fontSize'];
export type TextWeight = '400' | '500' | '600' | '700';

export type TextProps = RNTextProps & {
  size?: TextSize;
  weight?: TextWeight;
  /** `text-muted-foreground` */
  muted?: boolean;
  /** Overrides the colour (a token value from `useTheme().colors`). */
  color?: string;
  /** The editorial serif (Cormorant, loaded by N3). */
  editorial?: boolean;
};

export const Text = forwardRef<RNText, TextProps>(function Text(
  { size = 'base', weight = '400', muted, color, editorial, style, allowFontScaling = true, ...rest },
  ref,
) {
  const theme = useTheme();
  return (
    <RNText
      ref={ref}
      allowFontScaling={allowFontScaling}
      style={[
        {
          color: color ?? (muted ? theme.colors.mutedForeground : theme.colors.foreground),
          fontSize: theme.type.fontSize[size],
          fontWeight: weight,
          fontFamily: editorial ? theme.type.fontFamily.editorial : theme.type.fontFamily.sans,
          writingDirection: theme.direction,
        },
        style,
      ]}
      {...rest}
    />
  );
});
