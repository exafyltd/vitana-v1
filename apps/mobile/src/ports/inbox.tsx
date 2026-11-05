/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox list
 * screens' own UI port: the N2 kit parts they render beyond `src/ports/ui.tsx`
 * (Input, Label), the lucide glyphs the web inbox draws (`Messages.tsx`,
 * `MobileConversationCard.tsx`, `MobileInboxEmptyState.tsx`,
 * `NewConversationPopup.tsx`, `Archived.tsx`, `Inspiration.tsx`,
 * `InspirationMasterActionPopup.tsx`, `MessageSearchPanel.tsx`,
 * `components/contacts/*`), the clipboard write of the Inspiration "Copy"
 * button (web `navigator.clipboard.writeText`; React Native's own Clipboard
 * module — no extra dependency), and the contact invite's hand-off to the
 * member's own app (web `window.location.href = wa.me / sms: / mailto:` and
 * `navigator.share`; React Native's Linking and Share), and the device side
 * of "Find Friends" (web ContactSyncModal): the phone's address book
 * (expo-contacts, read only — the web's `window.vitanaNative.contacts.getAll()`
 * bridge), a picked .vcf file (expo-document-picker — the web file input),
 * the app's settings page, and the device region (web `phoneRegionHint`).
 * Screen files read these only through this port (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { Clipboard, Linking, Share, View } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { getLocales } from 'expo-localization';
import {
  AlertCircle,
  Archive,
  Bookmark,
  Check,
  CheckCheck,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Copy,
  Edit,
  Edit3,
  Eye,
  FileUp,
  Heart,
  Lightbulb,
  Link2,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldX,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  type LucideProps,
} from 'lucide-react-native';
import Svg, { Circle as SvgCircle, Path, Rect } from 'react-native-svg';
import { useButtonForeground, useTheme } from '@vitana/ui';

export {
  Input,
  Label,
  Progress,
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from '@vitana/ui';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  AlertCircle,
  Archive,
  Bookmark,
  Check,
  CheckCheck,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Copy,
  Edit,
  Edit3,
  Eye,
  FileUp,
  Heart,
  Lightbulb,
  Link2,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldX,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
};

/** The icon names this port can draw. */
export const INBOX_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle`. Decorative: hidden from a11y. */
export function InboxIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`inbox-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** A glyph inside a kit `Button`, in the button's label colour (web `<Icon className="w-4 h-4 me-2" />`). */
export function InboxButtonIcon({ name, size = 16 }: { name: string; size?: number }) {
  const foreground = useButtonForeground();
  return <InboxIcon name={name} size={size} color={foreground ?? undefined} />;
}

/** Writes `text` to the system clipboard (web `navigator.clipboard.writeText`). */
export function copyToClipboard(text: string): void {
  Clipboard.setString(text);
}

/** Opens a wa.me / sms: / mailto: link in the member's own app (web `window.location.href = url`). */
export async function openExternalUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}

/** The system share sheet with `message` (web `navigator.share({ text })`); false when the member dismissed it. */
export async function shareText(message: string): Promise<boolean> {
  const result = await Share.share({ message });
  return result.action !== Share.dismissedAction;
}

/** One contact as the phone hands it over (web `DeviceContact`). */
export interface PhoneContact {
  name: string;
  emails: string[];
  phones: string[];
}

/** Whether this device can hand over its address book (web `nativeContactsSupported`). */
export async function phoneContactsAvailable(): Promise<boolean> {
  try {
    return await Contacts.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Every contact on the phone behind one OS permission prompt, read only (name,
 * e-mail addresses, phone numbers — nothing else). A refused prompt throws
 * "contacts permission denied" (the web maps /permission/ to its error state).
 */
export async function readPhoneContacts(): Promise<PhoneContact[]> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') throw new Error('contacts permission denied');
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers] });
  return (data ?? []).map((c) => ({
    name: String(c.name ?? ''),
    emails: (c.emails ?? []).map((e) => String(e.email ?? '')).filter(Boolean),
    phones: (c.phoneNumbers ?? []).map((n) => String(n.number ?? '')).filter(Boolean),
  }));
}

/** A .vcf the member picks (web `<input type="file" accept=".vcf,text/vcard,text/x-vcard">`); null when they cancel. */
export async function pickContactsFile(): Promise<{ name: string; size: number | undefined; base64: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['text/vcard', 'text/x-vcard', 'text/directory', 'text/plain', 'application/octet-stream'], base64: true, copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return { name: asset.name, size: asset.size, base64: asset.base64 ?? '' };
}

/** The app's page in the system settings (web "Open Settings" → `app-settings:`). */
export function openAppSettings(): void {
  void Linking.openSettings();
}

/** The device's country ("AT"), so the gateway reads national numbers in the right country (web `phoneRegionHint`). */
export function deviceRegion(): string | undefined {
  try {
    const code = getLocales()[0]?.regionCode ?? undefined;
    return code && /^[A-Za-z]{2}$/.test(code) ? code.toUpperCase() : undefined;
  } catch {
    return undefined;
  }
}

/** The account brand marks of the web `ContactSourcePicker` (Google, Outlook, iCloud), 20 px. */
export function ContactSourceGlyph({ source, size = 20 }: { source: 'google' | 'outlook' | 'icloud'; size?: number }) {
  const { colors } = useTheme();
  if (source === 'google') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" testID="contact-source-glyph-google">
        <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </Svg>
    );
  }
  if (source === 'outlook') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" testID="contact-source-glyph-outlook">
        <Rect x="2" y="4" width="12" height="16" rx="2" fill="#0078D4" />
        <SvgCircle cx="8" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
        <Path fill="#28A8EA" d="M15 7h6.5a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5H15z" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID="contact-source-glyph-icloud">
      <Path fill={colors.foreground} d="M13.004 4c2.904 0 5.432 1.664 6.684 4.076a5.5 5.5 0 0 1 .812 10.899L20.5 19h-13l-.003-.001a6.5 6.5 0 0 1-1.205-12.872A7.003 7.003 0 0 1 13.004 4z" />
    </Svg>
  );
}
