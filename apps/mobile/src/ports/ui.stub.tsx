// STUB(N2): replace with the N2 UI kit (Text, PressableRow, IconButton, Icon, Avatar, CountBadge, TextInput, Spinner, DelayedLoader, BottomSheet, SideSheet, RadioGroup, notify/notifyError, provider) — awaits apps/mobile/src/ui (VTID-05176)
/**
 * VTID-05186 (N3, Interfaces I-N2) — BRANCH-ONLY React Native stand-ins with
 * the props the shell needs. `Icon` renders a sized View with
 * `testID="icon-<name>"`. Toasts take catalog KEYS, never strings. Deleted
 * when `src/ports/ui.tsx` points at N2's kit.
 */
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text as RNText,
  TextInput as RNTextInput,
  View,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { shellColors, type ColorScheme, type ShellColors } from './tokens';

type UIContextValue = { colors: ShellColors; direction: 'ltr' | 'rtl'; t: (key: string, params?: Record<string, string | number>) => string };

const UIContext = createContext<UIContextValue>({ colors: shellColors('light'), direction: 'ltr', t: (k) => k });

export function useUITheme(): UIContextValue {
  return useContext(UIContext);
}

// ── toasts (keys only) ──────────────────────────────────────────────────
type Toast = { id: number; kind: 'info' | 'error'; titleKey: string; descriptionKey?: string };
let toasts: Toast[] = [];
let nextId = 1;
const toastListeners = new Set<() => void>();
const emitToasts = () => toastListeners.forEach((l) => l());

export function notify(titleKey: string, descriptionKey?: string): void {
  toasts = [...toasts, { id: nextId++, kind: 'info', titleKey, descriptionKey }];
  emitToasts();
}

export function notifyError(titleKey: string, descriptionKey?: string): void {
  toasts = [...toasts, { id: nextId++, kind: 'error', titleKey, descriptionKey }];
  emitToasts();
}

/** Test helper: the toasts raised so far (keys). */
export function __toastsForTests(): readonly Toast[] {
  return toasts;
}

export function __clearToastsForTests(): void {
  toasts = [];
  emitToasts();
}

function ToastHost() {
  const list = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
  );
  const { colors, t } = useUITheme();
  const last = list[list.length - 1];
  useEffect(() => {
    if (!last) return undefined;
    const timer = setTimeout(() => {
      toasts = toasts.filter((x) => x.id !== last.id);
      emitToasts();
    }, 4000);
    return () => clearTimeout(timer);
  }, [last]);
  if (!last) return null;
  return (
    <View pointerEvents="none" style={[styles.toast, { backgroundColor: last.kind === 'error' ? colors.destructive : colors.foreground }]} accessibilityLiveRegion="polite">
      <RNText style={{ color: colors.background, fontWeight: '600' }}>{t(last.titleKey)}</RNText>
      {last.descriptionKey ? <RNText style={{ color: colors.background }}>{t(last.descriptionKey)}</RNText> : null}
    </View>
  );
}

// ── provider ────────────────────────────────────────────────────────────
export function UIProvider({
  colorScheme,
  direction,
  t,
  children,
}: {
  colorScheme: ColorScheme;
  direction: 'ltr' | 'rtl';
  t: UIContextValue['t'];
  children: ReactNode;
}) {
  return (
    <UIContext.Provider value={{ colors: shellColors(colorScheme), direction, t }}>
      {children}
      <ToastHost />
    </UIContext.Provider>
  );
}

// ── primitives ──────────────────────────────────────────────────────────
type Variant = 'title' | 'body' | 'label' | 'caption';
const VARIANT: Record<Variant, TextStyle> = {
  title: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 15 },
  label: { fontSize: 12, fontWeight: '600' },
  caption: { fontSize: 11 },
};

export function Text({ variant = 'body', muted, style, ...rest }: TextProps & { variant?: Variant; muted?: boolean }) {
  const { colors, direction } = useUITheme();
  return (
    <RNText
      {...rest}
      style={[VARIANT[variant], { color: muted ? colors.mutedForeground : colors.foreground, textAlign: 'auto', writingDirection: direction }, style]}
    />
  );
}

export function Icon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const { colors } = useUITheme();
  return (
    <View
      testID={`icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: 4, borderWidth: 1.5, borderColor: color ?? colors.foreground }}
    />
  );
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 20,
  color,
  testID,
}: {
  name: string;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  testID?: string;
}) {
  const { colors } = useUITheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID} hitSlop={8} style={styles.iconButton}>
      <Icon name={name} size={size} color={color ?? colors.foreground} />
    </Pressable>
  );
}

export function PressableRow({
  onPress,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  disabled,
  testID,
  style,
  onPressIn,
}: {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'radio' | 'tab';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  onPressIn?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed ? { opacity: 0.7 } : null, style]}
    >
      {children}
    </Pressable>
  );
}

export function Avatar({ uri, fallback, size = 40 }: { uri?: string | null; fallback: string; size?: number }) {
  const { colors } = useUITheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} /> : <RNText style={{ color: colors.foreground, fontWeight: '600' }}>{fallback}</RNText>}
    </View>
  );
}

/** NotificationBadge semantics: nothing at 0, "99+" above 99. */
export function CountBadge({ count, accessibilityLabel, testID }: { count: number; accessibilityLabel?: string; testID?: string }) {
  const { colors } = useUITheme();
  if (!count || count <= 0) return null;
  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={[styles.badge, { backgroundColor: colors.destructive }]}>
      <RNText style={{ color: colors.destructiveForeground, fontSize: 9, fontWeight: '600' }}>{count > 99 ? '99+' : String(count)}</RNText>
    </View>
  );
}

export function TextInput(props: TextInputProps) {
  const { colors, direction } = useUITheme();
  return (
    <RNTextInput
      placeholderTextColor={colors.mutedForeground}
      {...props}
      style={[styles.input, { color: colors.foreground, borderColor: colors.border, writingDirection: direction }, props.style]}
    />
  );
}

export function Spinner({ accessibilityLabel }: { accessibilityLabel?: string }) {
  return <ActivityIndicator accessibilityLabel={accessibilityLabel} />;
}

/** Shows the spinner only after `delayMs` (no flash on fast loads). */
export function DelayedLoader({ delayMs = 300, accessibilityLabel }: { delayMs?: number; accessibilityLabel?: string }) {
  const [show, setShow] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return undefined;
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  return (
    <View testID="delayed-loader" style={styles.center}>
      {show ? <ActivityIndicator accessibilityLabel={accessibilityLabel} /> : null}
    </View>
  );
}

export function BottomSheet({ open, onClose, title, children, testID }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <View testID={testID} accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.background }]}>
        {title ? (
          <Text variant="title" accessibilityRole="header" style={{ marginBottom: 8 }}>
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </Modal>
  );
}

/** A panel from the inline start edge (flips in RTL with the root direction). */
export function SideSheet({ open, onClose, children, testID, width = 288 }: { open: boolean; side?: 'start'; onClose: () => void; children: ReactNode; testID?: string; width?: number }) {
  const { colors, direction } = useUITheme();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', direction }]}>
        <View testID={testID} accessibilityViewIsModal style={{ width, backgroundColor: colors.background }}>
          {children}
        </View>
        <Pressable testID={testID ? `${testID}-scrim` : undefined} style={[styles.scrim, { flex: 1 }]} onPress={onClose} importantForAccessibility="no" />
      </View>
    </Modal>
  );
}

export type RadioOption = { value: string; label: string; subtitle?: string };

export function RadioGroup({
  accessibilityLabel,
  options,
  value,
  onChange,
  disabled,
  testID,
}: {
  accessibilityLabel: string;
  options: readonly RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const { colors } = useUITheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} testID={testID} style={{ gap: 4 }}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <PressableRow
            key={o.value}
            testID={`radio-${o.value}`}
            accessibilityRole="radio"
            accessibilityState={{ checked, disabled }}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.radio, checked ? { backgroundColor: colors.muted } : null]}
          >
            <View style={{ flex: 1 }}>
              <Text style={checked ? { fontWeight: '600' } : null}>{o.label}</Text>
              {o.subtitle ? (
                <Text variant="caption" muted>
                  {o.subtitle}
                </Text>
              ) : null}
            </View>
            {checked ? <Icon name="Check" size={16} color={colors.primary} /> : null}
          </PressableRow>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { position: 'absolute', top: -6, end: -8, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  input: { height: 40, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, start: 0, end: 0, borderTopStartRadius: 16, borderTopEndRadius: 16, padding: 16, paddingBottom: 32 },
  radio: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  toast: { position: 'absolute', bottom: 96, start: 16, end: 16, borderRadius: 12, padding: 12 },
});
