/**
 * VTID-05176 — toast host (plan change 30). Top-centre under the top safe-area
 * inset (both web toasters sit at the top on phones), sonner `richColors`-style
 * status colours from the status tokens, swipe up to dismiss, close button at
 * the inline end. The host renders inside the TOP-MOST open overlay (or the
 * root when none is open), so a toast is never hidden behind a native modal.
 */
import { isValidElement, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useI18n } from '../../i18n/I18nProvider';
import { useTheme, type Theme } from '../provider/context';
import { Text } from '../foundation/Text';
import { useInsets } from '../foundation/insets';
import { CloseButton } from '../overlay/CloseButton';
import { useTopOverlayId } from '../overlay/stack';
import { dismissToast, getToasts, subscribeToasts, type ToastAction, type ToastEntry } from './store';

/** Upward swipe distance / speed that dismisses a toast. */
export const TOAST_SWIPE_DISTANCE = 30;
export const TOAST_SWIPE_VELOCITY = 500;

export function toastSwipeDismisses(translationY: number, velocityY: number): boolean {
  return translationY <= -TOAST_SWIPE_DISTANCE || velocityY <= -TOAST_SWIPE_VELOCITY;
}

function palette(theme: Theme, kind: ToastEntry['kind']) {
  const c = theme.colors;
  switch (kind) {
    case 'success':
      return { bg: c.statusSuccessSubtle, border: c.statusSuccess, fg: c.statusSuccess };
    case 'error':
      return { bg: c.statusErrorSubtle, border: c.statusError, fg: c.statusError };
    case 'warning':
      return { bg: c.statusWarningSubtle, border: c.statusWarning, fg: c.statusWarning };
    case 'info':
      return { bg: c.statusInfoSubtle, border: c.statusInfo, fg: c.statusInfo };
    case 'destructive':
      return { bg: c.destructive, border: c.destructive, fg: c.destructiveForeground };
    default:
      return { bg: c.popover, border: c.border, fg: c.popoverForeground };
  }
}

function isAction(a: unknown): a is ToastAction {
  return !!a && typeof a === 'object' && !isValidElement(a) && 'label' in a && 'onClick' in a;
}

function ToastItem({ entry }: { entry: ToastEntry }) {
  const theme = useTheme();
  const { t } = useI18n();
  const colors = palette(theme, entry.kind);
  const title: ReactNode = entry.titleKey ? t(entry.titleKey, entry.params) : entry.title;
  const description: ReactNode = entry.descKey ? t(entry.descKey, entry.params) : entry.description;
  const spoken = [title, description].filter((x) => typeof x === 'string').join('. ');

  useEffect(() => {
    if (Platform.OS === 'ios' && spoken) AccessibilityInfo.announceForAccessibility(spoken);
  }, [spoken]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .withTestId(`toast-${entry.id}-pan`)
        .activeOffsetY([-10, 10])
        .onEnd((e) => {
          if (toastSwipeDismisses(e.translationY, e.velocityY)) dismissToast(entry.id);
        }),
    [entry.id],
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        testID={`toast-${entry.id}`}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          { backgroundColor: colors.bg, borderColor: colors.border, borderRadius: theme.radius.lg, ...theme.elevation.lg },
        ]}
      >
        <View style={styles.body}>
          {typeof title === 'string' ? (
            <Text size="sm" weight="600" color={colors.fg}>
              {title}
            </Text>
          ) : (
            title
          )}
          {typeof description === 'string' ? (
            <Text size="sm" color={colors.fg} style={styles.desc}>
              {description}
            </Text>
          ) : (
            description
          )}
        </View>
        {isAction(entry.action) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              (entry.action as ToastAction).onClick();
              dismissToast(entry.id);
            }}
            style={[styles.action, { borderColor: colors.border, borderRadius: theme.radius.md }]}
          >
            <Text size="sm" weight="500" color={colors.fg}>
              {entry.action.label}
            </Text>
          </Pressable>
        ) : (
          (entry.action as ReactNode) ?? null
        )}
        <CloseButton placement="inline" size={32} iconSize={16} onPress={() => dismissToast(entry.id)} testID={`toast-${entry.id}-close`} />
      </View>
    </GestureDetector>
  );
}

function ToastViewport() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  const insets = useInsets();
  return (
    <View pointerEvents="box-none" testID="vitana-ui-toast-host" style={[styles.viewport, { top: insets.top + 8 }]}>
      {toasts.map((entry) => (
        <ToastItem key={entry.id} entry={entry} />
      ))}
    </View>
  );
}

/** Renders the toast viewport only when `overlayId` is the top of the overlay stack (`null` = the root). */
export function ToastSlot({ overlayId }: { overlayId: string | null }) {
  const top = useTopOverlayId();
  if (top !== overlayId) return null;
  return <ToastViewport />;
}

const styles = StyleSheet.create({
  viewport: { position: 'absolute', start: 16, end: 16, alignItems: 'center', gap: 8, zIndex: 100 },
  toast: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingStart: 16,
    paddingEnd: 8,
  },
  body: { flex: 1, gap: 2 },
  desc: { opacity: 0.9 },
  action: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
});
