/**
 * VTID-05428 (Native Wave 2, delete-account lane) — the N2 kit parts the
 * `/delete-account` screen needs beyond `src/ports/ui`: the web's
 * `AlertDialog` (final confirmation) and the four lucide glyphs
 * `DeleteAccount.tsx` draws (ArrowLeft, Trash2, AlertTriangle, CheckCircle2).
 * Screen files reach `@vitana/ui` only through a port (tests/ports.test.ts);
 * a lane-owned file keeps this lane off the shared `ui.tsx`.
 */
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { AlertTriangle, ArrowLeft, CheckCircle2, Trash2, type LucideProps } from 'lucide-react-native';
import type { ComponentType } from 'react';

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  withAlpha,
} from '@vitana/ui';

const GLYPHS: Record<'arrow-left' | 'trash' | 'alert-triangle' | 'check-circle', ComponentType<LucideProps>> = {
  'arrow-left': ArrowLeft,
  trash: Trash2,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle2,
};

export type DeleteAccountGlyph = keyof typeof GLYPHS;

/**
 * A decorative glyph (hidden from screen readers). `mirrored` flips it on the
 * horizontal axis, for the back arrow under a right-to-left language.
 */
export function DeleteAccountIcon({ name, size, color, mirrored, testID }: { name: DeleteAccountGlyph; size: number; color: string; mirrored?: boolean; testID?: string }): ReactElement {
  const Glyph = GLYPHS[name];
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, mirrored ? { transform: [{ scaleX: -1 }] } : null]}
    >
      <Glyph size={size} color={color} />
    </View>
  );
}
