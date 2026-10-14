/** VTID-05176 — Header / Footer / Title / Description shared by the overlays. */
import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View, type TextStyle, type ViewProps } from 'react-native';
import { Text, type TextProps } from '../foundation/Text';
import { useOverlay } from './OverlayModal';

const AlignContext = createContext<TextStyle['textAlign']>('auto');

/** `flex flex-col space-y-1.5 text-center` (phone branch of every web header). */
export function OverlayHeader({ style, gap = 6, align = 'center', ...rest }: ViewProps & { gap?: number; align?: TextStyle['textAlign'] }) {
  return (
    <AlignContext.Provider value={align}>
      <View {...rest} style={[{ gap }, style]} />
    </AlignContext.Provider>
  );
}

/** `flex flex-col-reverse` (phone branch): the primary action ends up on top. */
export function OverlayFooter({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.footer, style]} />;
}

export function OverlayTitle({ style, children, size = 'lg', ...rest }: TextProps & { children?: ReactNode }) {
  const overlay = useOverlay();
  const align = useContext(AlignContext);
  return (
    <Text
      ref={overlay?.titleRef as never}
      accessibilityRole="header"
      size={size}
      weight="600"
      style={[{ textAlign: align, letterSpacing: -0.25 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function OverlayDescription({ style, ...rest }: TextProps) {
  const align = useContext(AlignContext);
  return <Text size="sm" muted style={[{ textAlign: align }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'column-reverse', gap: 8 },
});
