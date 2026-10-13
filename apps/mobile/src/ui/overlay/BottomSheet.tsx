/**
 * VTID-05176 — the bottom-sheet core (plan row 18) behind Drawer,
 * ResponsiveDialog, ResponsivePopover, ResponsiveConfirmDialog and Select:
 * handle, drag to dismiss, `max-height = screen − 24`, bottom safe-area inset,
 * or fullscreen with the top inset (`fullscreenOnMobile`).
 */
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../provider/context';
import { useInsets } from '../foundation/insets';
import { withAlpha } from '../theme';
import { SlidePanel } from './SlidePanel';

export type BottomSheetProps = {
  /** `small`: responsive-dialog handle (w-10 h-1); `drawer`: vaul handle (100×8); `none`. */
  handle?: 'small' | 'drawer' | 'none';
  fullscreen?: boolean;
  /** Distance kept free above the sheet (web `max-h-[calc(100dvh-24px)]`; vaul `mt-24` = 96). */
  topGap?: number;
  /** Corner radius of the top edge (web `rounded-t-2xl` = 16, vaul `rounded-t-[10px]`). */
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
};

export function BottomSheet({ handle = 'small', fullscreen = false, topGap = 24, cornerRadius = 16, style, testID = 'bottom-sheet', children }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useInsets();
  const window = useWindowDimensions();
  const handleNode =
    !fullscreen && handle !== 'none' ? (
      <View style={handle === 'drawer' ? styles.drawerHandleWrap : styles.handleWrap}>
        <View
          style={
            handle === 'drawer'
              ? [styles.drawerHandle, { backgroundColor: theme.colors.muted, borderRadius: theme.radius.full }]
              : [styles.handle, { backgroundColor: withAlpha(theme.colors.mutedForeground, 0.3), borderRadius: theme.radius.full }]
          }
        />
      </View>
    ) : null;

  return (
    <SlidePanel
      axis="y"
      sign={1}
      dragToDismiss={!fullscreen}
      dragArea="handle"
      handle={handleNode}
      testID={testID}
      positionStyle={fullscreen ? styles.fullscreen : styles.bottom}
      style={[
        {
          backgroundColor: theme.colors.background,
          paddingBottom: insets.bottom,
          ...theme.elevation.lg,
        },
        fullscreen
          ? { height: window.height, paddingTop: insets.top }
          : {
              maxHeight: window.height - topGap,
              borderTopStartRadius: cornerRadius,
              borderTopEndRadius: cornerRadius,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
            },
        style,
      ]}
    >
      {children}
    </SlidePanel>
  );
}

const styles = StyleSheet.create({
  bottom: { bottom: 0, start: 0, end: 0 },
  fullscreen: { top: 0, bottom: 0, start: 0, end: 0 },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4, minHeight: 24 },
  handle: { width: 40, height: 4 },
  drawerHandleWrap: { alignItems: 'center', paddingTop: 16, paddingBottom: 8, minHeight: 32 },
  drawerHandle: { width: 100, height: 8 },
});
