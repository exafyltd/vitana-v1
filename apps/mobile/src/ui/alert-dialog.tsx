/**
 * VTID-05176 — AlertDialog (web alert-dialog.tsx): centred like Dialog, no
 * close button, no dismiss on an outside tap (Radix), Android back cancels.
 * Does not suppress the ORB (F20).
 */
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './provider/context';
import { legacyColors } from './theme';
import { Button, type ButtonProps } from './button';
import { CenteredPanel } from './dialog';
import { OverlayModal } from './overlay/OverlayModal';
import { createOverlayRoot, NoopOverlay, Portal } from './overlay/root';
import { OverlayDescription, OverlayFooter, OverlayHeader, OverlayTitle } from './overlay/parts';

const root = createOverlayRoot('AlertDialog');

export const AlertDialog = root.Root;
export const AlertDialogTrigger = root.Trigger;
export const AlertDialogPortal = Portal;
export const AlertDialogOverlay = NoopOverlay;
export const AlertDialogTitle = OverlayTitle;
export const AlertDialogDescription = OverlayDescription;
export const AlertDialogFooter = OverlayFooter;

export function AlertDialogHeader(props: ViewProps) {
  return <OverlayHeader gap={8} {...props} />;
}

export function AlertDialogContent({
  overlayStyle,
  children,
  testID = 'alert-dialog',
  ...rest
}: ViewProps & { overlayStyle?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { open, setOpen } = root.useRoot();
  const theme = useTheme();
  return (
    <OverlayModal
      open={open}
      onOpenChange={setOpen}
      suppressOrb={false}
      backdropColor={legacyColors.overlayDialog}
      overlayStyle={overlayStyle}
      dismissOnBackdrop={false}
      durationMs={theme.motion.dialogMs}
      containerStyle={styles.center}
      testID={testID}
    >
      <CenteredPanel testID={`${testID}-content`} onClose={() => setOpen(false)} accessibilityRole="alert" {...rest}>
        {children}
      </CenteredPanel>
    </OverlayModal>
  );
}

export function AlertDialogAction({ onPress, ...props }: ButtonProps) {
  const { setOpen } = root.useRoot();
  return (
    <Button
      {...props}
      onPress={(e) => {
        onPress?.(e);
        setOpen(false);
      }}
    />
  );
}

export function AlertDialogCancel({ onPress, variant = 'outline', style, ...props }: ButtonProps) {
  const { setOpen } = root.useRoot();
  return (
    <Button
      {...props}
      variant={variant}
      style={[styles.cancel, style]}
      onPress={(e) => {
        onPress?.(e);
        setOpen(false);
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  cancel: { marginTop: 8 },
});
