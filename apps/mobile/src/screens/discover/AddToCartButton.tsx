/**
 * VTID-05510 — the ONE native twin of the shared purchase control
 * `src/components/cart/AddToCartButton.tsx` (plan decision 3; consumed by the
 * product-cart-checkout lane through `src/ports/add-to-cart.ts`). Same gate,
 * same call, same toasts:
 *
 *  1. signed out → "sign in required" toast and back to `/` (web `navigate('/')`);
 *  2. role-blocked cart (403 cart_unavailable_for_role) → the role-blocked toast;
 *  3. only `product`-typed items with a UUID id enter the cart (CART_PRODUCT_UUID_RE,
 *     generated from the web file), anything else → the "failed" toast;
 *  4. `POST /universal-cart/items` { product_id, item_type:'partner_product',
 *     quantity:1, unit_price_cents_snapshot: round(price*100),
 *     source_surface:'community', metadata:{ source_label } } → success toast,
 *     a 2 s check mark; "In cart" (outline) while the product's active row exists.
 *
 * iOS IAP gate flag (requirements R5, recorded in docs/validation/VTID-05510):
 * this is an add-to-cart purchase surface. Today's behaviour is kept — the
 * shell's `iapRestricted` rule (`shell/logic/drawer.ts:37-38`,
 * `Platform.OS === 'ios'`) gates the wallet row and the gift voucher only, not
 * add-to-cart; the extension to every digital purchase surface is program
 * decision 5, deferred. Nothing here adds or removes iOS gating.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button, type ButtonSize, type ButtonVariant, Text, useUITheme } from '../../ports/ui';
import { CART_PRODUCT_UUID_RE, DiscoverIcon, notify, notifyError } from '../../ports/discover';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { UniversalCartRoleError, useUniversalCart } from './data/cart';

export type CartItemType = 'product' | 'supplement' | 'lab_test' | 'wellness_service' | 'deal';

export interface AddToCartItem {
  item_type: CartItemType;
  item_id: string;
  item_name: string;
  item_price: number;
  item_image_url?: string | null;
  item_metadata?: Record<string, unknown>;
}

export interface AddToCartButtonProps {
  item: AddToCartItem;
  variant?: Extract<ButtonVariant, 'default' | 'outline' | 'ghost'>;
  size?: Extract<ButtonSize, 'default' | 'sm' | 'lg' | 'icon'>;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
  testID?: string;
}

export function AddToCartButton({ item, variant = 'default', size = 'sm', style, showLabel = true, testID }: AddToCartButtonProps): ReactElement {
  const { user } = useAuth();
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { items, addItem, isAdding, roleBlocked } = useUniversalCart({ enabled: !!user });
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const isInCart = items.some((row) => row.product_id === item.item_id && row.status === 'active');

  const onPress = async () => {
    if (!user) {
      notifyError('toasts.cart.signRequired', 'toasts.cart.pleaseSignAddItemsYourCart');
      navigateToWebPath('/');
      return;
    }
    if (roleBlocked) {
      notifyError('universalCart.addButton.roleBlocked');
      return;
    }
    if (item.item_type !== 'product' || !CART_PRODUCT_UUID_RE.test(item.item_id)) {
      notifyError('universalCart.addButton.failed');
      return;
    }
    try {
      await addItem({
        product_id: item.item_id,
        item_type: 'partner_product',
        quantity: 1,
        unit_price_cents_snapshot: Math.round((item.item_price || 0) * 100),
        source_surface: 'community',
        metadata: { source_label: item.item_name },
      });
      setJustAdded(true);
      timer.current = setTimeout(() => setJustAdded(false), 2000);
      notify('universalCart.addButton.success');
    } catch (err) {
      if (err instanceof UniversalCartRoleError) {
        notifyError('universalCart.addButton.roleBlocked');
        return;
      }
      notifyError('universalCart.addButton.failed');
    }
  };

  const label = isInCart ? t('screens.cart.inCart') : t('screens.cart.addToCart');
  const tint = isInCart ? colors.primary : variant === 'default' ? colors.primaryForeground : colors.foreground;
  return (
    <Button
      testID={testID ?? `add-to-cart-${item.item_id}`}
      variant={isInCart ? 'outline' : variant}
      size={size}
      disabled={isAdding}
      accessibilityLabel={label}
      accessibilityState={{ selected: isInCart }}
      onPress={() => void onPress()}
      style={[isInCart ? { borderColor: colors.primary } : null, style]}
    >
      <DiscoverIcon name={justAdded ? 'Check' : 'ShoppingCart'} size={16} color={tint} testID={justAdded ? 'add-to-cart-added' : undefined} />
      {showLabel && size !== 'icon' ? (
        <Text size="sm" weight="500" color={tint} style={{ marginStart: 8 }} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Button>
  );
}
