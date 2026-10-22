/**
 * VTID-05186 (N3, plan change 20 / Interfaces I-N2) — the ONE door to the N2
 * UI kit (`@vitana/ui`, VTID-05176). Shell files use the I-N2 names below;
 * where N2's export has the same contract it is re-exported, where it differs
 * this file is the adapter (built only from N2 primitives and N2's lucide
 * icons), so a change in the kit's names never touches a shell file.
 */
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Compass,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  MoreVertical,
  Newspaper,
  Plane,
  Plug,
  Search,
  Settings,
  Settings2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Store,
  Target,
  TestTube,
  UserCheck,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import {
  Avatar as KitAvatar,
  AvatarFallback,
  AvatarImage,
  Input,
  RadioGroup as KitRadioGroup,
  RadioGroupItem,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Text as KitText,
  VitanaUIProvider,
  useTheme,
  type ColorScheme,
  type Direction,
  type SemanticColors,
  type TextProps as KitTextProps,
} from '@vitana/ui';
import { dismissToast, getToasts, type ToastEntry } from '@vitana/ui/toast/store';

export { notify, notifyError } from '@vitana/ui';

// VTID-05296 (N-W2 community-hub) — the N2 primitives the ported community /
// intents / search screens render, exposed through the one UI door so screen
// files never import `@vitana/ui` directly (tests/ports.test.ts). The kit's
// contracts match the screens' needs, so these are plain re-exports.
export { Button, Badge, Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton, Slider } from '@vitana/ui';
export type { ButtonProps, ButtonVariant, ButtonSize, BadgeProps, BadgeVariant, SliderProps } from '@vitana/ui';

// ── provider and theme ──────────────────────────────────────────────────
/** The kit's root provider with the member's colour scheme and the language's direction. */
export function UIProvider({ colorScheme, direction, children }: { colorScheme: ColorScheme; direction: Direction; children: ReactNode }) {
  return (
    <VitanaUIProvider colorScheme={colorScheme} direction={direction}>
      {children}
    </VitanaUIProvider>
  );
}

/** The shell's view of the kit theme: semantic colours and direction. */
export function useUITheme(): { colors: SemanticColors; direction: Direction } {
  const theme = useTheme();
  return { colors: theme.colors, direction: theme.direction };
}

// ── toasts (keys only; N2's store) ──────────────────────────────────────
/** Test helper: the notify*-toasts raised so far (catalog keys). */
export function __toastsForTests(): readonly ToastEntry[] {
  return getToasts().filter((t) => t.source === 'notify');
}

export function __clearToastsForTests(): void {
  dismissToast();
}

// ── text ────────────────────────────────────────────────────────────────
type Variant = 'title' | 'body' | 'label' | 'caption';
const VARIANT: Record<Variant, Pick<KitTextProps, 'size' | 'weight'>> = {
  title: { size: 'xl', weight: '700' },
  body: { size: 'base', weight: '400' },
  label: { size: 'xs', weight: '600' },
  caption: { size: 'xs', weight: '400' },
};

/** N2 `Text` with the shell's variant names on top of the kit's size/weight scale. */
export function Text({ variant = 'body', ...rest }: KitTextProps & { variant?: Variant }) {
  return <KitText {...VARIANT[variant]} {...rest} />;
}

// ── icons ───────────────────────────────────────────────────────────────
/**
 * Every lucide name the shell renders: the nav data's names
 * (`@vitana/core/nav` ICON_NAMES) plus the shell's own. A name not listed
 * renders an empty box of the same size, never another icon.
 */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Compass,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  MoreVertical,
  Newspaper,
  Plane,
  Plug,
  Search,
  Settings,
  Settings2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Store,
  Target,
  TestTube,
  UserCheck,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Zap,
};

/** The icon names this port can draw (tests check the nav data against it). */
export const ICON_KEYS: readonly string[] = Object.keys(ICONS);

export function Icon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const { colors } = useUITheme();
  const Glyph = ICONS[name];
  return (
    <View testID={`icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      {Glyph ? <Glyph size={size} color={color ?? colors.foreground} /> : null}
    </View>
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

// ── rows, badges, avatar, input, loaders ────────────────────────────────
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
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, style]}
    >
      {children}
    </Pressable>
  );
}

/** N2 `Avatar` + `AvatarImage` + `AvatarFallback` (web shadcn avatar), sized. */
export function Avatar({ uri, fallback, size = 40 }: { uri?: string | null; fallback: string; size?: number }) {
  return (
    <KitAvatar style={{ width: size, height: size }}>
      <AvatarImage src={uri ?? undefined} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </KitAvatar>
  );
}

/** NotificationBadge semantics: nothing at 0, "99+" above 99. */
export function CountBadge({ count, accessibilityLabel, testID }: { count: number; accessibilityLabel?: string; testID?: string }) {
  const { colors } = useUITheme();
  if (!count || count <= 0) return null;
  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={[styles.badge, { backgroundColor: colors.destructive }]}>
      <KitText color={colors.destructiveForeground} weight="600" style={styles.badgeText}>
        {count > 99 ? '99+' : String(count)}
      </KitText>
    </View>
  );
}

/** N2 `Input` (web shadcn input). */
export function TextInput(props: TextInputProps) {
  return <Input {...props} />;
}

export function Spinner({ accessibilityLabel }: { accessibilityLabel?: string }) {
  const { colors } = useUITheme();
  return <ActivityIndicator color={colors.mutedForeground} accessibilityLabel={accessibilityLabel} />;
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
      {show ? <Spinner accessibilityLabel={accessibilityLabel} /> : null}
    </View>
  );
}

// ── sheets ──────────────────────────────────────────────────────────────
const onOpenChangeFor = (onClose: () => void) => (next: boolean) => {
  if (!next) onClose();
};

/*
 * `testID` names the sheet's content (as the shell's tests and Maestro flows
 * read it); N2's own parts are `<testID>-sheet`, `-sheet-content`,
 * `-sheet-overlay` and `-sheet-close`.
 */

/** N2 `Sheet` from the bottom edge (the web's mobile `ResponsivePopover`/`Sheet`). */
export function BottomSheet({ open, onClose, title, children, testID }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; testID?: string }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChangeFor(onClose)}>
      <SheetContent side="bottom" testID={testID ? `${testID}-sheet` : undefined}>
        <View testID={testID} style={styles.sheetBody}>
          {title ? (
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
          ) : null}
          {children}
        </View>
      </SheetContent>
    </Sheet>
  );
}

/** N2 `Sheet` from the inline start edge (flips in RTL with the provider's direction). */
export function SideSheet({ open, onClose, children, testID, width }: { open: boolean; side?: 'start'; onClose: () => void; children: ReactNode; testID?: string; width?: number }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChangeFor(onClose)}>
      <SheetContent side="start" testID={testID ? `${testID}-sheet` : undefined} style={width ? { width } : undefined}>
        <View testID={testID} style={styles.fill}>
          {children}
        </View>
      </SheetContent>
    </Sheet>
  );
}

// ── radio list ──────────────────────────────────────────────────────────
export type RadioOption = { value: string; label: string; subtitle?: string };

/** A labelled option list on N2's `RadioGroup` / `RadioGroupItem`; each whole row selects. */
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
    <KitRadioGroup value={value ?? ''} onValueChange={onChange} disabled={disabled} accessibilityLabel={accessibilityLabel} testID={testID} style={styles.radioList}>
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
            <RadioGroupItem value={o.value} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <View style={styles.fill}>
              <Text weight={checked ? '600' : '400'}>{o.label}</Text>
              {o.subtitle ? (
                <Text variant="caption" muted>
                  {o.subtitle}
                </Text>
              ) : null}
            </View>
          </PressableRow>
        );
      })}
    </KitRadioGroup>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.7 },
  badge: { position: 'absolute', top: -6, end: -8, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  radioList: { gap: 4 },
  radio: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  fill: { flex: 1 },
  sheetBody: { gap: 16, flexShrink: 1 },
});
