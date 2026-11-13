/**
 * VTID-05653 (native-wave2-fix-forward-r2/utility-bar) — the port of the
 * shared utility bar, its Life Compass popup and its gift-voucher modal
 * (`src/shell/utility/`). The shell reaches the kit parts (Dialog, Input,
 * Textarea, the toasts), the colour helpers and the lucide icons only through
 * here (tests/ports.test.ts): this is the subset of `ports/discover.tsx` the
 * shared files draw, plus the one glyph the Home bar adds (UserPlus, the
 * invite button).
 */
import { UserPlus } from 'lucide-react-native';
import { View } from 'react-native';
import { DiscoverIcon } from './discover';

export {
  alpha,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DiscoverIcon,
  Input,
  notify,
  notifyError,
  notifySuccess,
  Textarea,
  toneForGradient,
  useTonePalette,
} from './discover';

/** A bar glyph by lucide name; hidden from accessibility (the control carries the label). */
export function UtilityIcon({ name, size = 16, color, testID }: { name: string; size?: number; color?: string; testID?: string }) {
  if (name !== 'UserPlus') return <DiscoverIcon name={name} size={size} color={color} testID={testID} />;
  return (
    <View testID={testID ?? 'icon-UserPlus'} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <UserPlus size={size} color={color} fill="none" />
    </View>
  );
}
