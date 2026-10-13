/**
 * VTID-05176 — Button (web src/components/ui/button.tsx, 681 importers).
 * All 9 variants and 5 sizes, `asChild`, `disabled`. Pressed state instead of
 * hover. `xs`/`sm`/`icon` get a 44 pt hit area via `hitSlop`.
 */
import { Children, createContext, forwardRef, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme, type Theme } from './provider/context';
import { Text } from './foundation/Text';
import { Slot } from './foundation/Slot';
import { hitSlopFor } from './foundation/hitSlop';
import { legacyColors, withAlpha } from './theme';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'solid' | 'soft' | 'pill';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'xs';

export const BUTTON_VARIANTS: readonly ButtonVariant[] = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'solid', 'soft', 'pill'];
export const BUTTON_SIZES: readonly ButtonSize[] = ['default', 'sm', 'lg', 'icon', 'xs'];

const SIZE: Record<ButtonSize, { height: number; width?: number; px: number; radius?: 'md' | 'full'; text: 'sm' | 'xs' }> = {
  default: { height: 40, px: 16, text: 'sm' },
  sm: { height: 36, px: 12, radius: 'md', text: 'sm' },
  lg: { height: 44, px: 32, radius: 'md', text: 'sm' },
  icon: { height: 40, width: 40, px: 0, text: 'sm' },
  xs: { height: 28, px: 10, radius: 'full', text: 'xs' },
};

/** The native `buttonVariants`: container and label styles for a variant/size/state. */
export function buttonStyles(
  variant: ButtonVariant,
  size: ButtonSize,
  theme: Theme,
  state: { pressed?: boolean; disabled?: boolean } = {},
): { container: ViewStyle; text: TextStyle; foreground: string; hitSlopHeight: number; hitSlopWidth: number } {
  const c = theme.colors;
  const s = SIZE[size];
  const pressed = !!state.pressed;
  const rounded = variant === 'solid' || variant === 'soft' || variant === 'pill' ? 'full' : (s.radius ?? 'md');
  let bg: string = legacyColors.transparent;
  let fg: string = c.foreground;
  let border: string | undefined;
  switch (variant) {
    case 'default':
      bg = pressed ? withAlpha(c.primary, 0.9) : c.primary;
      fg = c.primaryForeground;
      break;
    case 'destructive':
      bg = pressed ? withAlpha(c.destructive, 0.9) : c.destructive;
      fg = c.destructiveForeground;
      break;
    case 'outline':
      bg = pressed ? c.accent : c.background;
      fg = pressed ? c.accentForeground : c.foreground;
      border = c.input;
      break;
    case 'secondary':
      bg = pressed ? withAlpha(c.secondary, 0.8) : c.secondary;
      fg = c.secondaryForeground;
      break;
    case 'ghost':
      bg = pressed ? c.accent : legacyColors.transparent;
      fg = pressed ? c.accentForeground : c.foreground;
      break;
    case 'link':
      fg = c.primary;
      break;
    case 'solid':
      bg = legacyColors.buttonSolidBg;
      fg = legacyColors.buttonSolidText;
      break;
    case 'soft':
      bg = legacyColors.buttonSoftBg[theme.scheme];
      fg = legacyColors.buttonSoftText[theme.scheme];
      break;
    case 'pill':
      bg = pressed ? legacyColors.buttonPillPressed[theme.scheme] : legacyColors.transparent;
      break;
  }
  return {
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: s.height,
      ...(s.width ? { width: s.width } : {}),
      paddingHorizontal: s.px,
      borderRadius: theme.radius[rounded],
      backgroundColor: bg,
      ...(border ? { borderWidth: 1, borderColor: border } : {}),
      opacity: state.disabled ? 0.5 : pressed && variant === 'solid' ? 0.92 : 1,
    },
    text: {
      fontSize: theme.type.fontSize[s.text],
      fontWeight: '500',
      color: fg,
      ...(variant === 'link' && pressed ? { textDecorationLine: 'underline' } : {}),
    },
    foreground: fg,
    hitSlopHeight: s.height,
    hitSlopWidth: s.width ?? 44,
  };
}

const ButtonForegroundContext = createContext<string | null>(null);

/** The label colour of the enclosing Button, for icons passed as children. */
export function useButtonForeground(): string | null {
  return useContext(ButtonForegroundContext);
}

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  { variant = 'default', size = 'default', asChild = false, disabled, style, textStyle, children, accessibilityRole, accessibilityState, ...rest },
  ref,
) {
  const theme = useTheme();
  const base = buttonStyles(variant, size, theme, { disabled: !!disabled });
  const hitSlop = rest.hitSlop ?? hitSlopFor(base.hitSlopWidth, base.hitSlopHeight);

  if (asChild) {
    return (
      <Slot
        {...rest}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
        style={[base.container, style]}
      >
        {children}
      </Slot>
    );
  }

  return (
    <Pressable
      ref={ref}
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole ?? (variant === 'link' ? 'link' : 'button')}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      style={({ pressed }) => [buttonStyles(variant, size, theme, { pressed, disabled: !!disabled }).container, style]}
    >
      {({ pressed }) => {
        const st = buttonStyles(variant, size, theme, { pressed, disabled: !!disabled });
        return (
          <ButtonForegroundContext.Provider value={st.foreground}>
            {Children.map(children, (child) =>
              typeof child === 'string' || typeof child === 'number' ? (
                <Text numberOfLines={1} style={[st.text, textStyle]}>
                  {child}
                </Text>
              ) : (
                child
              ),
            )}
          </ButtonForegroundContext.Provider>
        );
      }}
    </Pressable>
  );
});

export const buttonStyleSheet = StyleSheet.create({ fullWidth: { alignSelf: 'stretch' } });
