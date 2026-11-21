/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the extra N2 primitives,
 * lucide glyphs and device affordances the business / commerce-mode screens
 * render, through one port so screen files never import `@vitana/ui` or a
 * device package directly (tests/ports.test.ts). Kept out of `src/ports/ui.tsx`
 * so parallel lanes do not edit the same port file.
 *
 *  - kit re-exports: the web's `ResponsiveDialog`, `Sheet`, `Input`,
 *    `Textarea`, `Label`, `Progress`, `Checkbox`, `Switch`, `Select`,
 *    `notifySuccess` (plain re-exports: the kit's contracts match);
 *  - `BizIcon`: the lucide glyphs the web commerce screens draw;
 *  - `FadeIn` / `BreathingHalo`: the web's framer-motion entrance fade
 *    (opacity 0 → 1, y 14 → 0, 0.5 s ease-out) and the agent card's 4 s
 *    breathing halo, both skipped under reduced motion exactly like
 *    `useReducedMotion()` on the web;
 *  - `shareText`: the phone's share sheet (web `navigator.share`, the mobile
 *    roster's way to hand over an invite link; also the native "Copy"
 *    affordance — the system sheet carries Copy — since the app ships no
 *    clipboard module);
 *  - `pickProductPhoto`: the photo library (web `<input type="file" accept="image/*">`);
 *  - `pickTextFile` / `shareTextFile`: the document picker for the CSV / OpenAPI
 *    upload and the share sheet for the CSV template (web file input and
 *    `<a download>`), through expo-file-system;
 *  - `openHostedPage`: an in-app system browser for a hosted page (Shopify /
 *    SMART-on-FHIR authorize) — resolves when the member closes it, so the
 *    caller can refetch (the return leg).
 */
import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { Animated, Easing, Platform, Share, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { File as FsFile, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUp,
  FlaskConical,
  HeartPulse,
  ImagePlus,
  Languages,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquareText,
  Mic,
  Package,
  PackagePlus,
  PartyPopper,
  Plug,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Sparkles,
  Store,
  TriangleAlert,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
  type LucideProps,
} from 'lucide-react-native';
import { useReducedMotion, useTheme } from '@vitana/ui';

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Input,
  Textarea,
  Label,
  Progress,
  Checkbox,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  notifySuccess,
  withAlpha,
} from '@vitana/ui';

const GLYPHS = {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUp,
  FlaskConical,
  HeartPulse,
  ImagePlus,
  Languages,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquareText,
  Mic,
  Package,
  PackagePlus,
  PartyPopper,
  Plug,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Sparkles,
  Store,
  TriangleAlert,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
} satisfies Record<string, ComponentType<LucideProps>>;

export type BizGlyph = keyof typeof GLYPHS;

/** A decorative lucide glyph (hidden from assistive tech, like the web's icons). `flip` mirrors it in RTL (`rtl:rotate-180`). */
export function BizIcon({ name, size = 18, color, flip }: { name: BizGlyph; size?: number; color?: string; flip?: boolean }) {
  const { colors, direction } = useTheme();
  const Glyph = GLYPHS[name];
  return (
    <View
      testID={`biz-icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, flip && direction === 'rtl' ? styles.mirror : null]}
    >
      <Glyph size={size} color={color ?? colors.foreground} />
    </View>
  );
}

/** framer-motion `initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.5,ease:'easeOut'}}`; none under reduced motion. */
export function FadeIn({ children, delayMs = 0, style, testID }: { children: ReactNode; delayMs?: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  const reduce = useReducedMotion();
  const progress = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return undefined;
    const anim = Animated.timing(progress, { toValue: 1, duration: 500, delay: delayMs, easing: Easing.out(Easing.ease), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [reduce, delayMs, progress]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return (
    <Animated.View testID={testID} style={[style, reduce ? null : { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/** The agent card's halo: opacity 0.35 → 0.6 → 0.35 over 4 s, forever; not rendered under reduced motion. */
export function BreathingHalo({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const value = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (reduce) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.35, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, value]);
  if (reduce) return null;
  return <Animated.View testID="agent-halo" pointerEvents="none" style={[styles.halo, { backgroundColor: color, opacity: value }]} />;
}

/** The share sheet with one text/url. `shared` when the member picked a target (Copy included), `dismissed` otherwise. */
export async function shareText(message: string, title?: string): Promise<'shared' | 'dismissed' | 'failed'> {
  try {
    const result = await Share.share({ message, ...(title ? { title } : {}) });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'failed';
  }
}

export type PickedPhoto = { uri: string; base64: string; mimeType: string; fileName: string; fileSize: number | null };

/** One photo from the library, with its bytes (base64). */
export async function pickProductPhoto(): Promise<{ status: 'picked'; photo: PickedPhoto } | { status: 'cancelled' } | { status: 'denied' }> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'denied' };
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.9, allowsMultipleSelection: false });
  const a = result.canceled ? undefined : result.assets?.[0];
  if (!a || typeof a.base64 !== 'string' || !a.base64) return { status: 'cancelled' };
  const mimeType = a.mimeType ?? 'image/jpeg';
  return { status: 'picked', photo: { uri: a.uri, base64: a.base64, mimeType, fileName: a.fileName ?? `photo.${mimeType.split('/')[1] ?? 'jpg'}`, fileSize: a.fileSize ?? null } };
}

export type PickedTextFile = { name: string; size: number | null; read: () => Promise<string> };

/**
 * The system document picker (web `<input type="file" accept=".csv,text/csv">` /
 * `.json`), through expo-file-system's `File.pickFileAsync` (an Expo SDK
 * module the `expo` package already ships). `read` is the web's `file.text()`.
 */
export async function pickTextFile(mimeTypes: string[]): Promise<{ status: 'picked'; file: PickedTextFile } | { status: 'cancelled' }> {
  const r = await FsFile.pickFileAsync({ mimeTypes });
  if (r.canceled || !r.result) return { status: 'cancelled' };
  const f = r.result;
  return { status: 'picked', file: { name: f.name, size: typeof f.size === 'number' ? f.size : null, read: () => f.text() } };
}

/** The web's "download the template": the file is written to the cache and handed to the share sheet (Save to Files / Drive). */
export async function shareTextFile(fileName: string, text: string): Promise<'shared' | 'dismissed' | 'failed'> {
  try {
    const file = new FsFile(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(text);
    const result = await Share.share(Platform.OS === 'ios' ? { url: file.uri } : { message: text, title: fileName });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'failed';
  }
}

/** Opens a hosted page in the in-app system browser; resolves once the member is back in the app. */
export async function openHostedPage(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url);
}

const styles = StyleSheet.create({
  mirror: { transform: [{ scaleX: -1 }] },
  halo: { position: 'absolute', top: -16, bottom: -16, start: -16, end: -16, borderRadius: 32 },
});
