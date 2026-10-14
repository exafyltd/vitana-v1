/**
 * VTID-05176 — ResponsiveConfirmDialog (web responsive-confirm-dialog.tsx), phone
 * branch only (use-mobile breakpoint 1024 px, F19): a bottom sheet with a
 * handle; Action/Cancel 48 pt tall, `text-base`. No dismiss on an outside tap
 * (AlertDialog semantics); the handle drag and Android back cancel. Does not
 * suppress the ORB (F20).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './provider/context';
import { legacyColors } from './theme';
import { Button, type ButtonProps } from './button';
import { BottomSheet } from './overlay/BottomSheet';
import { OverlayModal } from './overlay/OverlayModal';
import { createOverlayRoot } from './overlay/root';
import { OverlayDescription, OverlayFooter, OverlayHeader, OverlayTitle } from './overlay/parts';

const root = createOverlayRoot('ResponsiveConfirmDialog');

export const ResponsiveConfirmDialog = root.Root;
export const ResponsiveConfirmDialogTrigger = root.Trigger;
export const ResponsiveConfirmDialogTitle = OverlayTitle;
export const ResponsiveConfirmDialogDescription = OverlayDescription;

export function ResponsiveConfirmDialogHeader({ style, ...props }: ViewProps) {
  return <OverlayHeader gap={8} style={[styles.header, style]} {...props} />;
}

export function ResponsiveConfirmDialogFooter({ style, ...props }: ViewProps) {
  return <OverlayFooter style={[styles.footer, style]} {...props} />;
}

export function ResponsiveConfirmDialogContent({
  overlayStyle,
  style,
  children,
  testID = 'confirm-dialog',
}: ViewProps & { overlayStyle?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { open, setOpen } = root.useRoot();
  const theme = useTheme();
  return (
    <OverlayModal
      open={open}
      onOpenChange={setOpen}
      suppressOrb={false}
      backdropColor={legacyColors.overlayResponsive}
      overlayStyle={overlayStyle}
      dismissOnBackdrop={false}
      durationMs={theme.motion.sheetMs}
      testID={testID}
    >
      <BottomSheet testID={`${testID}-content`} style={style}>
        <View accessibilityRole="alert" style={styles.body}>
          {children}
        </View>
      </BottomSheet>
    </OverlayModal>
  );
}

function makeAction(cancel: boolean) {
  return function Action({ onPress, variant, style, textStyle, ...props }: ButtonProps) {
    const { setOpen } = root.useRoot();
    const theme = useTheme();
    return (
      <Button
        {...props}
        variant={variant ?? (cancel ? 'outline' : 'default')}
        style={[styles.big, style]}
        textStyle={[{ fontSize: theme.type.fontSize.base }, textStyle]}
        onPress={(e) => {
          onPress?.(e);
          setOpen(false);
        }}
      />
    );
  };
}

export const ResponsiveConfirmDialogAction = makeAction(false);
export const ResponsiveConfirmDialogCancel = makeAction(true);

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  header: { paddingTop: 8, paddingBottom: 16 },
  footer: { paddingTop: 8 },
  big: { height: 48 },
});
