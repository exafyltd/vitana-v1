/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — the shared Discover
 * twins through one port (plan decision 3, one owner each). The discover lane
 * owns `AddToCartButton` (web src/components/cart/AddToCartButton.tsx), the
 * native universal-cart hook behind it and `MobileDiscoverView`; the
 * product-cart-checkout lane consumes them from here instead of reaching into
 * src/screens/discover, the same rule src/ports/news-card.ts follows.
 */
export { AddToCartButton, type AddToCartButtonProps, type AddToCartItem, type CartItemType } from '../screens/discover/AddToCartButton';
export {
  useUniversalCart,
  universalCartQueryKeys,
  getCart,
  getBudget,
  addCartItem,
  UniversalCartApiError,
  UniversalCartRoleError,
  type AddItemInput,
  type AddItemResponse,
  type BudgetSummary,
  type GetCartResponse,
  type UniversalCart,
  type UniversalCartItem,
} from '../screens/discover/data/cart';
export { cartJson } from '../screens/discover/data/client';
export { MobileDiscoverView, type AIRecommendation } from '../screens/discover/MobileDiscoverView';
export { ProductDetailsDrawer, ProductDetailsBody, ProductSelectionProvider, useProductSelection } from '../screens/discover/ProductDetailsDrawer';
