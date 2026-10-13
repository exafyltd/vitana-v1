/**
 * VTID-05176 — Drawer (web drawer.tsx, vaul API): the bottom-sheet core with
 * vaul's 100×8 handle, `rounded-t-[10px]`, 96 pt kept free above (`mt-24`).
 * `shouldScaleBackground` is accepted and ignored: the web never scales either
 * (no `vaul-drawer-wrapper` exists, F16 — listed in the README's web defects).
 * Suppresses the ORB (F20). The web drawer has no close button; native adds one
 * only with `showCloseButton` (at the inline end).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './provider/context';
import { legacyColors } from './theme';
import { BottomSheet } from './overlay/BottomSheet';
import { CloseButton } from './overlay/CloseButton';
import { OverlayModal } from './overlay/OverlayModal';
import { createOverlayRoot, NoopOverlay, Portal, type OverlayRootProps } from './overlay/root';
import { OverlayDescription, OverlayHeader, OverlayTitle } from './overlay/parts';

const root = createOverlayRoot('Drawer');

export type DrawerProps = OverlayRootProps & {
  /** Accepted for API parity and ignored (web default `true`, inert there too). */
  shouldScaleBackground?: boolean;
};

export function Drawer({ shouldScaleBackground: _ignored = true, ...props }: DrawerProps) {
  return <root.Root {...props} />;
}

export const DrawerTrigger = root.Trigger;
export const DrawerClose = root.Close;
export const DrawerPortal = Portal;
export const DrawerOverlay = NoopOverlay;
export const DrawerTitle = OverlayTitle;
export const DrawerDescription = OverlayDescription;

export function DrawerHeader({ style, ...props }: ViewProps) {
  return <OverlayHeader style={[styles.header, style]} {...props} />;
}

export function DrawerFooter({ style, ...props }: ViewProps) {
  return <View style={[styles.footer, style]} {...props} />;
}

export type DrawerContentProps = ViewProps & {
  overlayStyle?: StyleProp<ViewStyle>;
  /** Native-only: the web drawer has no close button. */
  showCloseButton?: boolean;
  children?: ReactNode;
};

export function DrawerContent({ overlayStyle, showCloseButton = false, style, children, testID = 'drawer' }: DrawerContentProps) {
  const { open, setOpen } = root.useRoot();
  const theme = useTheme();
  return (
    <OverlayModal
      open={open}
      onOpenChange={setOpen}
      suppressOrb
      backdropColor={legacyColors.overlaySheet}
      overlayStyle={overlayStyle}
      durationMs={theme.motion.sheetMs}
      testID={testID}
    >
      <BottomSheet handle="drawer" topGap={96} cornerRadius={10} testID={`${testID}-content`} style={[{ borderWidth: 1 }, style]}>
        {children}
        {showCloseButton ? <CloseButton onPress={() => setOpen(false)} testID={`${testID}-close`} top={8} inset={8} /> : null}
      </BottomSheet>
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16 },
  footer: { marginTop: 'auto', gap: 8, padding: 16 },
});
