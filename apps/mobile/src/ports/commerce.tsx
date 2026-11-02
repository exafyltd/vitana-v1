/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — the
 * commerce screens' own port (product detail, universal cart, the three
 * success confirmations). Screens read these only through here:
 *
 *  - `@vitana/core/checkout-idempotency`: the web key rule (class A, manifest);
 *  - the N2 kit parts beyond src/ports/ui.tsx (Dialog, Input, Label, Select,
 *    Textarea, Progress, Separator, the toasts);
 *  - the colour tokens (`color(name, scheme)`) and the lucide glyphs the web
 *    commerce screens draw;
 *  - the shared Discover twins the product page reuses (plan decision 3: the
 *    discover lane owns them; this lane consumes, never re-owns): the
 *    `AddToCartButton` and the cart hook through `src/ports/add-to-cart.ts`,
 *    plus the bookmark / recommend / send-in-message / share controls, the
 *    product image, the affiliate disclosure and the marketplace client.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  Gift,
  Leaf,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trash2,
  Wallet,
  X,
  XCircle,
  AlertCircle,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme } from '@vitana/ui';

export { cartSignature, nextIdempotency, type CheckoutIdempotencyLine, type CheckoutIdempotencyState } from '@vitana/core/checkout-idempotency';

export {
  notify,
  notifySuccess,
  notifyError,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Label,
  Textarea,
  Progress,
  Separator,
} from '@vitana/ui';

// The shared Discover twins (owned by the discover lane, VTID-05510).
export {
  AddToCartButton,
  useUniversalCart,
  universalCartQueryKeys,
  getCart,
  getBudget,
  cartJson,
  UniversalCartApiError,
  UniversalCartRoleError,
  type AddToCartItem,
  type BudgetSummary,
  type GetCartResponse,
  type UniversalCart,
  type UniversalCartItem,
} from './add-to-cart';
export { formatPrice } from './discover';
export { BookmarkButton, RecommendButton } from '../screens/discover/BookmarkButton';
export { SendInMessageButton } from '../screens/discover/SendInMessageSheet';
export { ShareButton, productShareUrl } from '../screens/discover/ShareButton';
export { AffiliateDisclosure, ProductImage, openExternal, useFmtNumber } from '../screens/discover/parts';
export { getRedirectUrl, type MarketplaceProduct } from '../screens/discover/data/marketplace';
export { discoverJson, ACTIVE_ROLE_HEADER } from '../screens/discover/data/client';

/** A colour token (`#rrggbb` / `hsl()`) for a scheme. */
export const tokenColor = (name: string, scheme: 'light' | 'dark'): string => color(name, scheme);

/** A colour token for the member's colour scheme. */
export function useTokenColor(name: string): string {
  const { scheme } = useTheme();
  return color(name, scheme);
}

/** `#rrggbb` (or an `hsl()` token) at an alpha — the web's `/10`-style modifiers. */
export function alpha(value: string, a: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const hsl = /^hsl\(([^)]+)\)$/.exec(value.trim());
  if (hsl) return `hsla(${hsl[1]}, ${a})`;
  return value;
}

const ICONS: Record<string, ComponentType<LucideProps>> = {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  Gift,
  Leaf,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trash2,
  Wallet,
  X,
  XCircle,
};

/** The icon names this port can draw. */
export const CHECKOUT_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; hidden from accessibility (the control carries the label). */
export function CheckoutIcon({ name, size = 16, color: tint, fill, testID }: { name: string; size?: number; color?: string; fill?: string; testID?: string }) {
  const Glyph = ICONS[name];
  return (
    <View testID={testID ?? `icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      {Glyph ? <Glyph size={size} color={tint} fill={fill ?? 'none'} /> : null}
    </View>
  );
}
