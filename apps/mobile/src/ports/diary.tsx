/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — the Daily Diary screen's
 * own UI port: the N2 kit parts it renders beyond `src/ports/ui.tsx`
 * (Textarea, Select, the responsive confirm dialog, Dialog for the photo
 * viewer, notifySuccess) and the lucide glyphs the web diary components draw
 * (`MobileDailyDiary.tsx`, `UnifiedCaptureCard.tsx`, `DiaryEntryList.tsx`,
 * `PhotoDiaryUploader.tsx`, `MyTicketsList.tsx`). Screen files read these only
 * through this port, never from `@vitana/*` directly (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Bug,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Mic,
  Paperclip,
  Save,
  Send,
  Square,
  Tag,
  Trash2,
  Type,
  Upload,
  X,
  type LucideProps,
} from 'lucide-react-native';
import { useButtonForeground, useTheme } from '@vitana/ui';

export {
  notifySuccess,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogTitle,
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogTitle,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
} from '@vitana/ui';
export type { TextareaProps } from '@vitana/ui';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  Bug,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Image: ImageIcon,
  Lightbulb,
  Loader2,
  Mic,
  Paperclip,
  Save,
  Send,
  Square,
  Tag,
  Trash2,
  Type,
  Upload,
  X,
};

/** The icon names this port can draw. */
export const DIARY_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle`. Decorative: hidden from a11y. */
export function DiaryIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`diary-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** A glyph inside a kit `Button`, in the button's label colour (web `<Icon className="h-4 w-4 me-2" />`). */
export function ButtonIcon({ name, size = 16 }: { name: string; size?: number }) {
  const foreground = useButtonForeground();
  return <DiaryIcon name={name} size={size} color={foreground ?? undefined} />;
}
